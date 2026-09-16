import mongomock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.api import simulator
from app.core.security import create_access_token
from app.database import get_db
from app.services.polygon_service import PolygonHistoryResponse, TradingViewBarDTO


def test_instrument_catalog_identifies_polygon_delayed_coverage():
    catalog = simulator._instruments()

    aapl = next(item for item in catalog if item["id"] == "NASDAQ:AAPL")
    reliance = next(item for item in catalog if item["id"] == "NSE:RELIANCE")

    assert aapl["replay_source"] == "synthetic-test"
    assert aapl["delayed_source"] == "polygon-delayed"
    assert aapl["polygon_supported"] is True
    assert reliance["delayed_source"] == "synthetic-test"
    assert reliance["polygon_supported"] is False


def test_instrument_catalog_can_load_before_entitlement_is_checked():
    app = FastAPI()
    app.include_router(simulator.router)
    client = TestClient(app)

    response = client.get("/api/v1/simulator/instruments")

    assert response.status_code == 200
    assert any(item["id"] == "NASDAQ:AAPL" for item in response.json())


def test_bootstrap_creates_an_inr_practice_account_for_an_entitled_learner():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)

    response = client.get(
        "/api/v1/simulator/bootstrap",
        headers={"Authorization": f"Bearer {create_access_token('learner@example.test')}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["reporting_currency"] == "INR"
    assert data["equity"] == "1000000.00"
    assert data["modes"] == ["replay", "delayed"]


def test_market_fill_is_visible_in_orders_fills_positions_and_ledger():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}

    session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers=headers).json()
    created = client.post(
        f"/api/v1/simulator/sessions/{session['id']}/orders",
        json={"side": "buy", "order_type": "market", "quantity": "2"},
        headers={**headers, "Idempotency-Key": "market-order-1"},
    )

    assert created.status_code == 200
    assert client.get(f"/api/v1/simulator/sessions/{session['id']}/orders", headers=headers).json()[0]["status"] == "filled"
    assert client.get(f"/api/v1/simulator/sessions/{session['id']}/fills", headers=headers).json()[0]["order_id"] == created.json()["id"]
    position = client.get(f"/api/v1/simulator/sessions/{session['id']}/positions", headers=headers).json()[0]
    assert position["quantity"] == "2"
    assert client.get(f"/api/v1/simulator/sessions/{session['id']}/ledger", headers=headers).json()[0]["order_id"] == created.json()["id"]


def test_delayed_nasdaq_session_exposes_polygon_candles():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}
    polygon_history = PolygonHistoryResponse(
        symbol="AAPL",
        name="Apple Inc.",
        timeframe="1D",
        bars=[
            TradingViewBarDTO(time=1735809300, open=100, high=101, low=99, close=100.5, volume=1000, value=100.5),
            TradingViewBarDTO(time=1735809360, open=100.5, high=102, low=100, close=101.5, volume=1200, value=101.5),
        ],
        current_price=101.5,
        change=1.5,
        change_percent=1.5,
        is_positive=True,
        high_period=102,
        low_period=99,
    )

    with patch.object(simulator.polygon_service, "get_history", new=AsyncMock(return_value=polygon_history)):
        session = client.post("/api/v1/simulator/sessions", json={"mode": "delayed", "instrument_id": "NASDAQ:AAPL"}, headers=headers).json()
        response = client.get(f"/api/v1/simulator/sessions/{session['id']}/candles", headers=headers)

    assert session["data_source"] == "polygon-delayed"
    assert response.status_code == 200
    assert response.json()[-1]["close"] == "101.50"


def test_saved_session_with_internal_account_identifier_can_be_loaded():
    from bson import ObjectId

    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}
    session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers=headers).json()
    internal_id = ObjectId()
    db.simulator_sessions.update_one({"id": session["id"]}, {"$set": {"account._id": internal_id}})

    response = client.get(f"/api/v1/simulator/sessions/{session['id']}", headers=headers)

    assert response.status_code == 200
    assert "_id" not in response.json()["account"]
    assert response.json()["account"]["cash"] == session["account"]["cash"]
    assert db.simulator_sessions.find_one({"id": session["id"]})["account"]["_id"] == internal_id


def test_idempotency_key_cannot_be_reused_for_a_different_order_payload():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}", "Idempotency-Key": "same-key"}
    session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers=headers).json()

    assert client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "1"}, headers=headers).status_code == 200
    conflict = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "2"}, headers=headers)

    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_only_admin_can_publish_a_drill_that_learners_can_discover():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_many([
        {"_id": "admin-1", "email": "admin@example.test", "full_name": "Admin", "hashed_password": "x", "role": "admin", "subscription_plan": "elite", "is_active": True},
        {"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True},
    ])
    app = FastAPI()
    app.include_router(simulator.router)
    app.include_router(simulator.admin_router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    admin_headers = {"Authorization": f"Bearer {create_access_token('admin@example.test')}"}
    learner_headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}
    draft = {"title": "Stop placement", "title_hi": "स्टॉप प्लेसमेंट", "instrument_id": "NSE:RELIANCE", "objective": "Place a protective stop.", "required": True}

    assert client.post("/api/v1/admin/simulator/drills", json=draft, headers=learner_headers).status_code == 403
    published = client.post("/api/v1/admin/simulator/drills", json=draft, headers=admin_headers)

    assert published.status_code == 200
    assert published.json()["state"] == "published"
    assert any(drill["title"] == "Stop placement" for drill in client.get("/api/v1/simulator/drills", headers=learner_headers).json())


def test_open_limit_order_can_be_amended_and_cancelled():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}
    session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers=headers).json()
    order = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "limit", "quantity": "1", "limit_price": "100"}, headers={**headers, "Idempotency-Key": "limit-create"}).json()

    amended = client.patch(f"/api/v1/simulator/sessions/{session['id']}/orders/{order['id']}", json={"limit_price": "90"}, headers={**headers, "Idempotency-Key": "limit-amend"})
    cancelled = client.post(f"/api/v1/simulator/sessions/{session['id']}/orders/{order['id']}/cancel", headers={**headers, "Idempotency-Key": "limit-cancel"})

    assert amended.status_code == 200
    assert amended.json()["price"] == "90.00"
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_close_position_is_reduce_only_and_cannot_reverse_exposure():
    db = mongomock.MongoClient().chartcoach
    db.users.insert_one({"_id": "learner-1", "email": "learner@example.test", "full_name": "Learner", "hashed_password": "x", "subscription_plan": "trader", "is_active": True})
    app = FastAPI()
    app.include_router(simulator.router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {create_access_token('learner@example.test')}"}
    session = client.post("/api/v1/simulator/sessions", json={"mode": "replay"}, headers=headers).json()
    client.post(f"/api/v1/simulator/sessions/{session['id']}/orders", json={"side": "buy", "order_type": "market", "quantity": "2"}, headers={**headers, "Idempotency-Key": "open-position"})

    closed = client.post(f"/api/v1/simulator/sessions/{session['id']}/positions/NSE:RELIANCE/close", json={"quantity": "5"}, headers={**headers, "Idempotency-Key": "close-position"})

    assert closed.status_code == 200
    assert closed.json()["reduce_only"] is True
    assert client.get(f"/api/v1/simulator/sessions/{session['id']}/positions", headers=headers).json() == []
