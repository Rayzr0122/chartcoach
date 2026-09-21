"""Advance replay and delayed sessions from authoritative server state."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4

import redis.asyncio as redis
import websockets

from app.api.simulator import advance_state
from app.config import settings
from app.simulator.database import get_simulator_db
from app.simulator.engine import process_quote_trade
from app.simulator.event_stream import MARKET_EVENTS_STREAM, decode_event, publish_event
from app.simulator.market_data import MarketDataError
from app.simulator.provider_streams import stream_alpaca, stream_coinbase
from app.simulator.repository import MongoSimulatorRepository


OUTBOX_STREAM = "simulator:outbox"


def _parse(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def advance_sessions(repo, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    changed = 0
    for listed in repo.list_active_sessions():
        state = repo.snapshot(listed["id"])
        session = state["session"]
        if session["mode"] == "replay":
            heartbeat = _parse(session.get("controller_heartbeat_at"))
            if session["state"] != "playing":
                continue
            if not heartbeat or (now - heartbeat).total_seconds() > session.get("controller_lease_seconds", 15):
                def pause(current):
                    updated = {**current["session"], "state": "paused"}
                    return {"state": "paused"}, {"session": updated, "events": [{"id": f"evt_{uuid4().hex}", "type": "replay.lease_expired", "created_at": now.isoformat()}]}
                repo.mutate(session["id"], f"worker:lease:{session['revision']}", "lease-expired", pause)
                changed += 1
                continue
            count = session.get("speed", 1)
        else:
            previous = _parse(session.get("last_tick_at"))
            if previous and (now - previous).total_seconds() < 60:
                continue
            count = 1

        def advance(current):
            updated, account, positions, orders, fills, ledger = advance_state(current, count)
            updated["last_tick_at"] = now.isoformat()
            event = {"id": f"evt_{uuid4().hex}", "type": "clock.advanced", "created_at": now.isoformat(), "clock": updated["clock"]}
            return {"clock": updated["clock"]}, {"session": updated, "account": account, "positions": positions, "orders": orders, "fills": fills, "ledger": ledger, "events": [event]}

        repo.mutate(session["id"], f"worker:clock:{session['clock']}", f"advance:{count}", advance)
        changed += 1
    return changed


def process_market_event(repo, event) -> int:
    """Apply one provider event to matching live sessions exactly once."""

    changed = 0
    for listed in repo.list_active_sessions():
        if listed.get("mode") != "stream" or listed.get("state") != "playing" or listed.get("instrument_id") != event.instrument_id:
            continue
        state = repo.snapshot(listed["id"])
        if state["session"].get("last_source_event_id") == event.event_id:
            continue

        def execute(current):
            session = {**current["session"], "market_time": event.exchange_time, "last_source_event_id": event.event_id, "clock": current["session"].get("clock", 0) + 1}
            result = process_quote_trade(current["account"], current["positions"], current["orders"], event, session["clock"])
            emitted = {"id": f"evt_{uuid4().hex}", "type": "market.event_applied", "source_event_id": event.event_id, "created_at": datetime.now(timezone.utc).isoformat()}
            return {"market_time": session["market_time"]}, {"session": session, "account": result.account, "positions": result.positions, "orders": result.orders, "fills": result.fills, "ledger": result.ledger, "events": [emitted]}

        repo.mutate(listed["id"], f"market:{event.source}:{event.event_id}", event.event_id, execute)
        changed += 1
    return changed


async def consume_market_events(redis_client, repo) -> int:
    """Consume one bounded batch and retain malformed provider payloads for inspection."""

    group, consumer = "simulator-execution", "worker"
    try:
        await redis_client.xgroup_create(MARKET_EVENTS_STREAM, group, id="0", mkstream=True)
    except redis.ResponseError as error:
        if "BUSYGROUP" not in str(error):
            raise
    records = await redis_client.xreadgroup(group, consumer, {MARKET_EVENTS_STREAM: ">"}, count=100, block=100)
    changed = 0
    for _, entries in records:
        for message_id, fields in entries:
            try:
                changed += process_market_event(repo, decode_event(fields["event"]))
            except (KeyError, MarketDataError, ValueError) as error:
                repo.db.simulator_market_event_failures.insert_one({"stream_id": message_id, "payload": fields, "reason": str(error), "created_at": datetime.now(timezone.utc).isoformat()})
            await redis_client.xack(MARKET_EVENTS_STREAM, group, message_id)
    return changed


async def publish_outbox(redis_client, repo) -> int:
    """Publish committed notifications at least once; consumers deduplicate event ids."""

    emitted = 0
    for event in repo.unpublished_outbox():
        await redis_client.xadd(OUTBOX_STREAM, {"event": json.dumps(event, default=str, separators=(",", ":"))}, maxlen=100_000, approximate=True)
        repo.mark_outbox_published(event["id"], datetime.now(timezone.utc).isoformat())
        emitted += 1
    return emitted


async def pump_provider_events(redis_client, repo, provider: str) -> None:
    """Reconnect a provider feed periodically so active subscriptions are refreshed."""

    while True:
        sessions = [item for item in repo.list_active_sessions() if item.get("mode") == "stream" and item.get("state") == "playing" and item.get("data_source") == provider]
        symbols = {item["instrument_id"].split(":", 1)[1] for item in sessions}
        if not symbols or (provider == "alpaca_iex" and not (settings.alpaca_api_key and settings.alpaca_api_secret)):
            await asyncio.sleep(5)
            continue
        stream = stream_alpaca(symbols) if provider == "alpaca_iex" else stream_coinbase(symbols)
        try:
            async with asyncio.timeout(60):
                async for event in stream:
                    await publish_event(redis_client, event)
        except (MarketDataError, ValueError, OSError, websockets.WebSocketException, TimeoutError):
            await asyncio.sleep(2)


async def run() -> None:
    redis_client = redis.from_url(settings.simulator_redis_url, decode_responses=True)
    await redis_client.ping()
    repo = MongoSimulatorRepository(get_simulator_db())
    repo.ensure_indexes()
    feeds = [asyncio.create_task(pump_provider_events(redis_client, repo, provider)) for provider in ("alpaca_iex", "coinbase")]
    try:
        while True:
            advance_sessions(repo)
            await publish_outbox(redis_client, repo)
            await consume_market_events(redis_client, repo)
            await asyncio.sleep(0.9)
    finally:
        for feed in feeds:
            feed.cancel()
        await asyncio.gather(*feeds, return_exceptions=True)
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(run())
