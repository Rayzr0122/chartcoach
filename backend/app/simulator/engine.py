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


def _position_effect(order: dict, held: Decimal) -> str:
    effect = order.get("position_effect", "auto")
    if effect != "auto":
        return effect
    if order.get("reduce_only"):
        return "close_long" if order["side"] == "sell" else "close_short"
    if order["side"] == "buy":
        return "close_short" if held < ZERO else "open_long"
    return "close_long" if held > ZERO else "open_short"


def _margin_reserved(position: dict, mark: Decimal, fx_rate: Decimal, initial_margin_rate: Decimal) -> Decimal:
    quantity = D(position["quantity"])
    needs_margin = quantity < ZERO or bool(position.get("margin_for_longs"))
    rate = D(position.get("initial_margin_rate", initial_margin_rate))
    return abs(quantity) * mark * fx_rate * rate if needs_margin else ZERO


def _maintenance_required(position: dict, default_rate: Decimal) -> Decimal:
    quantity = D(position["quantity"])
    if quantity >= ZERO and not position.get("margin_for_longs"):
        return ZERO
    mark = D(position.get("market_price", position.get("average_price", 0)))
    fx_rate = D(position.get("fx_rate", 1))
    return abs(quantity) * mark * fx_rate * D(position.get("maintenance_margin_rate", default_rate))


