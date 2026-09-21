from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from app.simulator.market_data import MarketEvent


ZERO = Decimal("0")


def D(value: Any) -> Decimal:
    return Decimal(str(value))


def money(value: Decimal) -> str:
    return format(value.quantize(Decimal(".01"), rounding=ROUND_HALF_UP), "f")


@dataclass
class BarResult:
    account: dict
    positions: list[dict]
    orders: list[dict]
    fills: list[dict]
    ledger: list[dict]


def _eligible_price(order: dict, bar: dict) -> Decimal | None:
    side, kind = order["side"], order["order_type"]
    o, h, l = D(bar["open"]), D(bar["high"]), D(bar["low"])
    if kind == "market":
        return o
    if kind == "limit":
        limit = D(order["limit_price"])
        if side == "buy" and l <= limit:
            return min(o, limit)
        if side == "sell" and h >= limit:
            return max(o, limit)
    if kind == "stop_market":
        stop = D(order["stop_price"])
        if side == "buy" and h >= stop:
            return max(o, stop)
        if side == "sell" and l <= stop:
            return min(o, stop)
    if kind == "stop_limit":
        stop, limit = D(order["stop_price"]), D(order["limit_price"])
        triggered = order.get("triggered", False) or (h >= stop if side == "buy" else l <= stop)
        if triggered:
            order["triggered"] = True
        if triggered and side == "buy" and l <= limit:
            return min(max(o, stop), limit)
        if triggered and side == "sell" and h >= limit:
            return max(min(o, stop), limit)
    return None


