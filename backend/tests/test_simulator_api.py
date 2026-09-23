from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import simulator
from app.api.deps import get_current_user
from app.config import settings
from app.simulator.repository import InMemorySimulatorRepository
from app.workers.simulator_worker import advance_sessions


def fixture_dataset(instrument_id="NSE:RELIANCE", source="synthetic-test", count=420):
    bars = [{"time": 1_700_000_000 + index * 60, "open": str(100 + index), "high": str(101 + index), "low": str(99 + index), "close": str(100.5 + index), "volume": "1000"} for index in range(count)]
    return {"id": f"dataset-{instrument_id}", "instrument_id": instrument_id, "source": source, "bars": bars, "coverage": {"actual_start": bars[0]["time"], "actual_end": bars[-1]["time"], "test_only": source == "synthetic-test"}}


def client_and_repo():
    repo = InMemorySimulatorRepository()
    user = SimpleNamespace(id="learner-1", email="learner@example.test", subscription_plan="trader", role="student")
    app = FastAPI()
    app.include_router(simulator.router)
    app.include_router(simulator.admin_router)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[simulator.get_simulator_repository] = lambda: repo
    return TestClient(app), repo, user


def test_close_routes_to_positions_instrument_and_never_the_viewed_chart():
    from unittest.mock import Mock
    import pytest
    from fastapi import HTTPException
    user = SimpleNamespace(id="learner-1")
    repo = Mock()
    repo.snapshot.return_value = {"session": {"learner_id": user.id, "account_id": "shared", "instrument_id": "NASDAQ:AAPL"}, "positions": [{"instrument_id": "NASDAQ:NVDA", "quantity": "20"}]}
    repo.list_sessions.return_value = [{"id": "nvda-live", "account_id": "shared", "instrument_id": "NASDAQ:NVDA", "state": "playing", "mode": "stream"}]
    with patch.object(simulator, "create_order", return_value={}) as create:
        simulator.close_position("aapl-live", "NASDAQ:NVDA", simulator.PositionClose(), "close-key", user, repo)
        assert create.call_args.args[0] == "nvda-live"
        assert create.call_args.args[1].reduce_only is True
    repo.list_sessions.return_value = []
    with pytest.raises(HTTPException) as error:
        simulator.close_position("aapl-live", "NASDAQ:NVDA", simulator.PositionClose(), "close-key", user, repo)
    assert error.value.status_code == 409


def test_catalog_has_full_multi_asset_coverage_and_provider_labels():
    client, _, _ = client_and_repo()
    catalog = client.get("/api/v1/simulator/instruments").json()
    assert len(catalog) == 40
    assert next(item for item in catalog if item["id"] == "NASDAQ:AAPL")["replay_source"] == "alpaca_iex"
    assert next(item for item in catalog if item["id"] == "NSE:RELIANCE")["replay_source"] == "synthetic-test"


def test_catalog_and_capabilities_are_server_routed_and_disclose_disabled_data_routes(monkeypatch):
    monkeypatch.setattr(settings, "simulator_alpaca_usage_rights_record_id", "")
    simulator._provider_registry.cache_clear()
    client, _, _ = client_and_repo()

    capabilities = client.get("/api/v1/simulator/capabilities").json()
    catalog = client.get("/api/v1/simulator/instruments").json()

    assert next(item for item in capabilities if item["market"] == "us_equities" and item["mode"] == "stream")["enabled"] is False
    aapl = next(item for item in catalog if item["id"] == "NASDAQ:AAPL")
    assert aapl["market"] == "us_equities"
    assert aapl["supported_modes"] == ["replay"]
    assert aapl["overnight_eligible"] is False
    monkeypatch.undo()
    simulator._provider_registry.cache_clear()


