import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.simulator.repository import InMemorySimulatorRepository
from app.simulator.market_data import MarketEvent
from app.services.simulator_data import DatasetError
from app.workers.simulator_worker import advance_sessions, process_market_event, publish_outbox
from decimal import Decimal


def seed(repo, mode="replay", heartbeat=None):
    repo.create_account({"id": "a1", "learner_id": "u1", "cash": "1000", "equity": "1000", "buying_power": "1000", "reserved": "0", "realized_pnl": "0", "unrealized_pnl": "0", "revision": 1})
    repo.create_session({"id": "s1", "learner_id": "u1", "account_id": "a1", "mode": mode, "state": "playing", "speed": 1, "clock": 1, "revision": 1, "dataset_id": "d1", "instrument_id": "NSE:RELIANCE", "controller_heartbeat_at": heartbeat})


def test_worker_advances_replay_and_processes_next_bar():
    repo = InMemorySimulatorRepository()
    now = datetime.now(timezone.utc)
    seed(repo, heartbeat=now.isoformat())
    with patch("app.workers.simulator_worker.advance_state") as advance:
        current = repo.snapshot("s1")
        advance.return_value = ({**current["session"], "clock": 2}, current["account"], [], [], [], [])
        changed = advance_sessions(repo, now)
    assert changed == 1
    assert repo.snapshot("s1")["session"]["clock"] == 2
    assert repo.outbox[0]["type"] == "clock.advanced"


def test_worker_pauses_replay_when_controller_lease_expires():
    repo = InMemorySimulatorRepository()
    now = datetime.now(timezone.utc)
    seed(repo, heartbeat=(now - timedelta(seconds=20)).isoformat())
    assert advance_sessions(repo, now) == 1
    assert repo.snapshot("s1")["session"]["state"] == "paused"


def test_worker_does_not_advance_live_streams_with_historical_bars():
    repo = InMemorySimulatorRepository()
    seed(repo, mode="stream")
    current = repo.snapshot("s1")
    with patch("app.workers.simulator_worker.advance_state", return_value=({**current["session"], "clock": 2}, current["account"], [], [], [], [])) as advance:
        assert advance_sessions(repo, datetime.now(timezone.utc)) == 0
    advance.assert_not_called()


def test_worker_pauses_an_old_session_with_a_missing_dataset_without_stopping_other_work():
    repo = InMemorySimulatorRepository()
    seed(repo, mode="delayed")
    with patch("app.workers.simulator_worker.advance_state", side_effect=DatasetError("DATASET_NOT_FOUND", "Dataset was not found")):
        assert advance_sessions(repo, datetime.now(timezone.utc)) == 1

    session = repo.snapshot("s1")["session"]
    assert session["state"] == "paused"
    assert session["data_status"] == "dataset_unavailable"


def test_worker_applies_a_quote_once_to_its_matching_live_session():
    repo = InMemorySimulatorRepository()
    seed(repo, mode="stream")
    repo.sessions["s1"]["instrument_id"] = "NASDAQ:AAPL"
    repo.records[("a1", "orders")] = [{"id": "o1", "instrument_id": "NASDAQ:AAPL", "side": "buy", "order_type": "market", "quantity": "1", "reserved": "101", "status": "open", "submitted_clock": 0}]
    event = MarketEvent.quote(source="fixture", event_id="q1", instrument_id="NASDAQ:AAPL", venue="IEX", exchange_time=100, received_time=101, bid=Decimal("100"), ask=Decimal("101"), bid_size=Decimal("2"), ask_size=Decimal("2"))
    assert process_market_event(repo, event) == 1
    assert process_market_event(repo, event) == 0
    assert repo.snapshot("s1")["fills"][0]["source_event_id"] == "q1"


def test_worker_applies_a_shortable_us_equity_quote_with_the_same_margin_engine():
    repo = InMemorySimulatorRepository()
    seed(repo, mode="stream")
    repo.sessions["s1"]["instrument_id"] = "NASDAQ:AAPL"
    repo.records[("a1", "orders")] = [{"id": "short", "instrument_id": "NASDAQ:AAPL", "side": "sell", "position_effect": "open_short", "order_type": "market", "quantity": "1", "reserved": "50", "status": "open", "submitted_clock": 0}]
    event = MarketEvent.quote(source="fixture", event_id="q-short", instrument_id="NASDAQ:AAPL", venue="IEX", exchange_time=100, received_time=101, bid=Decimal("100"), ask=Decimal("101"), bid_size=Decimal("2"), ask_size=Decimal("2"))

    assert process_market_event(repo, event) == 1
    state = repo.snapshot("s1")
    assert state["positions"][0]["quantity"] == "-1"
    assert state["account"]["reserved"] == "50.00"


def test_worker_publishes_committed_outbox_events_once():
    class Redis:
        events = []
        async def xadd(self, _stream, fields, **_kwargs):
            self.events.append(fields)
            return "1-0"

    repo = InMemorySimulatorRepository()
    repo.create_account({"id": "a1", "learner_id": "u1", "cash": "1"})
    repo.create_session({"id": "s1", "learner_id": "u1", "account_id": "a1", "revision": 1})
    repo.mutate("s1", "event", "event", lambda state: ({"ok": True}, {"events": [{"id": "e1", "type": "session.updated"}]}))
    client = Redis()
    assert asyncio.run(publish_outbox(client, repo)) == 1
    assert asyncio.run(publish_outbox(client, repo)) == 0
    assert len(client.events) == 1
