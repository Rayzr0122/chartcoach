"""Server-authoritative practice simulator API."""
from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from functools import lru_cache
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, model_validator

from app.api.deps import get_current_user
from app.core.security import AUTH_COOKIE_NAME, decode_access_token
from app.database import db as application_db
from app.models.user import User
from app.services.simulator_data import DatasetError, get_dataset, load_dataset
from app.simulator.database import get_simulator_db
from app.simulator.engine import D, money, process_bar
from app.simulator.market_data import MarketDataError, ProviderRegistry
from app.simulator.repository import IdempotencyConflict, MongoSimulatorRepository


router = APIRouter(prefix="/api/v1/simulator", tags=["simulator"])
admin_router = APIRouter(prefix="/api/v1/admin/simulator", tags=["simulator-admin"])
PAID_PLANS = {"trader", "pro", "elite"}
STARTING_EQUITY = "1000000.00"
EXECUTION_PROFILES = {
    "cash_equity_dev_v1": {"fee_bps": Decimal("5"), "slippage_bps": Decimal("2"), "spread_bps": Decimal("5")},
    "crypto_spot_dev_v1": {"fee_bps": Decimal("10"), "slippage_bps": Decimal("5"), "spread_bps": Decimal("0")},
}


class SessionCreate(BaseModel):
    mode: str = Field(pattern="^(replay|delayed|stream)$")
    instrument_id: str = "NSE:RELIANCE"
    source: str | None = Field(default=None, pattern="^(synthetic-test|polygon)$")
    history_days: int = Field(default=30)
    drill_id: str | None = None


class Control(BaseModel):
    action: str = Field(pattern="^(play|pause|step|speed|heartbeat|seek|fork|finish)$")
    value: int | None = None
    controller_id: str | None = None


class OrderCreate(BaseModel):
    side: str = Field(pattern="^(buy|sell)$")
    order_type: str = Field(pattern="^(market|limit|stop_market|stop_limit)$")
    quantity: Decimal = Field(gt=0)
    limit_price: Decimal | None = Field(default=None, gt=0)
    stop_price: Decimal | None = Field(default=None, gt=0)
    stop_loss: Decimal | None = Field(default=None, gt=0)
    take_profit: Decimal | None = Field(default=None, gt=0)
    time_in_force: str = Field(default="GTC", pattern="^(DAY|GTC)$")
    reduce_only: bool = False

    @model_validator(mode="after")
    def require_trigger_prices(self):
        if self.order_type in {"limit", "stop_limit"} and self.limit_price is None:
            raise ValueError("limit_price is required for limit orders")
        if self.order_type in {"stop_market", "stop_limit"} and self.stop_price is None:
            raise ValueError("stop_price is required for stop orders")
        return self


class OrderAmend(BaseModel):
    limit_price: Decimal | None = Field(default=None, gt=0)
    stop_price: Decimal | None = Field(default=None, gt=0)


class PositionClose(BaseModel):
    quantity: Decimal | None = Field(default=None, gt=0)


class AccountReset(BaseModel):
    reason: str = Field(default="learner_requested", max_length=120)


class JournalUpdate(BaseModel):
    plan: str = Field(default="", max_length=4000)
    reflection: str = Field(default="", max_length=4000)


class ChartLayoutUpdate(BaseModel):
    revision: int = Field(ge=0)
    drawings: list[dict[str, object]] = Field(default_factory=list, max_length=100)


