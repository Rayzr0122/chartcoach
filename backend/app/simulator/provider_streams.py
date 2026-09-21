"""Concrete WebSocket adapters that normalize approved live providers."""
from __future__ import annotations

import json
import time
from datetime import datetime
from decimal import Decimal

import websockets

from app.config import settings
from app.simulator.market_data import MarketDataError, MarketEvent


def _timestamp(value: str) -> int:
    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())
    except (AttributeError, ValueError):
        raise MarketDataError("invalid provider timestamp") from None


def alpaca_event(message: dict) -> MarketEvent | None:
    kind = message.get("T")
    if kind not in {"q", "t"}:
        return None
    common = {"source": "alpaca_iex", "event_id": f"{kind}:{message.get('i', message.get('t'))}", "instrument_id": f"NASDAQ:{message['S']}", "venue": "IEX", "exchange_time": _timestamp(message["t"]), "received_time": int(time.time()), "sequence": message.get("i")}
    if kind == "q":
        return MarketEvent.quote(**common, bid=Decimal(message["bp"]), ask=Decimal(message["ap"]), bid_size=Decimal(message["bs"]), ask_size=Decimal(message["as"])).validate()
    return MarketEvent.trade(**common, price=Decimal(message["p"]), size=Decimal(message["s"])).validate()


def coinbase_event(message: dict) -> MarketEvent | None:
    kind = message.get("type")
    if kind not in {"ticker", "match"}:
        return None
    common = {"source": "coinbase", "event_id": f"{kind}:{message.get('trade_id', message.get('sequence'))}", "instrument_id": f"CRYPTO:{message['product_id']}", "venue": "COINBASE", "exchange_time": _timestamp(message["time"]), "received_time": int(time.time()), "sequence": message.get("sequence")}
    if kind == "ticker":
        return MarketEvent.quote(**common, bid=Decimal(message["best_bid"]), ask=Decimal(message["best_ask"]), bid_size=Decimal(message["best_bid_size"]), ask_size=Decimal(message["best_ask_size"])).validate()
    return MarketEvent.trade(**common, price=Decimal(message["price"]), size=Decimal(message["size"])).validate()


async def stream_alpaca(symbols: set[str]):
    async with websockets.connect("wss://stream.data.alpaca.markets/v2/iex") as socket:
        await socket.send(json.dumps({"action": "auth", "key": settings.alpaca_api_key, "secret": settings.alpaca_api_secret}))
        await socket.recv()
        await socket.send(json.dumps({"action": "subscribe", "quotes": sorted(symbols), "trades": sorted(symbols)}))
        async for raw in socket:
            for message in json.loads(raw):
                event = alpaca_event(message)
                if event:
                    yield event


async def stream_coinbase(products: set[str]):
    async with websockets.connect("wss://ws-feed.exchange.coinbase.com") as socket:
        await socket.send(json.dumps({"type": "subscribe", "product_ids": sorted(products), "channels": ["ticker", "matches"]}))
        async for raw in socket:
            event = coinbase_event(json.loads(raw))
            if event:
                yield event