def test_catalog_advertises_an_enabled_alpaca_stream_route(monkeypatch):
    monkeypatch.setattr(settings, "simulator_alpaca_usage_rights_record_id", "local-development-alpaca")
    simulator._provider_registry.cache_clear()
    try:
        client, _, _ = client_and_repo()
        capabilities = client.get("/api/v1/simulator/capabilities").json()
        aapl = next(item for item in client.get("/api/v1/simulator/instruments").json() if item["id"] == "NASDAQ:AAPL")

        assert next(item for item in capabilities if item["market"] == "us_equities" and item["mode"] == "stream")["enabled"] is True
        assert aapl["supported_modes"] == ["replay", "stream"]
        assert aapl["delayed_source"] == "alpaca_iex"
    finally:
        monkeypatch.undo()
        simulator._provider_registry.cache_clear()


def test_live_session_uses_the_stream_engine_and_starts_receiving_events(monkeypatch):
    monkeypatch.setattr(settings, "simulator_alpaca_usage_rights_record_id", "local-development-alpaca")
    simulator._provider_registry.cache_clear()
    client, repo, _ = client_and_repo()
    dataset = fixture_dataset("NASDAQ:AAPL", source="alpaca_iex")
    try:
        with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
            simulator._dataset.cache_clear()
            response = client.post("/api/v1/simulator/sessions", json={"mode": "delayed", "instrument_id": "NASDAQ:AAPL", "history_days": 7}, headers={"Idempotency-Key": "live-session"})

        assert response.status_code == 200
        assert response.json()["mode"] == "stream"
        assert response.json()["state"] == "playing"
        assert response.json()["initial_clock"] == len(dataset["bars"])
        assert response.json()["market_time"] == dataset["bars"][-1]["time"]
        assert repo.get_session(response.json()["id"])["engine_version"] == "quote_trade_v1"
        assert response.json()["data_source"] == "alpaca_iex"
    finally:
        monkeypatch.undo()
        simulator._dataset.cache_clear()
        simulator._provider_registry.cache_clear()


def test_session_uses_a_server_route_and_rejects_unapproved_legacy_provider_selection():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset("NASDAQ:AAPL")
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        routed = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NASDAQ:AAPL"}, headers={"Idempotency-Key": "routed"})
        blocked = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NASDAQ:AAPL", "source": "polygon"}, headers={"Idempotency-Key": "blocked"})

    assert routed.status_code == 200
    assert routed.json()["data_source"] == "synthetic-test"
    assert blocked.status_code == 503
    assert blocked.json()["detail"]["code"] == "MARKET_DATA_UNAVAILABLE"


def test_order_validation_requires_the_price_that_defines_each_order_type():
    client, _, _ = client_and_repo()

    response = client.post("/api/v1/simulator/sessions/anything/orders", json={"side": "buy", "order_type": "limit", "quantity": "1"}, headers={"Idempotency-Key": "invalid"})

    assert response.status_code == 422
    assert "limit_price" in response.text


def test_amending_a_buy_limit_recalculates_its_cash_reservation():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "reservation-session"}).json()
        order = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "limit", "quantity": "1", "limit_price": "100"}, headers={"Idempotency-Key": "reservation-order"}).json()
        client.patch(f"/api/v1/simulator/sessions/{session['id']}/orders/{order['id']}", json={"limit_price": "200"}, headers={"Idempotency-Key": "reservation-amend"})
        state = client.get(f"/api/v1/simulator/sessions/{session['id']}").json()

    assert state["account"]["reserved"] == "200.20"