def _mark_position(position: dict, mark: Decimal, fx_rate: Decimal, initial_margin_rate: Decimal) -> None:
    position["market_price"] = money(mark)
    position["fx_rate"] = format(fx_rate, "f")
    quantity = D(position["quantity"])
    reporting_avg = D(position.get("reporting_average_price", D(position["average_price"]) * fx_rate))
    unrealized = mark * quantity * fx_rate - reporting_avg * quantity
    position["unrealized_pnl"] = money(unrealized)
    position["market_value"] = money(unrealized if position.get("leveraged") else mark * quantity * fx_rate)
    position["margin_reserved"] = money(_margin_reserved(position, mark, fx_rate, initial_margin_rate))


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
    shortable: bool = False,
    initial_margin_rate: Decimal = Decimal("0.5"),
    maintenance_margin_rate: Decimal = Decimal("0.3"),
    borrow_rate_bps: Decimal = Decimal("0"),
    leveraged: bool = False,
    margin_for_longs: bool = False,
) -> BarResult:
    acct = {**account}
    cash, realized = D(acct.get("cash", 0)), D(acct.get("realized_pnl", 0))
    pos = {p["instrument_id"]: {**p} for p in positions}
    working = [{**o} for o in orders]
    fills, ledger, completed_oco, protective_orders = [], [], set(), []
    market_day = int(bar["time"]) // 86_400
    # Stops precede profit-taking limits when both touch in an ambiguous OHLC bar.
    working.sort(key=lambda x: (0 if x.get("order_type", "").startswith("stop") else 1, x.get("created_at", ""), x["id"]))
    for current in working:
        if current.get("status") != "open" or int(current.get("submitted_clock", -1)) >= clock:
            continue
        if current.get("time_in_force") == "DAY" and current.get("submitted_market_day", market_day) < market_day:
            current.update(status="cancelled", rejection_reason="DAY_EXPIRED")
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
        existing = pos.get(current.get("instrument_id", instrument_id))
        held = D(existing["quantity"]) if existing else ZERO
        effect = _position_effect(current, held)
        quantity = D(current["quantity"])
        if effect == "close_long":
            quantity = min(quantity, max(held, ZERO))
        elif effect == "close_short":
            quantity = min(quantity, abs(min(held, ZERO)))
        elif effect == "open_short" and (not shortable or held > ZERO):
            quantity = ZERO
        elif effect == "open_long" and held < ZERO:
            quantity = ZERO
        quote_notional = price * quantity
        reporting_notional = quote_notional * fx_rate
        fee = (reporting_notional * fee_bps / D(10000)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
        conversion_cost = (reporting_notional * fx_cost_bps / D(10000)).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
        cost = reporting_notional + fee + conversion_cost
        if quantity <= 0:
            current.update(status="rejected", rejection_reason="SHORT_NOT_AVAILABLE" if effect == "open_short" else "REDUCE_ONLY")
            continue
        if effect == "open_long" and not leveraged and cash < cost:
            current.update(status="rejected", rejection_reason="INSUFFICIENT_CASH")
            continue
        instrument = current.get("instrument_id", instrument_id)
        if effect == "open_long":
            cash -= fee + conversion_cost if leveraged else cost
            old_qty = held
            old_avg = D(existing["average_price"]) if existing else ZERO
            old_reporting_avg = D(existing.get("reporting_average_price", old_avg * fx_rate)) if existing else ZERO
            new_qty = old_qty + quantity
            pos[instrument] = {
                "instrument_id": instrument,
                "quantity": format(new_qty, "f"),
                "average_price": money((old_qty * old_avg + quantity * price) / new_qty),
                "reporting_average_price": money((old_qty * old_reporting_avg + quantity * price * fx_rate + (fee + conversion_cost if not leveraged else ZERO)) / new_qty),
                "leveraged": leveraged, "margin_for_longs": margin_for_longs,
                "initial_margin_rate": format(initial_margin_rate, "f"), "maintenance_margin_rate": format(maintenance_margin_rate, "f"),
                "borrow_rate_bps": format(borrow_rate_bps, "f"), "borrow_accrued_day": market_day,
            }
            amount = -(fee + conversion_cost) if leveraged else -cost
        elif effect == "close_long":
            avg = D(existing["average_price"])
            reporting_avg = D(existing.get("reporting_average_price", avg * fx_rate))
            proceeds = reporting_notional - fee - conversion_cost
            amount = proceeds
            if leveraged:
                amount = reporting_notional - reporting_avg * quantity - fee - conversion_cost
                cash += amount
                realized += amount
            else:
                cash += proceeds
                realized += proceeds - reporting_avg * quantity
            remaining = held - quantity
            if remaining:
                pos[instrument] = {**existing, "quantity": format(remaining, "f")}
            else:
                pos.pop(instrument, None)
        elif effect == "open_short":
            proceeds = reporting_notional - fee - conversion_cost
            old_qty = abs(min(held, ZERO))
            old_avg = D(existing["average_price"]) if existing else ZERO
            old_reporting_avg = D(existing.get("reporting_average_price", old_avg * fx_rate)) if existing else ZERO
            new_qty = old_qty + quantity
            cash += -(fee + conversion_cost) if leveraged else proceeds
            pos[instrument] = {
                "instrument_id": instrument,
                "quantity": format(-new_qty, "f"),
                "average_price": money((old_qty * old_avg + quantity * price) / new_qty),
                "reporting_average_price": money((old_qty * old_reporting_avg + quantity * price * fx_rate + (fee + conversion_cost if not leveraged else ZERO)) / new_qty),
                "leveraged": leveraged, "margin_for_longs": margin_for_longs,
                "initial_margin_rate": format(initial_margin_rate, "f"), "maintenance_margin_rate": format(maintenance_margin_rate, "f"),
                "borrow_rate_bps": format(borrow_rate_bps, "f"), "borrow_accrued_day": market_day,
            }
            amount = -(fee + conversion_cost) if leveraged else proceeds
        else:  # close_short
            avg = D(existing["average_price"])
            reporting_avg = D(existing.get("reporting_average_price", avg * fx_rate))
            cash -= cost
            amount = -cost
            if leveraged:
                amount = reporting_avg * quantity - reporting_notional - fee - conversion_cost
                cash += cost + amount
                realized += amount
            else:
                realized += reporting_avg * quantity - cost
            remaining = abs(held) - quantity
            if remaining:
                pos[instrument] = {**existing, "quantity": format(-remaining, "f")}
            else:
                pos.pop(instrument, None)
        current.update(status="filled", filled_quantity=format(quantity, "f"), fill_price=money(price), filled_at=bar["time"], position_effect=effect)
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
            "position_effect": effect,
        }
        fills.append(fill)
        ledger.append({"id": f"ledger:{current['id']}:{bar['time']}", "order_id": current["id"], "amount": money(amount), "currency": acct.get("reporting_currency", "INR"), "time": bar["time"]})
        if effect in {"open_long", "open_short"}:
            group = f"oco:{current['id']}"
            if current.get("stop_loss"):
                protective_orders.append({
                    "id": f"{current['id']}:sl", "parent_order_id": current["id"],
                    "instrument_id": instrument, "side": "sell" if effect == "open_long" else "buy", "order_type": "stop_market",
                    "quantity": format(quantity, "f"), "stop_price": str(current["stop_loss"]),
                    "status": "open", "submitted_clock": clock, "reduce_only": True,
                    "time_in_force": "GTC", "reserved": "0.00", "oco_group": group,
                    "position_effect": "close_long" if effect == "open_long" else "close_short",
                })
            if current.get("take_profit"):
                protective_orders.append({
                    "id": f"{current['id']}:tp", "parent_order_id": current["id"],
                    "instrument_id": instrument, "side": "sell" if effect == "open_long" else "buy", "order_type": "limit",
                    "quantity": format(quantity, "f"), "limit_price": str(current["take_profit"]),
                    "status": "open", "submitted_clock": clock, "reduce_only": True,
                    "time_in_force": "GTC", "reserved": "0.00", "oco_group": group,
                    "position_effect": "close_long" if effect == "open_long" else "close_short",
                })
        if group:
            completed_oco.add(group)
    mark = D(bar["close"])
    marked = pos.get(instrument_id)
    if marked:
        _mark_position(marked, mark, fx_rate, initial_margin_rate)
    working.extend(protective_orders)
    for position in pos.values():
        if position["instrument_id"] != instrument_id and "market_price" in position:
            _mark_position(position, D(position["market_price"]), D(position.get("fx_rate", 1)), initial_margin_rate)
        if D(position["quantity"]) >= ZERO or not D(position.get("borrow_rate_bps", 0)):
            continue
        previous_day = position.get("borrow_accrued_day")
        if previous_day is None:
            position["borrow_accrued_day"] = market_day
            continue
        if market_day <= int(previous_day):
            continue
        borrow_fee = (abs(D(position["quantity"])) * D(position.get("market_price", position["average_price"])) * D(position.get("fx_rate", 1)) * D(position["borrow_rate_bps"]) / Decimal("3650000")).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)
        cash -= borrow_fee
        realized -= borrow_fee
        position["borrow_accrued_day"] = market_day
        ledger.append({"id": f"borrow:{position['instrument_id']}:{market_day}", "instrument_id": position["instrument_id"], "amount": money(-borrow_fee), "currency": acct.get("reporting_currency", "INR"), "time": bar["time"], "type": "borrow_fee"})
    unrealized = sum((D(p.get("unrealized_pnl", 0)) for p in pos.values()), ZERO)
    market_value = sum((D(p.get("market_value", 0)) for p in pos.values()), ZERO)
    maintenance = sum((_maintenance_required(position, maintenance_margin_rate) for position in pos.values()), ZERO)
    margin_state = "healthy"
    if maintenance and cash + market_value < maintenance:
        margin_state = "liquidated"
        for current in working:
            held = D(pos.get(current.get("instrument_id"), {}).get("quantity", 0))
            if current.get("status") == "open" and _position_effect(current, held) in {"open_long", "open_short"}:
                current.update(status="cancelled", rejection_reason="MARGIN_LIQUIDATION")
        candidates = sorted(
            (position for position in pos.values() if _maintenance_required(position, maintenance_margin_rate)),
            key=lambda position: (-_maintenance_required(position, maintenance_margin_rate), position["instrument_id"]),
        )
        liquidated = set()
        for position in candidates:
            instrument = position["instrument_id"]
            quantity = D(position["quantity"])
            close_quantity = abs(quantity)
            price = D(position.get("market_price", position["average_price"]))
            position_fx = D(position.get("fx_rate", 1))
            reporting_avg = D(position.get("reporting_average_price", D(position["average_price"]) * position_fx))
            notional = price * close_quantity * position_fx
            if position.get("leveraged"):
                amount = (price * position_fx - reporting_avg) * quantity
            elif quantity > ZERO:
                amount = notional
                realized += notional - reporting_avg * close_quantity
            else:
                amount = -notional
                realized += reporting_avg * close_quantity - notional
            cash += amount
            if position.get("leveraged"):
                realized += amount
            effect = "close_long" if quantity > ZERO else "close_short"
            fills.append({"id": f"liquidation:{instrument}:{bar['time']}", "order_id": f"liquidation:{instrument}:{bar['time']}", "instrument_id": instrument, "price": money(price), "quantity": format(close_quantity, "f"), "fee": "0.00", "conversion_cost": "0.00", "fx_rate": format(position_fx, "f"), "time": bar["time"], "position_effect": effect, "liquidation": True})
            ledger.append({"id": f"ledger:liquidation:{instrument}:{bar['time']}", "order_id": f"liquidation:{instrument}:{bar['time']}", "amount": money(amount), "currency": acct.get("reporting_currency", "INR"), "time": bar["time"], "type": "liquidation"})
            pos.pop(instrument, None)
            liquidated.add(instrument)
            market_value = sum((D(item.get("market_value", 0)) for item in pos.values()), ZERO)
            maintenance = sum((_maintenance_required(item, maintenance_margin_rate) for item in pos.values()), ZERO)
            if cash + market_value >= maintenance:
                break
        for current in working:
            if current.get("status") == "open" and current.get("instrument_id") in liquidated:
                current.update(status="cancelled", rejection_reason="MARGIN_LIQUIDATION")
        unrealized = sum((D(p.get("unrealized_pnl", 0)) for p in pos.values()), ZERO)
        market_value = sum((D(p.get("market_value", 0)) for p in pos.values()), ZERO)
        maintenance = sum((_maintenance_required(position, maintenance_margin_rate) for position in pos.values()), ZERO)
    reserved = sum((D(item.get("reserved", 0)) for item in working if item.get("status") == "open"), ZERO)
    reserved += sum((D(position.get("margin_reserved", 0)) for position in pos.values()), ZERO)
    acct.update(cash=money(cash), reserved=money(reserved), realized_pnl=money(realized), unrealized_pnl=money(unrealized), equity=money(cash + market_value), buying_power=money(max(cash - reserved, ZERO)), maintenance_margin=money(maintenance), margin_state=margin_state)
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
    shortable: bool = False,
    initial_margin_rate: Decimal = Decimal("0.5"),
    maintenance_margin_rate: Decimal = Decimal("0.3"),
    borrow_rate_bps: Decimal = Decimal("0"),
    leveraged: bool = False,
    margin_for_longs: bool = False,
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
        result = process_bar(
            acct, pos, [executable], bar, clock, fee_bps=fee_bps, instrument_id=event.instrument_id,
            fx_rate=fx_rate, fx_cost_bps=fx_cost_bps, slippage_bps=slippage_bps,
            shortable=shortable, initial_margin_rate=initial_margin_rate,
            maintenance_margin_rate=maintenance_margin_rate, borrow_rate_bps=borrow_rate_bps,
            leveraged=leveraged, margin_for_longs=margin_for_longs,
        )
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
