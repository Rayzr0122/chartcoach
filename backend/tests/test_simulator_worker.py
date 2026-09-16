from datetime import datetime, timezone

import mongomock

from app.workers.simulator_worker import advance_delayed_sessions


def test_delayed_worker_advances_persistent_session_and_emits_sequence_event():
    db = mongomock.MongoClient().chartcoach
    db.simulator_sessions.insert_one({"id": "sim-1", "learner_id": "learner-1", "mode": "delayed", "state": "paused", "clock": 10, "revision": 2, "last_tick_at": "2026-09-16T07:00:00+00:00"})

    changed = advance_delayed_sessions(db, datetime(2026, 9, 16, 7, 2, tzinfo=timezone.utc))

    assert changed == 1
    assert db.simulator_sessions.find_one({"id": "sim-1"})["clock"] == 11
    assert db.simulator_events.find_one({"session_id": "sim-1"})["type"] == "clock.advanced"
