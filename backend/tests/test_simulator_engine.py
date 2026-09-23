from decimal import Decimal

from app.simulator.engine import process_bar, process_quote_trade
from app.simulator.market_data import MarketEvent


def account(cash="1000"):
    return {"cash": cash, "reserved": "0", "realized_pnl": "0"}


def bar(o="100", h="110", l="90", c="105", t=60):
    return {"time": t, "open": o, "high": h, "low": l, "close": c, "volume": "1000"}


def order(**overrides):
    value = {"id": "o1", "side": "buy", "order_type": "market", "quantity": "2", "status": "open", "submitted_clock": 0, "reduce_only": False, "time_in_force": "GTC"}
    value.update(overrides)
    return value


def test_market_order_fills_at_next_bar_open_with_fee_and_weighted_cost():
    result = process_bar(account(), [], [order()], bar(o="100", c="103"), clock=1, fee_bps=Decimal("10"))
    assert result.orders[0]["status"] == "filled"
    assert result.fills[0]["price"] == "100.00"
    assert result.fills[0]["fee"] == "0.20"
    assert result.positions[0]["quantity"] == "2"
    assert result.positions[0]["average_price"] == "100.00"
    assert result.account["cash"] == "799.80"
    assert result.account["unrealized_pnl"] == "5.80"


def test_resting_limit_uses_open_improvement_and_never_worse_than_limit():
    result = process_bar(account(), [], [order(order_type="limit", limit_price="102")], bar(o="99", h="104", l="98"), clock=1)
    assert result.fills[0]["price"] == "99.00"


def test_bracket_stop_wins_when_stop_and_target_touch_same_bar():
    position = {"instrument_id": "NSE:RELIANCE", "quantity": "1", "average_price": "100"}
    stop = order(id="stop", side="sell", quantity="1", order_type="stop_market", stop_price="95", reduce_only=True, oco_group="b1")
    target = order(id="target", side="sell", quantity="1", order_type="limit", limit_price="110", reduce_only=True, oco_group="b1")
    result = process_bar(account("0"), [position], [target, stop], bar(o="100", h="111", l="94", c="105"), clock=1)
    assert next(o for o in result.orders if o["id"] == "stop")["status"] == "filled"
    assert next(o for o in result.orders if o["id"] == "target")["status"] == "cancelled"
    assert result.positions == []
    assert result.account["realized_pnl"] == "-5.00"


def test_reduce_only_is_capped_and_buy_reservation_is_released_on_fill():
    buy = order(quantity="20", reserved="2000")
    result = process_bar(account("1000") | {"reserved": "2000"}, [], [buy], bar(), clock=1)
    assert result.orders[0]["status"] == "rejected"
    assert result.account["reserved"] == "0.00"


def test_usd_fill_converts_notional_fees_and_mark_to_inr():
    result = process_bar(
        account("100000"), [], [order(quantity="2", reserved="17000")],
        bar(o="100", c="105"), clock=1, fee_bps=Decimal("5"),
        instrument_id="NASDAQ:AAPL", fx_rate=Decimal("85"), fx_cost_bps=Decimal("5"),
    )

    assert result.account["cash"] == "82983.00"
    assert result.account["equity"] == "100833.00"
    assert result.account["unrealized_pnl"] == "833.00"
    assert result.fills[0]["fx_rate"] == "85"
    assert result.fills[0]["conversion_cost"] == "8.50"
    assert result.ledger[0]["currency"] == "INR"


def test_entry_fill_creates_deterministic_oco_protection():
    protected = order(quantity="1", stop_loss="95", take_profit="110")
    first = process_bar(account(), [], [protected], bar(o="100", c="100"), clock=1)
    second = process_bar(account(), [], [protected], bar(o="100", c="100"), clock=1)

    children = [item for item in first.orders if item.get("parent_order_id") == "o1"]
    assert {item["id"] for item in children} == {"o1:sl", "o1:tp"}
    assert children[0]["oco_group"] == children[1]["oco_group"] == "oco:o1"
    assert first.fills[0]["id"] == second.fills[0]["id"] == "fill:o1:60"


def test_stop_limit_remains_triggered_until_its_limit_can_fill():
    waiting = order(order_type="stop_limit", stop_price="105", limit_price="103")
    first = process_bar(account(), [], [waiting], bar(o="104", h="106", l="104", c="105"), clock=1)
    assert first.orders[0]["triggered"] is True
    assert first.orders[0]["status"] == "open"
    second = process_bar(first.account, first.positions, first.orders, bar(o="102", h="104", l="101", c="103", t=120), clock=2)
    assert second.orders[0]["status"] == "filled"
    assert second.fills[0]["price"] == "103.00"


def test_market_friction_is_adverse_and_deterministic():
    result = process_bar(account(), [], [order(quantity="1")], bar(o="100", c="100"), clock=1, spread_bps=Decimal("5"), slippage_bps=Decimal("2"))
    assert result.fills[0]["price"] == "100.05"


def test_bar_does_not_fill_an_order_for_a_different_instrument():
    aapl = order(instrument_id="NASDAQ:AAPL")

    result = process_bar(account(), [], [aapl], bar(), clock=1, instrument_id="NSE:RELIANCE")

    assert result.fills == []
    assert result.orders[0]["status"] == "open"


def test_fx_realized_pnl_reconciles_to_reporting_currency_cost_basis():
    bought = process_bar(
        account("100000"), [], [order(instrument_id="NASDAQ:AAPL", quantity="1")],
        bar(o="100", c="100"), clock=1, instrument_id="NASDAQ:AAPL", fx_rate=Decimal("80"),
    )
    sold = process_bar(
        bought.account, bought.positions,
        [order(id="sell", instrument_id="NASDAQ:AAPL", side="sell", quantity="1", reduce_only=True)],
        bar(o="100", c="100", t=120), clock=2, instrument_id="NASDAQ:AAPL", fx_rate=Decimal("85"),
    )

    assert sold.account["realized_pnl"] == "500.00"
    assert sold.account["cash"] == "100500.00"