class DrillPublish(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    title_hi: str = Field(default="", max_length=120)
    instrument_id: str
    objective: str = Field(min_length=3, max_length=1000)
    required: bool = False


def get_simulator_repository(database=Depends(get_simulator_db)):
    return MongoSimulatorRepository(database)


@lru_cache(maxsize=32)
def _dataset(dataset_id: str) -> dict:
    return get_dataset(dataset_id)


@lru_cache(maxsize=1)
def _provider_registry() -> ProviderRegistry:
    return ProviderRegistry.default()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fingerprint(scope: str, payload: object) -> str:
    encoded = json.dumps([scope, payload], sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def _require_paid(user: User) -> None:
    if user.subscription_plan not in PAID_PLANS:
        raise HTTPException(403, detail={"code": "ENTITLEMENT_REQUIRED", "message": "Trading practice requires the Trader plan or higher."})


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(403, detail={"code": "ADMIN_REQUIRED", "message": "Simulator administration requires an admin role."})


def _owned(repo, session_id: str, user: User) -> dict:
    state = repo.snapshot(session_id)
    if not state or state["session"].get("learner_id") != user.id:
        raise HTTPException(404, detail="Simulation session not found.")
    return state


def _snapshot(state: dict) -> dict:
    session = state["session"]
    if "account_id" not in session:
        return {**{key: value for key, value in session.items() if key != "_id"}, "legacy_read_only": True, "data_status": "legacy"}
    return {
        "id": session["id"], "mode": session["mode"], "instrument_id": session["instrument_id"],
        "dataset_id": session["dataset_id"], "fx_dataset_id": session.get("fx_dataset_id"),
        "data_source": session["data_source"], "clock": session["clock"],
        "market_time": session.get("market_time"), "state": session["state"], "speed": session["speed"],
        "initial_clock": session.get("initial_clock", min(300, session.get("total_bars", 0))),
        "parent_session_id": session.get("parent_session_id"),
        "forked_at_clock": session.get("forked_at_clock"),
        "assisted": session.get("assisted", False), "revision": session["revision"],
        "legacy_read_only": False, "data_status": session.get("data_status", "ready"),
        "coverage": session.get("coverage", {}), "total_bars": session.get("total_bars", 0),
        "account": state["account"], "positions": state["positions"], "orders": state["orders"],
        "fills": state["fills"], "ledger": state["ledger"],
    }


def _mutation(repo, state: dict, key: str, scope: str, payload: object, operation):
    if state["session"].get("legacy_read_only") or "account_id" not in state["session"]:
        raise HTTPException(409, detail={"code": "LEGACY_READ_ONLY", "message": "This legacy session is available as read-only history."})
    try:
        return repo.mutate(state["session"]["id"], f"{scope}:{key}", _fingerprint(scope, payload), operation)
    except IdempotencyConflict:
        raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT", "message": "This idempotency key was used for a different command."}) from None


def _instruments() -> list[dict]:
    groups = [
        ("NSE", "stock", "INR", ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC", "LT", "BHARTIARTL", "MARUTI", "SUNPHARMA", "AXISBANK"]),
        ("NASDAQ", "stock", "USD", ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "COST", "AVGO", "INTC"]),
        ("CRYPTO", "spot_crypto", "USD", ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "ADA-USD", "LINK-USD"]),
        ("FX", "forex", "USD", ["EUR-USD", "GBP-USD", "USD-JPY", "USD-INR", "AUD-USD", "USD-CAD"]),
        ("CME", "future", "USD", ["ESM26", "NQM26", "GCM26", "CLM26"]),
    ]
    result = []
    for venue, asset_class, currency, symbols in groups:
        for symbol in symbols:
            polygon = venue == "NASDAQ"
            market = {
                "NSE": "india_equities", "NASDAQ": "us_equities", "CRYPTO": "crypto", "FX": "fx",
            }.get(venue, "futures")
            tick_size, quantity_increment = ("0.01", "0.00000001") if asset_class == "spot_crypto" else ("0.0001", "1000") if asset_class == "forex" else ("0.01", "1")
            result.append({
                "id": f"{venue}:{symbol}", "symbol": symbol, "name": symbol, "venue": venue,
                "asset_class": asset_class, "quote_currency": currency, "source": "synthetic-test",
                "replay_source": "alpaca_iex" if polygon else "alpha_vantage" if market == "fx" else "synthetic-test",
                "delayed_source": "alpaca_iex" if polygon else "synthetic-test",
                "polygon_supported": polygon, "tick_size": tick_size, "quantity_increment": quantity_increment,
                "contract_multiplier": "10" if asset_class == "future" else "1",
                "market": market, "supported_modes": ["replay"],
                "data_status": "synthetic_test" if market != "india_equities" else "approved_import_required",
                "overnight_eligible": market == "india_equities",
            })
    return result


def _profile_version(instrument: dict) -> str:
    return "crypto_spot_dev_v1" if instrument["asset_class"] == "spot_crypto" else "cash_equity_dev_v1"


def _validate_order_precision(instrument_id: str, quantity: Decimal, *prices: Decimal | None) -> None:
    instrument = next(item for item in _instruments() if item["id"] == instrument_id)
    if quantity % D(instrument["quantity_increment"]):
        raise HTTPException(422, detail={"code": "INVALID_INCREMENT", "message": "Quantity must match the instrument increment."})
    if any(price is not None and price % D(instrument["tick_size"]) for price in prices):
        raise HTTPException(422, detail={"code": "INVALID_INCREMENT", "message": "Price must match the instrument tick size."})


def _aggregate(bars: list[dict], bucket_minutes: int) -> list[dict]:
    if bucket_minutes == 1:
        return bars
    seconds = bucket_minutes * 60
    buckets: dict[int, list[dict]] = {}
    for bar in bars:
        buckets.setdefault((bar["time"] // seconds) * seconds, []).append(bar)
    result = []
    for timestamp in sorted(buckets):
        group = buckets[timestamp]
        result.append({
            "time": timestamp, "open": group[0]["open"], "high": money(max(D(item["high"]) for item in group)),
            "low": money(min(D(item["low"]) for item in group)), "close": group[-1]["close"],
            "volume": format(sum((D(item["volume"]) for item in group), Decimal(0)), "f"),
        })
    return result


def _layout_key(user: User, instrument_id: str, timeframe: str) -> dict:
    if not any(item["id"] == instrument_id for item in _instruments()):
        raise HTTPException(422, detail={"code": "UNSUPPORTED_INSTRUMENT"})
    if timeframe not in {"1m", "5m", "15m", "1h", "1d"}:
        raise HTTPException(422, detail={"code": "INVALID_TIMEFRAME"})
    return {"learner_id": user.id, "instrument_id": instrument_id, "timeframe": timeframe}


def _fx_bar(dataset_id: str | None, timestamp: int) -> dict | None:
    if not dataset_id:
        return None
    choices = [bar for bar in _dataset(dataset_id)["bars"] if bar["time"] <= timestamp]
    if not choices or timestamp - choices[-1]["time"] > 86400:
        raise HTTPException(503, detail={"code": "FX_DATA_UNAVAILABLE", "message": "A same-clock USD/INR conversion rate is unavailable."})
    return choices[-1]


def _session_source(payload: SessionCreate, instrument: dict) -> str:
    """Resolve legacy source input through a server-owned rights gate."""
    mode = "stream" if payload.mode in {"stream", "delayed"} else "replay"
    if payload.source is None:
        try:
            return _provider_registry().select(instrument["market"], mode, "development").provider
        except MarketDataError:
            raise HTTPException(503, detail={"code": "MARKET_DATA_UNAVAILABLE", "message": "No approved market-data route is active for this market."}) from None
    if payload.source == "synthetic-test":
        if payload.mode == "stream":
            raise HTTPException(503, detail={"code": "MARKET_DATA_UNAVAILABLE", "message": "No approved streaming provider is active for this market."})
        return "synthetic-test"
    try:
        _provider_registry().activate(instrument["market"], "stream" if payload.mode in {"stream", "delayed"} else "replay", payload.source, "development")
    except MarketDataError as error:
        code = "MARKET_DATA_RIGHTS_REQUIRED" if "rights" in str(error) else "MARKET_DATA_UNAVAILABLE"
        raise HTTPException(503, detail={"code": code, "message": "The requested market-data route is not enabled."}) from None
    return payload.source


def advance_state(current: dict, count: int = 1) -> tuple:
    session = {**current["session"]}
    dataset = _dataset(session["dataset_id"])
    end = min(session["clock"] + count, len(dataset["bars"]))
    account = current["account"]
    positions, orders = current["positions"], current["orders"]
    fills, ledger = list(current["fills"]), list(current["ledger"])
    for index in range(session["clock"], end):
        bar = dataset["bars"][index]
        fx = _fx_bar(session.get("fx_dataset_id"), bar["time"])
        profile = EXECUTION_PROFILES[session.get("profile_version", "cash_equity_dev_v1")]
        result = process_bar(
            account, positions, orders, bar, index + 1, fee_bps=profile["fee_bps"],
            instrument_id=session["instrument_id"], fx_rate=D(fx["close"]) if fx else Decimal("1"),
            fx_cost_bps=Decimal("5") if fx else Decimal("0"),
            spread_bps=profile["spread_bps"], slippage_bps=profile["slippage_bps"],
        )
        account, positions, orders = result.account, result.positions, result.orders
        fills.extend(result.fills)
        ledger.extend(result.ledger)
        session["market_time"] = bar["time"]
    session["clock"] = end
    if end >= len(dataset["bars"]):
        session["state"] = "finished" if session["mode"] == "replay" else "paused"
    return session, account, positions, orders, fills, ledger


@router.get("/instruments")
def instruments():
    return _instruments()


@router.get("/capabilities")
def capabilities():
    return _provider_registry().capabilities("development")


@router.get("/bootstrap")
def bootstrap(user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    account = repo.find_active_account(user.id, "delayed")
    return {"reporting_currency": "INR", "equity": account["equity"] if account else STARTING_EQUITY, "account_id": account["id"] if account else None, "modes": ["replay", "delayed"]}


@router.post("/sessions")
async def create_session(payload: SessionCreate, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    instrument = next((item for item in _instruments() if item["id"] == payload.instrument_id), None)
    if not instrument:
        raise HTTPException(422, detail={"code": "UNSUPPORTED_INSTRUMENT", "message": "The selected instrument is not available."})
    if payload.history_days not in {7, 30, 90, 365}:
        raise HTTPException(422, detail={"code": "INVALID_HISTORY_DAYS", "message": "History must be 7, 30, 90 or 365 days."})
    source = _session_source(payload, instrument)
    try:
        dataset = await load_dataset(payload.instrument_id, source, payload.history_days)
        fx_dataset = await load_dataset("FX:USD-INR", "polygon", payload.history_days) if source == "polygon" and payload.instrument_id.startswith("NASDAQ:") else None
    except DatasetError as error:
        raise HTTPException(503, detail={"code": error.code, "message": error.message}) from None
    account_mode = "delayed" if payload.mode in {"delayed", "stream"} else "replay"
    account = repo.find_active_account(user.id, account_mode) if account_mode == "delayed" else None
    if not account:
        account = {
            "id": f"acct_{uuid4().hex}", "learner_id": user.id, "mode": account_mode, "status": "active",
            "reporting_currency": "INR", "cash": STARTING_EQUITY, "equity": STARTING_EQUITY,
            "buying_power": STARTING_EQUITY, "reserved": "0.00", "realized_pnl": "0.00",
            "unrealized_pnl": "0.00", "revision": 1, "created_at": _now(),
        }
    initial_clock = min(300, max(0, len(dataset["bars"]) - (1 if payload.mode in {"delayed", "stream"} else 0)))
    session = {
        "id": f"sim_{uuid4().hex}", "learner_id": user.id, "account_id": account["id"],
        "mode": "stream" if payload.mode == "stream" else payload.mode, "instrument_id": payload.instrument_id, "dataset_id": dataset["id"],
        "fx_dataset_id": fx_dataset["id"] if fx_dataset else None, "data_source": dataset["source"],
        "history_days": payload.history_days, "clock": initial_clock, "initial_clock": initial_clock,
        "market_time": dataset["bars"][initial_clock - 1]["time"] if initial_clock else None,
        "state": "paused", "speed": 5, "revision": 1, "coverage": dataset["coverage"],
        "total_bars": len(dataset["bars"]), "data_status": "ready", "created_at": _now(),
        "drill_id": payload.drill_id, "assisted": False, "engine_version": "quote_trade_v1" if payload.mode == "stream" else "candle_replay_v1",
        "profile_version": _profile_version(instrument), "migration_status": "native",
    }
    try:
        state = repo.create_session_bundle(user.id, idempotency_key, _fingerprint("session", payload.model_dump(mode="json")), account, session)
    except IdempotencyConflict:
        raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT", "message": "This idempotency key was used for another session request."}) from None
    return _snapshot(state)


@router.get("/sessions")
def list_sessions(user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return [_snapshot(repo.snapshot(item["id"])) for item in repo.list_sessions(user.id)]


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _snapshot(_owned(repo, session_id, user))


@router.get("/sessions/{session_id}/candles")
def candles(session_id: str, before: int | None = None, limit: int = Query(500, ge=1, le=2000), timeframe: str = Query("1m", pattern="^(1m|5m|15m|1h|1d)$"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    session = _owned(repo, session_id, user)["session"]
    visible = _dataset(session["dataset_id"])["bars"][:session["clock"]]
    if before is not None:
        visible = [bar for bar in visible if bar["time"] < before]
    minutes = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "1d": 1440}[timeframe]
    return _aggregate(visible, minutes)[-limit:]


def _records(session_id: str, kind: str, user: User, repo):
    return _owned(repo, session_id, user)[kind]


def _fork_replay(repo, state: dict, target: int, key: str, fingerprint: str) -> dict:
    source = state["session"]
    dataset = _dataset(source["dataset_id"])
    initial_clock = source.get("initial_clock", min(300, len(dataset["bars"])))
    if source["mode"] != "replay":
        raise HTTPException(409, detail={"code": "SEEK_REPLAY_ONLY", "message": "Seeking is available only in historical replay."})
    if target < initial_clock or target > len(dataset["bars"]):
        raise HTTPException(422, detail={"code": "INVALID_SEEK_TARGET", "message": "Seek target is outside the replay range."})
    fork_id, account_id, stamp = f"sim_{uuid4().hex}", f"acct_{uuid4().hex}", _now()
    target_time = dataset["bars"][target - 1]["time"] if target else None
    original_orders = {item["id"]: item for item in state["orders"]}
    selected_fills = sorted((item for item in state["fills"] if item.get("time", 0) <= (target_time or 0)), key=lambda item: item.get("time", 0))
    cash, realized = D(STARTING_EQUITY), Decimal("0")
    positions: dict[str, dict] = {}
    cloned_orders, cloned_fills, cloned_ledger = [], [], []
    for fill in selected_fills:
        original = original_orders.get(fill["order_id"])
        if not original:
            continue
        order_id = f"{fork_id}:order:{original['id']}"
        instrument = fill.get("instrument_id", source["instrument_id"])
        quantity, price, fx_rate = D(fill["quantity"]), D(fill["price"]), D(fill.get("fx_rate", 1))
        held = positions.get(instrument)
        held_quantity = D(held["quantity"]) if held else Decimal("0")
        if original["side"] == "buy":
            average = D(held["average_price"]) if held else Decimal("0")
            next_quantity = held_quantity + quantity
            positions[instrument] = {"id": f"{fork_id}:position:{instrument}", "instrument_id": instrument, "quantity": format(next_quantity, "f"), "average_price": money((held_quantity * average + quantity * price) / next_quantity)}
        else:
            average = D(held["average_price"])
            realized += (price - average) * quantity * fx_rate - D(fill.get("fee", 0)) - D(fill.get("conversion_cost", 0))
            remaining = held_quantity - quantity
            if remaining > 0:
                positions[instrument] = {**held, "quantity": format(remaining, "f")}
            else:
                positions.pop(instrument, None)
        ledger = next((item for item in state["ledger"] if item.get("order_id") == fill["order_id"] and item.get("time") == fill.get("time")), None)
        if ledger:
            cash += D(ledger["amount"])
            cloned_ledger.append({**ledger, "id": f"{fork_id}:ledger:{len(cloned_ledger)}", "order_id": order_id})
        cloned_orders.append({**original, "id": order_id, "session_id": fork_id, "parent_order_id": None, "oco_group": None, "status": "filled"})
        cloned_fills.append({**fill, "id": f"{fork_id}:fill:{len(cloned_fills)}", "order_id": order_id})
    account = {
        "id": account_id, "learner_id": source["learner_id"], "mode": "replay", "status": "active",
        "reporting_currency": "INR", "cash": money(cash), "equity": money(cash), "buying_power": money(cash),
        "reserved": "0.00", "realized_pnl": money(realized), "unrealized_pnl": "0.00", "revision": 1, "created_at": stamp,
    }
    bar = dataset["bars"][target - 1]
    fx = _fx_bar(source.get("fx_dataset_id"), bar["time"])
    marked = process_bar(account, list(positions.values()), [], bar, target, instrument_id=source["instrument_id"], fx_rate=D(fx["close"]) if fx else Decimal("1"))
    session = {
        **source, "id": fork_id, "account_id": account_id, "clock": target, "market_time": bar["time"],
        "state": "paused", "assisted": True, "parent_session_id": source["id"], "forked_at_clock": target,
        "revision": 1, "created_at": stamp, "controller_id": None, "controller_heartbeat_at": None,
    }
    records = {"orders": cloned_orders, "fills": cloned_fills, "ledger": cloned_ledger, "positions": marked.positions}
    return repo.create_fork_bundle(source["id"], key, fingerprint, marked.account, session, records)


@router.get("/sessions/{session_id}/orders")
def orders(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _records(session_id, "orders", user, repo)


@router.get("/sessions/{session_id}/fills")
def fills(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _records(session_id, "fills", user, repo)


@router.get("/sessions/{session_id}/positions")
def positions(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _records(session_id, "positions", user, repo)


@router.get("/sessions/{session_id}/ledger")
def ledger(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _records(session_id, "ledger", user, repo)


@router.post("/sessions/{session_id}/controls")
def control(session_id: str, payload: Control, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    state = _owned(repo, session_id, user)
    stamp = _now()
    control_payload = payload.model_dump(mode="json")
    if payload.action == "seek":
        if payload.value is None:
            raise HTTPException(422, detail={"code": "SEEK_TARGET_REQUIRED"})
        target = payload.value
        if target < state["session"]["clock"]:
            try:
                return _snapshot(_fork_replay(repo, state, target, idempotency_key, _fingerprint("seek", control_payload)))
            except IdempotencyConflict:
                raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT"}) from None

    def operation(current):
        session = {**current["session"]}
        changes = {}
        if payload.action == "step":
            session, account, positions, orders, fills, ledger = advance_state(current)
            changes.update(account=account, positions=positions, orders=orders, fills=fills, ledger=ledger)
        elif payload.action in {"play", "pause"}:
            session["state"] = "playing" if payload.action == "play" else "paused"
        elif payload.action == "speed":
            if payload.value not in {5, 10, 20, 30}:
                raise HTTPException(422, detail={"code": "INVALID_REPLAY_SPEED"})
            session["speed"] = payload.value
        elif payload.action == "seek":
            dataset = _dataset(session["dataset_id"])
            if session["mode"] != "replay" or payload.value is None or payload.value > len(dataset["bars"]):
                raise HTTPException(422, detail={"code": "INVALID_SEEK_TARGET"})
            session, account, positions, orders, fills, ledger = advance_state(current, payload.value - session["clock"])
            session["state"] = "paused"
            changes.update(account=account, positions=positions, orders=orders, fills=fills, ledger=ledger)
        elif payload.action == "finish":
            session["state"] = "finished"
        elif payload.action == "heartbeat":
            if not payload.controller_id:
                raise HTTPException(422, detail={"code": "CONTROLLER_ID_REQUIRED"})
            session.update(controller_id=payload.controller_id, controller_heartbeat_at=stamp, controller_lease_seconds=15)
        elif payload.action == "fork":
            raise HTTPException(501, detail={"code": "FORK_NOT_READY", "message": "Replay fork reconstruction is not enabled in this testing increment."})
        event = {"id": f"evt_{uuid4().hex}", "type": "session.updated", "created_at": stamp}
        changes.update(session=session, events=[event])
        return _snapshot({**current, **changes}), changes

    return _mutation(repo, state, idempotency_key, "control", control_payload, operation)


@router.post("/sessions/{session_id}/orders")
def create_order(session_id: str, payload: OrderCreate, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    state = _owned(repo, session_id, user)
    order_id, stamp = f"ord_{uuid4().hex}", _now()

    def operation(current):
        if payload.side == "sell" and not payload.reduce_only:
            raise HTTPException(422, detail={"code": "LONG_ONLY", "message": "This educational cash preset is long-only."})
        session = current["session"]
        _validate_order_precision(session["instrument_id"], payload.quantity, payload.limit_price, payload.stop_price, payload.stop_loss, payload.take_profit)
        dataset = _dataset(session["dataset_id"])
        if not session["clock"]:
            raise HTTPException(409, detail={"code": "NO_VISIBLE_PRICE"})
        reference = payload.limit_price or payload.stop_price or D(dataset["bars"][session["clock"] - 1]["close"])
        fx = _fx_bar(session.get("fx_dataset_id"), dataset["bars"][session["clock"] - 1]["time"])
        reserve = reference * payload.quantity * (D(fx["close"]) if fx else Decimal("1")) * Decimal("1.001") if payload.side == "buy" else Decimal("0")
        account = {**current["account"]}
        if D(account["cash"]) - D(account["reserved"]) < reserve:
            raise HTTPException(409, detail={"code": "INSUFFICIENT_BUYING_POWER", "message": "Order exceeds available virtual buying power."})
        account["reserved"] = money(D(account["reserved"]) + reserve)
        account["buying_power"] = money(D(account["cash"]) - D(account["reserved"]))
        order = {
            "id": order_id, "session_id": session_id, "instrument_id": session["instrument_id"],
            "side": payload.side, "order_type": payload.order_type, "quantity": format(payload.quantity, "f"),
            "limit_price": money(payload.limit_price) if payload.limit_price else None,
            "stop_price": money(payload.stop_price) if payload.stop_price else None,
            "stop_loss": money(payload.stop_loss) if payload.stop_loss else None,
            "take_profit": money(payload.take_profit) if payload.take_profit else None,
            "status": "open", "submitted_clock": session["clock"], "reduce_only": payload.reduce_only,
            "time_in_force": payload.time_in_force, "reserved": money(reserve), "created_at": stamp,
        }
        orders = [*current["orders"], order]
        return order, {"account": account, "orders": orders, "events": [{"id": f"evt_{order_id}", "type": "order.created", "created_at": stamp}]}

    return _mutation(repo, state, idempotency_key, "order", payload.model_dump(mode="json"), operation)


@router.patch("/sessions/{session_id}/orders/{order_id}")
def amend_order(session_id: str, order_id: str, payload: OrderAmend, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    state = _owned(repo, session_id, user)

    def operation(current):
        orders = [{**item} for item in current["orders"]]
        order = next((item for item in orders if item["id"] == order_id), None)
        if not order:
            raise HTTPException(404, detail="Order not found.")
        if order["status"] != "open":
            raise HTTPException(409, detail={"code": "ORDER_NOT_AMENDABLE"})
        _validate_order_precision(current["session"]["instrument_id"], D(order["quantity"]), payload.limit_price, payload.stop_price)
        if payload.limit_price is not None:
            order["limit_price"] = money(payload.limit_price)
        if payload.stop_price is not None:
            order["stop_price"] = money(payload.stop_price)
        changes = {"orders": orders}
        if order["side"] == "buy":
            session = current["session"]
            dataset = _dataset(session["dataset_id"])
            reference = D(order.get("limit_price") or order.get("stop_price") or dataset["bars"][session["clock"] - 1]["close"])
            fx = _fx_bar(session.get("fx_dataset_id"), dataset["bars"][session["clock"] - 1]["time"])
            next_reserve = reference * D(order["quantity"]) * (D(fx["close"]) if fx else Decimal("1")) * Decimal("1.001")
            account = {**current["account"]}
            available = D(account["cash"]) - D(account["reserved"]) + D(order.get("reserved", 0))
            if available < next_reserve:
                raise HTTPException(409, detail={"code": "INSUFFICIENT_BUYING_POWER", "message": "Amendment exceeds available virtual buying power."})
            account["reserved"] = money(D(account["reserved"]) - D(order.get("reserved", 0)) + next_reserve)
            account["buying_power"] = money(D(account["cash"]) - D(account["reserved"]))
            order["reserved"] = money(next_reserve)
            changes["account"] = account
        changes["events"] = [{"id": f"evt_{uuid4().hex}", "type": "order.amended", "created_at": _now()}]
        return order, changes

    return _mutation(repo, state, idempotency_key, f"amend:{order_id}", payload.model_dump(mode="json"), operation)


@router.post("/sessions/{session_id}/orders/{order_id}/cancel")
def cancel_order(session_id: str, order_id: str, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    state = _owned(repo, session_id, user)

    def operation(current):
        orders = [{**item} for item in current["orders"]]
        order = next((item for item in orders if item["id"] == order_id), None)
        if not order:
            raise HTTPException(404, detail="Order not found.")
        if order["status"] != "open":
            raise HTTPException(409, detail={"code": "ORDER_NOT_CANCELLABLE"})
        order["status"] = "cancelled"
        account = {**current["account"]}
        account["reserved"] = money(max(Decimal("0"), D(account["reserved"]) - D(order.get("reserved", 0))))
        account["buying_power"] = money(D(account["cash"]) - D(account["reserved"]))
        return order, {"account": account, "orders": orders, "events": [{"id": f"evt_{uuid4().hex}", "type": "order.cancelled", "created_at": _now()}]}

    return _mutation(repo, state, idempotency_key, f"cancel:{order_id}", {}, operation)


@router.post("/sessions/{session_id}/positions/{instrument_id}/close")
def close_position(session_id: str, instrument_id: str, payload: PositionClose, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    state = _owned(repo, session_id, user)
    position = next((item for item in state["positions"] if item["instrument_id"] == instrument_id), None)
    if not position:
        raise HTTPException(404, detail="Position not found.")
    quantity = min(payload.quantity or D(position["quantity"]), D(position["quantity"]))
    return create_order(session_id, OrderCreate(side="sell", order_type="market", quantity=quantity, reduce_only=True), idempotency_key, user, repo)


@router.get("/sessions/{session_id}/journal")
def get_journal(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    return _owned(repo, session_id, user)["session"].get("journal", {"plan": "", "reflection": ""})


@router.get("/chart-layouts/{instrument_id}")
def get_chart_layout(instrument_id: str, timeframe: str = Query("1m"), user: User = Depends(get_current_user), database=Depends(get_simulator_db)):
    key = _layout_key(user, instrument_id, timeframe)
    layout = database.simulator_chart_layouts.find_one(key, {"_id": 0})
    return layout or {**key, "revision": 0, "drawings": []}


@router.put("/chart-layouts/{instrument_id}")
def save_chart_layout(instrument_id: str, payload: ChartLayoutUpdate, timeframe: str = Query("1m"), user: User = Depends(get_current_user), database=Depends(get_simulator_db)):
    key = _layout_key(user, instrument_id, timeframe)
    if len(json.dumps(payload.drawings, separators=(",", ":"))) > 50_000:
        raise HTTPException(422, detail={"code": "DRAWINGS_TOO_LARGE"})
    layouts = database.simulator_chart_layouts
    layouts.create_index([("learner_id", 1), ("instrument_id", 1), ("timeframe", 1)], unique=True)
    next_layout = {**key, "revision": payload.revision + 1, "drawings": payload.drawings, "updated_at": _now()}
    if payload.revision == 0 and not layouts.find_one(key):
        try:
            layouts.insert_one(next_layout)
            next_layout.pop("_id", None)
            return next_layout
        except Exception:
            pass
    saved = layouts.find_one_and_replace({**key, "revision": payload.revision}, next_layout, return_document=True)
    if not saved:
        raise HTTPException(409, detail={"code": "LAYOUT_REVISION_CONFLICT", "message": "The chart layout changed elsewhere. Reload and retry."})
    saved.pop("_id", None)
    return saved


@router.put("/sessions/{session_id}/journal")
def save_journal(session_id: str, payload: JournalUpdate, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    state = _owned(repo, session_id, user)

    def operation(current):
        session = {**current["session"], "journal": {**payload.model_dump(), "updated_at": _now()}}
        return session["journal"], {"session": session}

    return _mutation(repo, state, idempotency_key, "journal", payload.model_dump(), operation)


@router.get("/sessions/{session_id}/review")
def review(session_id: str, user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    state = _owned(repo, session_id, user)
    journal = state["session"].get("journal", {})
    has_stop = any(order.get("stop_loss") or order.get("order_type") == "stop_market" for order in state["orders"])
    dimensions = {"risk_sizing": 40 if has_stop else 10, "plan_adherence": 35 if journal.get("plan") else 0, "execution_discipline": 25 if journal.get("reflection") else 10}
    score = sum(dimensions.values())
    hard_violation = any(order.get("rejection_reason") for order in state["orders"])
    return {"session_id": session_id, "score": score, "passed": score >= 80 and not hard_violation and not state["session"].get("assisted", False), "assisted": state["session"].get("assisted", False), "dimensions": dimensions, "ai_review": {"available": False, "reason": "A review provider has not been configured."}}


@router.get("/drills")
def drills(user: User = Depends(get_current_user), database=Depends(get_simulator_db)):
    _require_paid(user)
    starter = {"id": "risk-sizing-v1", "version": 1, "state": "published", "title": "Position sizing", "title_hi": "पोज़िशन साइज़िंग", "required": False, "instrument_id": "NSE:RELIANCE", "objective": "Keep planned risk within 1% of capital."}
    return [starter, *list(database.simulator_drills.find({"state": "published"}, {"_id": 0}).sort("published_at", -1))]


@router.post("/accounts/{account_id}/reset")
def reset_account(account_id: str, payload: AccountReset, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), repo=Depends(get_simulator_repository)):
    _require_paid(user)
    account = repo.find_active_account(user.id, "delayed")
    if not account or account["id"] != account_id:
        raise HTTPException(404, detail="Active delayed account not found.")
    try:
        return repo.reset_account(account_id, user.id, idempotency_key, _fingerprint("account-reset", payload.model_dump()), payload.reason, STARTING_EQUITY)
    except IdempotencyConflict:
        raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT"}) from None


@admin_router.post("/drills")
def publish_drill(payload: DrillPublish, user: User = Depends(get_current_user), database=Depends(get_simulator_db)):
    _require_admin(user)
    drill = {"id": f"drill_{uuid4().hex}", "version": database.simulator_drills.count_documents({"title": payload.title}) + 1, "state": "published", **payload.model_dump(), "published_at": _now(), "published_by": user.id}
    database.simulator_drills.insert_one(drill)
    drill.pop("_id", None)
    return drill


@router.websocket("/ws")
async def simulator_ws(websocket: WebSocket):
    token = websocket.cookies.get(AUTH_COOKIE_NAME)
    email = decode_access_token(token) if token else None
    session_id = websocket.query_params.get("session_id")
    try:
        cursor = max(0, int(websocket.query_params.get("cursor", "0")))
    except ValueError:
        await websocket.close(code=1008, reason="Invalid event cursor")
        return
    user = User.from_doc(application_db.users.find_one({"email": email})) if email else None
    repo = MongoSimulatorRepository(get_simulator_db())
    if not user or not session_id:
        await websocket.close(code=1008, reason="Authentication and session_id are required")
        return
    state = repo.snapshot(session_id)
    if not state or state["session"].get("learner_id") != user.id:
        await websocket.close(code=1008, reason="Simulator access denied")
        return
    await websocket.accept()
    try:
        oldest, latest = repo.event_bounds(session_id)
        if cursor == 0 or (oldest is not None and cursor < oldest - 1):
            cursor = latest
            await websocket.send_json({"type": "snapshot", "sequence": cursor, "revision": state["session"].get("revision", 0), "cursor": cursor, "payload": _snapshot(state)})
        while True:
            events = repo.events_after(session_id, cursor)
            for event in events:
                cursor = event["sequence"]
                state = repo.snapshot(session_id)
                await websocket.send_json({"type": "delta", "sequence": cursor, "revision": state["session"].get("revision", 0), "cursor": cursor, "event": event, "payload": _snapshot(state)})
            await asyncio.sleep(0.25)
    except WebSocketDisconnect:
        return
