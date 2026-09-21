from app.simulator.provider_streams import alpaca_event, coinbase_event


def test_alpaca_quote_and_trade_map_to_canonical_events(monkeypatch):
    monkeypatch.setattr("app.simulator.provider_streams.time.time", lambda: 1_700_000_010)
    quote = alpaca_event({"T": "q", "S": "AAPL", "t": "2023-11-14T22:13:20Z", "bp": "100", "ap": "101", "bs": "2", "as": "3"})
    trade = alpaca_event({"T": "t", "S": "AAPL", "t": "2023-11-14T22:13:20Z", "i": 7, "p": "100.5", "s": "1"})

    assert quote and quote.instrument_id == "NASDAQ:AAPL" and quote.kind == "quote"
    assert trade and trade.event_id == "t:7" and trade.kind == "trade"


def test_coinbase_quote_and_trade_map_to_canonical_events(monkeypatch):
    monkeypatch.setattr("app.simulator.provider_streams.time.time", lambda: 1_700_000_010)
    quote = coinbase_event({"type": "ticker", "product_id": "BTC-USD", "time": "2023-11-14T22:13:20Z", "sequence": 3, "best_bid": "100", "best_ask": "101", "best_bid_size": "2", "best_ask_size": "3"})
    trade = coinbase_event({"type": "match", "product_id": "BTC-USD", "time": "2023-11-14T22:13:20Z", "sequence": 4, "trade_id": 8, "price": "100.5", "size": "1"})

    assert quote and quote.instrument_id == "CRYPTO:BTC-USD" and quote.sequence == 3
    assert trade and trade.event_id == "match:8" and trade.kind == "trade"
