"""Persistent delayed-clock worker.

Run with ``python -m app.workers.simulator_worker``. The worker only advances
server-owned clocks; execution adapters consume the resulting event stream.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import redis.asyncio as redis

from app.config import settings
from app.database import db
from app.api.simulator import _emit_event


def advance_delayed_sessions(database, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    changed = 0
    for session in database.simulator_sessions.find({"mode": "delayed", "state": {"$in": ["playing", "paused"]}}):
        last_tick = session.get("last_tick_at")
        if last_tick:
            try:
                elapsed = (now - datetime.fromisoformat(last_tick)).total_seconds()
            except ValueError:
                elapsed = 60
            if elapsed < 60:
                continue
        session["clock"] += 1
        session["last_tick_at"] = now.isoformat()
        session["revision"] += 1
        database.simulator_sessions.replace_one({"id": session["id"], "revision": session["revision"] - 1}, session)
        _emit_event(database, session["id"], "clock.advanced", {"revision": session["revision"], "clock": session["clock"], "market_timestamp": now.isoformat()})
        changed += 1
    return changed


async def run() -> None:
    client = redis.from_url(settings.simulator_redis_url, decode_responses=True)
    await client.ping()
    try:
        while True:
            advance_delayed_sessions(db)
            await asyncio.sleep(1)
    finally:
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(run())
