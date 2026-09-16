import mongomock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import simulator
from app.core.security import create_access_token
from app.database import get_db


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