def process_bar(
    account: dict,
    positions: list[dict],
    orders: list[dict],
    bar: dict,
    clock: int,
    fee_bps: Decimal = Decimal("0"),
    instrument_id: str = "NSE:RELIANCE",
    fx_rate: Decimal = Decimal("1"),
    fx_cost_bps: Decimal = Decimal("0"),
    spread_bps: Decimal = Decimal("0"),
    slippage_bps: Decimal = Decimal("0"),
) -> BarResult:
    acct = {**account}
    cash, reserved, realized = D(acct.get("cash", 0)), D(acct.get("reserved", 0)), D(acct.get("realized_pnl", 0))
    pos = {p["instrument_id"]: {**p} for p in positions}
    working = [{**o} for o in orders]
    fills, ledger, completed_oco, protective_orders = [], [], set(), []
    # Stops precede profit-taking limits when both touch in an ambiguous OHLC bar.
    working.sort(key=lambda x: (0 if x.get("order_type", "").startswith("stop") else 1, x.get("created_at", ""), x["id"]))
    for current in working:
        if current.get("status") != "open" or int(current.get("submitted_clock", -1)) >= clock:
            continue
        if current.get("instrument_id", instrument_id) != instrument_id:
            continue
        group = current.get("oco_group")
        if group and group in completed_oco:
            current["status"] = "cancelled"
            continue
        price = _eligible_price(current, bar)
        if price is None:
            continue
        if current["order_type"] in {"market", "stop_market"}:
            friction = spread_bps / D(20000) + slippage_bps / D(10000)
            price *= D(1) + friction if current["side"] == "buy" else D(1) - friction
        quantity = D(current["quantity"])
        existing = pos.get(current.get("instrument_id", instrument_id))
        held = D(existing["quantity"]) if existing else ZERO
        if current.get("reduce_only"):
            quantity = min(quantity, held) if current["side"] == "sell" else ZERO
        quote_notional = price * quantity
        reporting_notional = quote_notional * fx_rate
        fee = (reporting_notional * fee_bps / D(10000)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
        conversion_cost = (reporting_notional * fx_cost_bps / D(10000)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
        reserved -= D(current.get("reserved", 0))
        if quantity <= 0 or (current["side"] == "buy" and cash < reporting_notional + fee + conversion_cost):
            current.update(status="rejected", rejection_reason="INSUFFICIENT_CASH" if current["side"] == "buy" else "REDUCE_ONLY")
            continue
        instrument = current.get("instrument_id", instrument_id)
        if current["side"] == "buy":
            cost = reporting_notional + fee + conversion_cost
            cash -= cost
            old_qty = held
            old_avg = D(existing["average_price"]) if existing else ZERO
            old_reporting_avg = D(existing.get("reporting_average_price", old_avg * fx_rate)) if existing else ZERO
            new_qty = old_qty + quantity
            pos[instrument] = {
                "instrument_id": instrument,
                "quantity": format(new_qty, "f"),
                "average_price": money((old_qty * old_avg + quantity * price) / new_qty),
                "reporting_average_price": money((old_qty * old_reporting_avg + cost) / new_qty),
            }
            amount = -cost
        else:
            avg = D(existing["average_price"])
            reporting_avg = D(existing.get("reporting_average_price", avg * fx_rate))
            proceeds = reporting_notional - fee - conversion_cost
            cash += proceeds
            realized += proceeds - reporting_avg * quantity
            remaining = held - quantity
            if remaining:
                pos[instrument] = {**existing, "quantity": format(remaining, "f")}
            else:
                pos.pop(instrument, None)
            amount = proceeds
        current.update(status="filled", filled_quantity=format(quantity, "f"), fill_price=money(price), filled_at=bar["time"])
        fill = {
            "id": f"fill:{current['id']}:{bar['time']}",
            "order_id": current["id"],
            "instrument_id": instrument,
            "price": money(price),
            "quantity": format(quantity, "f"),
            "fee": money(fee),
            "conversion_cost": money(conversion_cost),
            "fx_rate": format(fx_rate, "f"),
            "time": bar["time"],
        }
        fills.append(fill)
        ledger.append({"id": f"ledger:{current['id']}:{bar['time']}", "order_id": current["id"], "amount": money(amount), "currency": acct.get("reporting_currency", "INR"), "time": bar["time"]})
        if current["side"] == "buy" and not current.get("reduce_only"):
            group = f"oco:{current['id']}"
            if current.get("stop_loss"):
                protective_orders.append({
                    "id": f"{current['id']}:sl", "parent_order_id": current["id"],
                    "instrument_id": instrument, "side": "sell", "order_type": "stop_market",
                    "quantity": format(quantity, "f"), "stop_price": str(current["stop_loss"]),
                    "status": "open", "submitted_clock": clock, "reduce_only": True,
                    "time_in_force": "GTC", "reserved": "0.00", "oco_group": group,
                })
            if current.get("take_profit"):
                protective_orders.append({
                    "id": f"{current['id']}:tp", "parent_order_id": current["id"],
                    "instrument_id": instrument, "side": "sell", "order_type": "limit",
                    "quantity": format(quantity, "f"), "limit_price": str(current["take_profit"]),
                    "status": "open", "submitted_clock": clock, "reduce_only": True,
                    "time_in_force": "GTC", "reserved": "0.00", "oco_group": group,
                })
        if group:
            completed_oco.add(group)
    mark = D(bar["close"])
    marked = pos.get(instrument_id)
    if marked:
        marked["market_price"] = money(mark)
        marked["fx_rate"] = format(fx_rate, "f")
        reporting_avg = D(marked.get("reporting_average_price", D(marked["average_price"]) * fx_rate))
        marked["unrealized_pnl"] = money(mark * D(marked["quantity"]) * fx_rate - reporting_avg * D(marked["quantity"]))
        marked["market_value"] = money(mark * D(marked["quantity"]) * fx_rate)
    working.extend(protective_orders)
    unrealized = sum((D(p.get("unrealized_pnl", 0)) for p in pos.values()), ZERO)
    market_value = sum((D(p.get("market_value", 0)) for p in pos.values()), ZERO)
    acct.update(cash=money(cash), reserved=money(max(reserved, ZERO)), realized_pnl=money(realized), unrealized_pnl=money(unrealized), equity=money(cash + market_value), buying_power=money(max(cash - max(reserved, ZERO), ZERO)))
    return BarResult(acct, list(pos.values()), working, fills, ledger)


def process_quote_trade(
    account: dict,
    positions: list[dict],
    orders: list[dict],
    event: MarketEvent,
    clock: int,
    fee_bps: Decimal = Decimal("0"),
    fx_rate: Decimal = Decimal("1"),
    fx_cost_bps: Decimal = Decimal("0"),
    slippage_bps: Decimal = Decimal("0"),
) -> BarResult:
    """Apply one normalized quote or trade without borrowing liquidity from another event."""
    event.validate()
    acct, pos, working, fills, ledger = {**account}, [{**item} for item in positions], [{**item} for item in orders], [], []
    liquidity = {"buy": event.ask_size if event.kind == "quote" else event.size, "sell": event.bid_size if event.kind == "quote" else event.size}
    for index, current in enumerate(working):
        if current.get("status") != "open" or current.get("instrument_id") != event.instrument_id or int(current.get("submitted_clock", -1)) >= clock:
            continue
        kind, side = current["order_type"], current["side"]
        price = event.ask if event.kind == "quote" and side == "buy" else event.bid if event.kind == "quote" else event.price
        qualifies = (event.kind == "quote" and kind == "market") or (event.kind == "trade" and kind == "limit" and ((side == "buy" and price <= D(current["limit_price"])) or (side == "sell" and price >= D(current["limit_price"]))))
        if not qualifies:
            continue
        requested, available = D(current["quantity"]), liquidity[side] or ZERO
        quantity = min(requested, available)
        if quantity <= 0:
            if event.kind == "quote" and kind == "market":
                current.update(status="cancelled", rejection_reason="INSUFFICIENT_DISPLAYED_DEPTH")
            continue
        reserved = D(current.get("reserved", 0))
        executable = {**current, "quantity": format(quantity, "f"), "reserved": format(reserved * quantity / requested, "f")}
        bar = {"time": event.exchange_time, "open": str(price), "high": str(price), "low": str(price), "close": str(price), "volume": str(quantity)}
        result = process_bar(acct, pos, [executable], bar, clock, fee_bps, event.instrument_id, fx_rate, fx_cost_bps, Decimal("0"), slippage_bps)
        acct, pos = result.account, result.positions
        for fill in result.fills:
            fill["source_event_id"] = event.event_id
            fill["source"] = event.source
        fills.extend(result.fills)
        ledger.extend(result.ledger)
        liquidity[side] = available - quantity
        filled = D(current.get("filled_quantity", 0)) + quantity
        if kind == "market":
            current.update(result.orders[0], quantity=format(requested, "f"), filled_quantity=format(filled, "f"))
            if quantity < requested:
                current.update(status="cancelled", rejection_reason="INSUFFICIENT_DISPLAYED_DEPTH")
        elif quantity < requested:
            current.update(quantity=format(requested - quantity, "f"), filled_quantity=format(filled, "f"), reserved=format(reserved - D(executable["reserved"]), "f"))
        else:
            current.update(result.orders[0], filled_quantity=format(filled, "f"))
        working[index] = current
    return BarResult(acct, pos, working, fills, ledger)
