"""Server-owned practice simulator routes for the /trade testing release."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/v1/simulator", tags=["simulator"])
admin_router = APIRouter(prefix="/api/v1/admin/simulator", tags=["simulator-admin"])
STARTING_EQUITY = Decimal("1000000.00")


class SessionCreate(BaseModel):
    mode: str = Field(pattern="^(replay|delayed|drill)$")
    instrument_id: str = "NSE:RELIANCE"
    drill_id: str | None = None


class Control(BaseModel):
    action: str = Field(pattern="^(play|pause|step|speed|fork|finish)$")
    value: int | None = None


class OrderCreate(BaseModel):
    side: str = Field(pattern="^(buy|sell)$")
    order_type: str = Field(pattern="^(market|limit|stop_market|stop_limit)$")
    quantity: Decimal = Field(gt=0)
    limit_price: Decimal | None = Field(default=None, gt=0)
    stop_price: Decimal | None = Field(default=None, gt=0)
    reduce_only: bool = False


class OrderAmend(BaseModel):
    limit_price: Decimal | None = Field(default=None, gt=0)
    stop_price: Decimal | None = Field(default=None, gt=0)


class PositionClose(BaseModel):
    quantity: Decimal = Field(gt=0)


class JournalUpdate(BaseModel):
    plan: str = Field(default="", max_length=4000)
    reflection: str = Field(default="", max_length=4000)


class DrillPublish(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    title_hi: str = Field(min_length=3, max_length=120)
    instrument_id: str
    objective: str = Field(min_length=3, max_length=1000)
    required: bool = False


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_access(user: User) -> User:
    if user.subscription_plan not in {"trader", "pro", "elite"}:
        raise HTTPException(403, detail={"code": "ENTITLEMENT_REQUIRED", "message": "Trading practice requires the Trader plan or higher."})
    return user


def _require_admin(user: User) -> User:
    if user.role != "admin":
        raise HTTPException(403, detail={"code": "ADMIN_REQUIRED", "message": "Simulator administration requires an admin role."})
    return user


def _instruments() -> list[dict]:
    groups = [
        ("NSE", "stock", "INR", ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC", "LT", "BHARTIARTL", "MARUTI", "SUNPHARMA", "AXISBANK"]),
        ("NASDAQ", "stock", "USD", ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "COST", "AVGO", "INTC"]),
        ("CRYPTO", "spot_crypto", "USD", ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "ADA-USD", "LINK-USD"]),
        ("FX", "forex", "USD", ["EUR-USD", "GBP-USD", "USD-JPY", "USD-INR", "AUD-USD", "USD-CAD"]),
        ("CME", "future", "USD", ["ESM26", "NQM26", "GCM26", "CLM26"]),
    ]
    items = []
    for venue, asset_class, currency, symbols in groups:
        for symbol in symbols:
            items.append({"id": f"{venue}:{symbol}", "symbol": symbol, "venue": venue, "asset_class": asset_class, "quote_currency": currency, "tick_size": "0.01", "quantity_increment": "1", "contract_multiplier": "1" if asset_class != "future" else "10", "source": "synthetic-test"})
    return items


def _price(instrument_id: str, bar: int) -> Decimal:
    seed = sum(ord(char) for char in instrument_id) % 700 + 50
    return Decimal(seed) + Decimal(bar) * Decimal("0.35")


def _account(db: Database, learner_id: str) -> dict:
    account = db.simulator_accounts.find_one({"learner_id": learner_id, "mode": "delayed", "status": "active"})
    if account:
        return account
    account = {"id": f"acct_{uuid4().hex}", "learner_id": learner_id, "mode": "delayed", "status": "active", "reporting_currency": "INR", "cash": _money(STARTING_EQUITY), "equity": _money(STARTING_EQUITY), "revision": 1, "created_at": _now()}
    db.simulator_accounts.insert_one(account)
    return account


def _session(db: Database, session_id: str, learner_id: str) -> dict:
    session = db.simulator_sessions.find_one({"id": session_id, "learner_id": learner_id})
    if not session:
        raise HTTPException(404, detail="Simulation session not found.")
    return session


def _snapshot(db: Database, session: dict) -> dict:
    orders = list(db.simulator_orders.find({"session_id": session["id"]}, {"_id": 0}).sort("created_at", -1))
    fills = list(db.simulator_fills.find({"session_id": session["id"]}, {"_id": 0}).sort("created_at", -1))
    return {"id": session["id"], "mode": session["mode"], "instrument_id": session["instrument_id"], "clock": session["clock"], "state": session["state"], "speed": session["speed"], "assisted": session.get("assisted", False), "revision": session["revision"], "account": session["account"], "orders": orders, "fills": fills}


def _records(db: Database, collection: str, session_id: str) -> list[dict]:
    return list(db[collection].find({"session_id": session_id}, {"_id": 0}).sort("created_at", -1))


def _payload_fingerprint(payload: BaseModel) -> str:
    encoded = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


@router.get("/bootstrap")
def bootstrap(user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    user = _require_access(user)
    account = _account(db, user.id)
    return {"reporting_currency": "INR", "equity": account["equity"], "account_id": account["id"], "modes": ["replay", "delayed"], "ai_review": {"available": False, "reason": "A review provider has not been configured."}, "data_labels": ["synthetic-test", "historical-replay", "delayed-feed"]}


@router.get("/instruments")
def instruments(user: User = Depends(get_current_user)):
    _require_access(user)
    return _instruments()


@router.get("/datasets")
def datasets(user: User = Depends(get_current_user)):
    _require_access(user)
    return [{"id": "synthetic-global-v1", "label": "Synthetic global testing dataset", "precision": "1m", "source": "synthetic-test", "replay_range": {"start": "2025-01-02T09:15:00Z", "end": "2025-01-31T15:30:00Z"}}]


@router.post("/sessions")
def create_session(payload: SessionCreate, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    user = _require_access(user)
    if payload.instrument_id not in {item["id"] for item in _instruments()}:
        raise HTTPException(422, detail="Unsupported test instrument.")
    if payload.mode == "delayed":
        account = _account(db, user.id)
    else:
        account = {"id": f"acct_{uuid4().hex}", "reporting_currency": "INR", "cash": _money(STARTING_EQUITY), "equity": _money(STARTING_EQUITY), "revision": 1}
    session = {"id": f"sim_{uuid4().hex}", "learner_id": user.id, "mode": payload.mode, "instrument_id": payload.instrument_id, "dataset_id": "synthetic-global-v1", "clock": 100, "state": "paused", "speed": 1, "revision": 1, "account": account, "assisted": False, "drill_id": payload.drill_id, "created_at": _now()}
    db.simulator_sessions.insert_one(session)
    return _snapshot(db, session)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    return _snapshot(db, _session(db, session_id, user.id))


@router.get("/sessions/{session_id}/orders")
def orders(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    return _records(db, "simulator_orders", session_id)


@router.get("/sessions/{session_id}/fills")
def fills(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    return _records(db, "simulator_fills", session_id)


@router.get("/sessions/{session_id}/positions")
def positions(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    return _records(db, "simulator_positions", session_id)


@router.get("/sessions/{session_id}/ledger")
def ledger(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    return _records(db, "simulator_ledger", session_id)


@router.get("/sessions/{session_id}/candles")
def candles(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    session = _session(db, session_id, user.id)
    visible = min(session["clock"], 400)
    result = []
    for index in range(max(0, visible - 100), visible):
        close = _price(session["instrument_id"], index)
        result.append({"time": 1735809300 + index * 60, "open": _money(close - Decimal("0.20")), "high": _money(close + Decimal("0.45")), "low": _money(close - Decimal("0.55")), "close": _money(close), "volume": str(1000 + index * 7)})
    return result


@router.post("/sessions/{session_id}/controls")
def control(session_id: str, payload: Control, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    session = _session(db, session_id, user.id)
    if payload.action == "fork":
        clone = {key: value for key, value in session.items() if key != "_id"}
        clone.update({"id": f"sim_{uuid4().hex}", "state": "paused", "assisted": True, "revision": 1, "created_at": _now()})
        db.simulator_sessions.insert_one(clone)
        return _snapshot(db, clone)
    if payload.action == "step": session["clock"] += 1
    if payload.action == "play": session["state"] = "playing"
    if payload.action == "pause": session["state"] = "paused"
    if payload.action == "speed": session["speed"] = payload.value if payload.value in {1, 5, 20} else 1
    if payload.action == "finish": session["state"] = "finished"
    session["revision"] += 1
    db.simulator_sessions.replace_one({"id": session_id}, session)
    return _snapshot(db, session)


@router.post("/sessions/{session_id}/orders")
def create_order(session_id: str, payload: OrderCreate, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    session = _session(db, session_id, user.id)
    fingerprint = _payload_fingerprint(payload)
    existing = db.simulator_idempotency.find_one({"session_id": session_id, "key": idempotency_key})
    if existing:
        if existing["fingerprint"] != fingerprint:
            raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT", "message": "This idempotency key was already used for a different order."})
        return existing["response"]
    price = payload.limit_price or _price(session["instrument_id"], session["clock"] + 1)
    notional = price * payload.quantity
    cash = Decimal(session["account"]["cash"])
    if payload.side == "buy" and notional > cash:
        raise HTTPException(409, detail={"code": "INSUFFICIENT_BUYING_POWER", "message": "Order exceeds available virtual cash."})
    order = {"id": f"ord_{uuid4().hex}", "session_id": session_id, "side": payload.side, "order_type": payload.order_type, "quantity": str(payload.quantity), "price": _money(price), "status": "filled" if payload.order_type == "market" else "open", "created_at": _now(), "reduce_only": payload.reduce_only}
    if order["status"] == "filled":
        fee = notional * Decimal("0.0005")
        delta = -notional - fee if payload.side == "buy" else notional - fee
        session["account"]["cash"] = _money(cash + delta)
        session["account"]["equity"] = session["account"]["cash"]
        session["revision"] += 1
        fill = {"id": f"fill_{uuid4().hex}", "session_id": session_id, "order_id": order["id"], "price": _money(price), "quantity": str(payload.quantity), "fee": _money(fee), "created_at": _now()}
        existing_position = db.simulator_positions.find_one({"session_id": session_id, "instrument_id": session["instrument_id"]})
        prior_quantity = Decimal(existing_position["quantity"]) if existing_position else Decimal("0")
        signed_quantity = payload.quantity if payload.side == "buy" else -payload.quantity
        new_quantity = prior_quantity + signed_quantity
        position = {"session_id": session_id, "instrument_id": session["instrument_id"], "quantity": str(new_quantity), "average_price": _money(price), "updated_at": _now()}
        if new_quantity == 0:
            db.simulator_positions.delete_one({"session_id": session_id, "instrument_id": session["instrument_id"]})
        else:
            db.simulator_positions.replace_one({"session_id": session_id, "instrument_id": session["instrument_id"]}, position, upsert=True)
        db.simulator_fills.insert_one(fill)
        db.simulator_ledger.insert_one({"session_id": session_id, "order_id": order["id"], "amount": _money(delta), "currency": "INR", "created_at": _now()})
        db.simulator_sessions.replace_one({"id": session_id}, session)
    db.simulator_orders.insert_one(order)
    response = {key: value for key, value in order.items() if key != "_id"}
    db.simulator_idempotency.insert_one({"session_id": session_id, "key": idempotency_key, "fingerprint": fingerprint, "response": response})
    return response


@router.patch("/sessions/{session_id}/orders/{order_id}")
def amend_order(session_id: str, order_id: str, payload: OrderAmend, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    order = db.simulator_orders.find_one({"id": order_id, "session_id": session_id})
    if not order:
        raise HTTPException(404, detail="Order not found.")
    if order["status"] != "open":
        raise HTTPException(409, detail={"code": "ORDER_NOT_AMENDABLE", "message": "Only open orders may be amended."})
    if payload.limit_price is None and payload.stop_price is None:
        raise HTTPException(422, detail="Provide a limit or stop price.")
    fingerprint = _payload_fingerprint(payload)
    scope = f"amend:{order_id}"
    previous = db.simulator_command_idempotency.find_one({"session_id": session_id, "scope": scope, "key": idempotency_key})
    if previous:
        if previous["fingerprint"] != fingerprint:
            raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT", "message": "This idempotency key was already used for a different command."})
        return previous["response"]
    if payload.limit_price is not None:
        order["price"] = _money(payload.limit_price)
        order["limit_price"] = _money(payload.limit_price)
    if payload.stop_price is not None:
        order["stop_price"] = _money(payload.stop_price)
    order["amended_at"] = _now()
    db.simulator_orders.replace_one({"id": order_id, "session_id": session_id}, order)
    response = {key: value for key, value in order.items() if key != "_id"}
    db.simulator_command_idempotency.insert_one({"session_id": session_id, "scope": scope, "key": idempotency_key, "fingerprint": fingerprint, "response": response})
    return response


@router.post("/sessions/{session_id}/orders/{order_id}/cancel")
def cancel_order(session_id: str, order_id: str, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    scope = f"cancel:{order_id}"
    previous = db.simulator_command_idempotency.find_one({"session_id": session_id, "scope": scope, "key": idempotency_key})
    if previous:
        return previous["response"]
    order = db.simulator_orders.find_one({"id": order_id, "session_id": session_id})
    if not order:
        raise HTTPException(404, detail="Order not found.")
    if order["status"] != "open":
        raise HTTPException(409, detail={"code": "ORDER_NOT_CANCELLABLE", "message": "Only open orders may be cancelled."})
    order.update({"status": "cancelled", "cancelled_at": _now()})
    db.simulator_orders.replace_one({"id": order_id, "session_id": session_id}, order)
    response = {key: value for key, value in order.items() if key != "_id"}
    db.simulator_command_idempotency.insert_one({"session_id": session_id, "scope": scope, "key": idempotency_key, "fingerprint": "cancel", "response": response})
    return response


@router.post("/sessions/{session_id}/positions/{instrument_id}/close")
def close_position(session_id: str, instrument_id: str, payload: PositionClose, idempotency_key: str = Header(..., alias="Idempotency-Key"), user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    session = _session(db, session_id, user.id)
    position = db.simulator_positions.find_one({"session_id": session_id, "instrument_id": instrument_id})
    if not position:
        raise HTTPException(404, detail="Position not found.")
    scope = f"close:{instrument_id}"
    fingerprint = _payload_fingerprint(payload)
    previous = db.simulator_command_idempotency.find_one({"session_id": session_id, "scope": scope, "key": idempotency_key})
    if previous:
        if previous["fingerprint"] != fingerprint:
            raise HTTPException(409, detail={"code": "IDEMPOTENCY_CONFLICT", "message": "This idempotency key was already used for a different command."})
        return previous["response"]
    current_quantity = Decimal(position["quantity"])
    quantity = min(abs(current_quantity), payload.quantity)
    side = "sell" if current_quantity > 0 else "buy"
    price = _price(instrument_id, session["clock"] + 1)
    notional = price * quantity
    fee = notional * Decimal("0.0005")
    cash = Decimal(session["account"]["cash"])
    delta = notional - fee if side == "sell" else -notional - fee
    session["account"]["cash"] = _money(cash + delta)
    session["account"]["equity"] = session["account"]["cash"]
    session["revision"] += 1
    db.simulator_sessions.replace_one({"id": session_id}, session)
    remaining = current_quantity - quantity if current_quantity > 0 else current_quantity + quantity
    if remaining == 0:
        db.simulator_positions.delete_one({"session_id": session_id, "instrument_id": instrument_id})
    else:
        db.simulator_positions.update_one({"session_id": session_id, "instrument_id": instrument_id}, {"$set": {"quantity": str(remaining), "updated_at": _now()}})
    order = {"id": f"ord_{uuid4().hex}", "session_id": session_id, "side": side, "order_type": "market", "quantity": str(quantity), "price": _money(price), "status": "filled", "reduce_only": True, "created_at": _now()}
    fill = {"id": f"fill_{uuid4().hex}", "session_id": session_id, "order_id": order["id"], "price": _money(price), "quantity": str(quantity), "fee": _money(fee), "created_at": _now()}
    db.simulator_orders.insert_one(order)
    db.simulator_fills.insert_one(fill)
    db.simulator_ledger.insert_one({"session_id": session_id, "order_id": order["id"], "amount": _money(delta), "currency": "INR", "created_at": _now()})
    response = {key: value for key, value in order.items() if key != "_id"}
    db.simulator_command_idempotency.insert_one({"session_id": session_id, "scope": scope, "key": idempotency_key, "fingerprint": fingerprint, "response": response})
    return response


@router.put("/sessions/{session_id}/journal")
def journal(session_id: str, payload: JournalUpdate, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); _session(db, session_id, user.id)
    db.simulator_journals.update_one({"session_id": session_id}, {"$set": {**payload.model_dump(), "updated_at": _now()}}, upsert=True)
    return {"saved": True}


@router.get("/sessions/{session_id}/review")
def review(session_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user); session = _session(db, session_id, user.id)
    fills = db.simulator_fills.count_documents({"session_id": session_id})
    journal = db.simulator_journals.find_one({"session_id": session_id}) or {}
    score = min(100, 40 + (25 if journal.get("plan") else 0) + (20 if journal.get("reflection") else 0) + min(15, fills * 3))
    return {"session_id": session_id, "score": score, "passed": score >= 80 and not session.get("assisted", False), "assisted": session.get("assisted", False), "dimensions": {"risk_sizing": 40, "plan_adherence": 35 if journal.get("plan") else 0, "execution_discipline": 25 if journal.get("reflection") else 0}, "ai_review": {"available": False, "reason": "A review provider has not been configured."}}


@router.get("/drills")
def drills(user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    starter = {"id": "risk-sizing-v1", "version": 1, "state": "published", "title": "Position sizing", "title_hi": "पोज़िशन साइज़िंग", "required": False, "instrument_id": "NSE:RELIANCE", "objective": "Keep planned risk within 1% of capital."}
    return [starter, *list(db.simulator_drills.find({"state": "published"}, {"_id": 0}).sort("published_at", -1))]


@admin_router.post("/drills")
def publish_drill(payload: DrillPublish, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_admin(user)
    if payload.instrument_id not in {item["id"] for item in _instruments()}:
        raise HTTPException(422, detail="Unsupported test instrument.")
    version = db.simulator_drills.count_documents({"title": payload.title}) + 1
    drill = {"id": f"drill_{uuid4().hex}", "version": version, "state": "published", **payload.model_dump(), "published_at": _now(), "published_by": user.id}
    db.simulator_drills.insert_one(drill)
    return {key: value for key, value in drill.items() if key != "_id"}


@router.post("/accounts/{account_id}/reset")
def reset(account_id: str, user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    _require_access(user)
    account = db.simulator_accounts.find_one({"id": account_id, "learner_id": user.id, "status": "active"})
    if not account: raise HTTPException(404, detail="Practice account not found.")
    db.simulator_accounts.update_one({"id": account_id}, {"$set": {"status": "archived", "archived_at": _now()}})
    new = _account(db, user.id)
    return {"archived_account_id": account_id, "account_id": new["id"], "equity": new["equity"]}