def test_shortable_us_equity_accepts_an_open_short_with_initial_margin_reserved():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset("NASDAQ:AAPL")
    fx = {**fixture_dataset("FX:USD-INR"), "bars": [{**bar, "open": "1", "high": "1", "low": "1", "close": "1"} for bar in fixture_dataset("FX:USD-INR")["bars"]]}
    with patch.object(simulator, "load_dataset", new=AsyncMock(side_effect=lambda instrument_id, *_: fx if instrument_id.startswith("FX:") else dataset)), patch.object(simulator, "get_dataset", side_effect=lambda dataset_id: fx if "FX" in dataset_id else dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NASDAQ:AAPL"}, headers={"Idempotency-Key": "short-session"}).json()
        response = client.post(
            f"/api/v1/simulator/sessions/{session['id']}/orders",
            json={"side": "sell", "position_effect": "open_short", "order_type": "market", "quantity": "1"},
            headers={"Idempotency-Key": "short-order"},
        )

    assert response.status_code == 200
    assert response.json()["position_effect"] == "open_short"
    assert response.json()["reserved"] == "199.75"


def test_shorting_is_rejected_for_indian_equity_and_capped_for_us_equity():
    client, _, _ = client_and_repo()
    india = fixture_dataset("NSE:RELIANCE")
    us = fixture_dataset("NASDAQ:AAPL")
    fx = {**fixture_dataset("FX:USD-INR"), "bars": [{**bar, "open": "1", "high": "1", "low": "1", "close": "1"} for bar in fixture_dataset("FX:USD-INR")["bars"]]}
    with patch.object(simulator, "load_dataset", new=AsyncMock(side_effect=lambda instrument_id, *_: india if instrument_id.startswith("NSE:") else fx if instrument_id.startswith("FX:") else us)), patch.object(simulator, "get_dataset", side_effect=lambda dataset_id: india if "NSE" in dataset_id else fx if "FX" in dataset_id else us):
        simulator._dataset.cache_clear()
        india_session = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NSE:RELIANCE"}, headers={"Idempotency-Key": "india-short-session"}).json()
        india_short = client.post(f"/api/v1/simulator/sessions/{india_session['id']}/orders", json={"side": "sell", "position_effect": "open_short", "order_type": "market", "quantity": "1"}, headers={"Idempotency-Key": "india-short"})
        us_session = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NASDAQ:AAPL"}, headers={"Idempotency-Key": "us-short-session"}).json()
        us_short = client.post(f"/api/v1/simulator/sessions/{us_session['id']}/orders", json={"side": "sell", "position_effect": "open_short", "order_type": "market", "quantity": "501"}, headers={"Idempotency-Key": "us-short"})

    assert india_short.status_code == 422
    assert india_short.json()["detail"]["code"] == "SHORT_NOT_AVAILABLE"
    assert us_short.status_code == 409
    assert us_short.json()["detail"]["code"] == "SHORT_EXPOSURE_LIMIT"


def test_session_pins_long_dataset_and_hides_future_bars():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        response = client.post("/api/v1/simulator/sessions", json={"mode": "replay", "instrument_id": "NSE:RELIANCE", "history_days": 30}, headers={"Idempotency-Key": "session-1"})
        session = response.json()
        candles = client.get(f"/api/v1/simulator/sessions/{session['id']}/candles?limit=2000").json()
    assert response.status_code == 200
    assert session["total_bars"] == 420
    assert len(candles) == 300
    assert candles[-1]["time"] < dataset["bars"][300]["time"]


def test_market_order_waits_for_next_bar_and_retry_is_idempotent():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-1"}).json()
        headers = {"Idempotency-Key": "order-1"}
        first = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "2", "stop_loss": "350", "take_profit": "500"}, headers=headers)
        retry = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "2", "stop_loss": "350", "take_profit": "500"}, headers=headers)
        before = client.get(f"/api/v1/simulator/sessions/{session['id']}").json()
        stepped = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "step"}, headers={"Idempotency-Key": "step-1"}).json()
    assert first.json() == retry.json()
    assert before["orders"][0]["status"] == "open"
    assert stepped["fills"][0]["price"] == "400.18"
    assert len([order for order in stepped["orders"] if order.get("parent_order_id")]) == 2


def test_replay_supports_requested_speeds_and_forward_seek():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-speed"}).json()
        assert session["speed"] == 5
        for speed in (5, 10, 20, 30):
            response = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "speed", "value": speed}, headers={"Idempotency-Key": f"speed-{speed}"})
            assert response.status_code == 200
            assert response.json()["speed"] == speed
        sought = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "seek", "value": 325}, headers={"Idempotency-Key": "seek-forward"})
    assert sought.status_code == 200
    assert sought.json()["clock"] == 325
    assert sought.json()["state"] == "paused"


