"""Validated Redis Stream boundary for provider market events."""
from __future__ import annotations

import json
from decimal import Decimal

from app.simulator.market_data import MarketDataError, MarketEvent


MARKET_EVENTS_STREAM = "simulator:market-events"


def encode_event(event: MarketEvent) -> str:
    event.validate()
    return json.dumps({key: str(value) if isinstance(value, Decimal) else value for key, value in event.__dict__.items()}, separators=(",", ":"), sort_keys=True)


def decode_event(payload: str) -> MarketEvent:
    try:
        values = json.loads(payload)
        for key in ("bid", "ask", "bid_size", "ask_size", "price", "size"):
            if values.get(key) is not None:
                values[key] = Decimal(values[key])
        return MarketEvent(**values).validate()
    except (TypeError, ValueError, json.JSONDecodeError, MarketDataError):
        raise MarketDataError("invalid provider event") from None


async def publish_event(redis_client, event: MarketEvent) -> str:
    """Publish only normalized events; execution remains idempotent downstream."""

    return await redis_client.xadd(MARKET_EVENTS_STREAM, {"event": encode_event(event)}, maxlen=100_000, approximate=True)
