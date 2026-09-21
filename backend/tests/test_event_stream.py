from decimal import Decimal

import pytest

from app.simulator.event_stream import decode_event, encode_event
from app.simulator.market_data import MarketDataError, MarketEvent


def test_market_stream_payload_round_trips_normalized_quote_fields():
    event = MarketEvent.quote(source="fixture", event_id="q1", instrument_id="NASDAQ:AAPL", venue="IEX", exchange_time=100, received_time=101, bid=Decimal("100"), ask=Decimal("101"), bid_size=Decimal("2"), ask_size=Decimal("3"))

    decoded = decode_event(encode_event(event))

    assert decoded == event


def test_market_stream_rejects_unvalidated_payloads():
    with pytest.raises(MarketDataError):
        decode_event('{"kind":"quote","source":"x"}')