def test_play_establishes_a_controller_lease_before_the_worker_can_advance():
    client, repo, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "play-session"}).json()
        response = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "play"}, headers={"Idempotency-Key": "play-now"})

    assert response.status_code == 200
    assert repo.get_session(session["id"])["controller_heartbeat_at"]
    with patch("app.workers.simulator_worker.advance_state") as advance:
        state = repo.snapshot(session["id"])
        advance.return_value = ({**state["session"], "clock": state["session"]["clock"] + 1}, state["account"], [], [], [], [])
        assert advance_sessions(repo, datetime.now(timezone.utc)) == 1


def test_backward_seek_creates_assisted_fork_and_preserves_original():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-fork"}).json()
        client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "1", "stop_loss": "350", "take_profit": "500"}, headers={"Idempotency-Key": "fork-order"})
        client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "seek", "value": 320}, headers={"Idempotency-Key": "seek-ahead"})
        fork = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "seek", "value": 310}, headers={"Idempotency-Key": "seek-back"})
        retry = client.post(f"/api/v1/simulator/sessions/{session['id']}/controls", json={"action": "seek", "value": 310}, headers={"Idempotency-Key": "seek-back"})
        original = client.get(f"/api/v1/simulator/sessions/{session['id']}").json()
    assert fork.status_code == 200
    assert fork.json()["id"] != session["id"]
    assert retry.json()["id"] == fork.json()["id"]
    assert fork.json()["parent_session_id"] == session["id"]
    assert fork.json()["assisted"] is True
    assert fork.json()["clock"] == 310
    assert len(fork.json()["fills"]) == 1
    assert len(fork.json()["positions"]) == 1
    assert [order["status"] for order in fork.json()["orders"]] == ["filled"]
    assert original["clock"] == 320


def test_idempotency_key_conflicts_for_different_payload():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-1"}).json()
        headers = {"Idempotency-Key": "same-key"}
        assert client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "1"}, headers=headers).status_code == 200
        conflict = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "2"}, headers=headers)
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_free_user_can_read_owned_history_but_cannot_create_exposure():
    client, repo, user = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-1"}).json()
        user.subscription_plan = "free"
        assert client.get(f"/api/v1/simulator/sessions/{session['id']}").status_code == 200
        blocked = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "1"}, headers={"Idempotency-Key": "blocked"})
    assert blocked.status_code == 403


def test_journal_and_deterministic_review_are_persisted():
    client, _, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "session-1"}).json()
        client.put(f"/api/v1/simulator/sessions/{session['id']}/journal", json={"plan": "Risk 1%", "reflection": "Waited for setup"}, headers={"Idempotency-Key": "journal-1"})
        review = client.get(f"/api/v1/simulator/sessions/{session['id']}/review").json()
    assert review["dimensions"]["plan_adherence"] == 35
    assert review["dimensions"]["execution_discipline"] == 25


def test_a_profitable_trade_without_its_declared_stop_fails_the_deterministic_review():
    client, repo, _ = client_and_repo()
    dataset = fixture_dataset()
    with patch.object(simulator, "load_dataset", new=AsyncMock(return_value=dataset)), patch.object(simulator, "get_dataset", return_value=dataset):
        simulator._dataset.cache_clear()
        session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers={"Idempotency-Key": "review-session"}).json()
        client.put(f"/api/v1/simulator/sessions/{session['id']}/journal", json={"pre_trade_plan": {"thesis": "Breakout", "entry_condition": "Close above range", "quantity": "1", "stop": "95", "target": "110", "maximum_risk": "10"}, "reflection": "Profitable but unprotected"}, headers={"Idempotency-Key": "review-plan"})
        account_id = repo.get_session(session["id"])["account_id"]
        repo.accounts[account_id]["realized_pnl"] = "10"
        repo.records[(account_id, "orders")] = [{"id": "unprotected", "side": "buy", "position_effect": "open_long", "status": "filled"}]
        repo.records[(account_id, "fills")] = [{"id": "fill-unprotected", "price": "100", "position_effect": "open_long"}]
        review = client.get(f"/api/v1/simulator/sessions/{session['id']}/review").json()

    assert review["passed"] is False
    assert review["evidence"][0]["passed"] is False