def test_quote_execution_crosses_the_ask_and_cancels_market_remainder_at_displayed_size():
    quote = MarketEvent.quote(
        source="fixture", event_id="q1", instrument_id="NASDAQ:AAPL", venue="NASDAQ",
        exchange_time=60, received_time=60, bid=Decimal("99"), ask=Decimal("101"),
        bid_size=Decimal("3"), ask_size=Decimal("1"),
    )

    result = process_quote_trade(account(), [], [order(instrument_id="NASDAQ:AAPL", quantity="2")], quote, clock=1)

    assert result.fills[0]["price"] == "101.00"
    assert result.fills[0]["quantity"] == "1"
    assert result.fills[0]["source_event_id"] == "q1"
    assert result.orders[0]["status"] == "cancelled"
    assert result.orders[0]["rejection_reason"] == "INSUFFICIENT_DISPLAYED_DEPTH"


def test_resting_limit_only_fills_when_a_qualifying_trade_prints():
    trade = MarketEvent.trade(
        source="fixture", event_id="t1", instrument_id="NASDAQ:AAPL", venue="NASDAQ",
        exchange_time=60, received_time=60, price=Decimal("99"), size=Decimal("1"),
    )

    result = process_quote_trade(account(), [], [order(instrument_id="NASDAQ:AAPL", quantity="2", order_type="limit", limit_price="100")], trade, clock=1)

    assert result.fills[0]["quantity"] == "1"
    assert result.orders[0]["status"] == "open"
    assert result.orders[0]["quantity"] == "1"


def test_short_sale_and_partial_cover_keep_a_signed_position_and_reconcile_margin():
    opened = process_bar(
        account(), [], [order(side="sell", quantity="2", position_effect="open_short")],
        bar(o="100", c="90"), clock=1, instrument_id="NASDAQ:AAPL",
        shortable=True, initial_margin_rate=Decimal("0.5"),
    )

    assert opened.positions[0]["quantity"] == "-2"
    assert opened.account["cash"] == "1200.00"
    assert opened.account["reserved"] == "90.00"
    assert opened.account["equity"] == "1020.00"

    covered = process_bar(
        opened.account, opened.positions,
        [order(id="cover", side="buy", quantity="1", position_effect="close_short")],
        bar(o="80", c="80", t=120), clock=2, instrument_id="NASDAQ:AAPL",
        shortable=True, initial_margin_rate=Decimal("0.5"),
    )

    assert covered.positions[0]["quantity"] == "-1"
    assert covered.account["realized_pnl"] == "20.00"
    assert covered.account["reserved"] == "40.00"
    assert covered.account["equity"] == "1040.00"


def test_short_borrow_fee_is_charged_once_on_each_new_market_day():
    opened = process_bar(
        account("5000"), [], [order(side="sell", quantity="100", position_effect="open_short")],
        bar(o="100", c="100", t=86_400), clock=1, instrument_id="NASDAQ:AAPL",
        shortable=True, borrow_rate_bps=Decimal("300"),
    )
    held = process_bar(
        opened.account, opened.positions, [], bar(o="100", c="100", t=172_800), clock=2,
        instrument_id="NASDAQ:AAPL", shortable=True, borrow_rate_bps=Decimal("300"),
    )

    assert held.account["cash"] == "14999.18"
    assert held.account["realized_pnl"] == "-0.82"
    assert held.ledger[-1]["amount"] == "-0.82"


def test_margin_breach_cancels_new_exposure_and_liquidates_the_short_at_the_mark():
    opened = process_bar(
        account(), [], [order(side="sell", quantity="10", position_effect="open_short")],
        bar(o="100", c="100"), clock=1, instrument_id="NASDAQ:AAPL",
        shortable=True, initial_margin_rate=Decimal("0.5"), maintenance_margin_rate=Decimal("0.3"),
    )
    breached = process_bar(
        opened.account, opened.positions,
        [order(id="new-long", order_type="limit", limit_price="1", quantity="1", position_effect="open_long", reserved="1")],
        bar(o="200", h="200", l="200", c="200", t=120), clock=2, instrument_id="NASDAQ:AAPL",
        shortable=True, initial_margin_rate=Decimal("0.5"), maintenance_margin_rate=Decimal("0.3"),
    )

    assert breached.positions == []
    assert breached.account["margin_state"] == "liquidated"
    assert next(order for order in breached.orders if order["id"] == "new-long")["status"] == "cancelled"
    assert breached.fills[-1]["liquidation"] is True


def test_fx_long_uses_margin_without_debiting_the_full_notional():
    result = process_bar(
        account(), [], [order(quantity="100", position_effect="open_long")],
        bar(o="10", c="10"), clock=1, instrument_id="FX:EUR-USD",
        shortable=True, initial_margin_rate=Decimal("0.05"), maintenance_margin_rate=Decimal("0.025"),
        leveraged=True, margin_for_longs=True,
    )

    assert result.account["cash"] == "1000.00"
    assert result.account["equity"] == "1000.00"
    assert result.account["reserved"] == "50.00"


def test_day_order_expires_when_the_replay_reaches_the_next_market_day():
    result = process_bar(
        account(), [], [order(order_type="limit", limit_price="1", time_in_force="DAY", submitted_market_day=0)],
        bar(o="100", h="100", l="100", c="100", t=86_400), clock=1,
    )

    assert result.orders[0]["status"] == "cancelled"
    assert result.orders[0]["rejection_reason"] == "DAY_EXPIRED"
