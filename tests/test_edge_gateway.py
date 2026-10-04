"""
tests/test_edge_gateway.py — Tests for FastAPI Edge Actuation Gateway
"""

import pytest
from fastapi.testclient import TestClient
from edge_gateway import app, gateway_state


@pytest.fixture
def client():
    # Reset gateway state for clean test run
    gateway_state.active_phase = "Approach-N"
    gateway_state.active_strategy = "proportional"
    gateway_state.emergency_controller.reset()
    return TestClient(app)


def test_get_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "system_latency_ms" in data
    assert data["system_latency_ms"] <= 33.3 # Under 33ms budget
    assert "active_model" in data
    assert data["active_strategy"] == "proportional"
    assert data["hardware_status"] == "CONNECTED_NOMINAL"


def test_get_metrics_endpoint(client):
    response = client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()

    assert data["intersection_id"] == "IX-104"
    assert data["active_phase"] == "Approach-N"
    assert "queue_counts" in data
    assert "green_splits" in data
    assert data["queue_counts"]["Approach-N"] >= 0


def test_inject_override_conflicting_approach(client):
    # Active phase is Approach-N; inject override for conflicting Approach-E
    payload = {
        "target_lane": "Approach-E",
        "vehicle_class": "ambulance",
        "track_id": 999,
    }
    response = client.post("/api/v1/control/override", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    event = data["preemption_event"]
    assert event["status"] == "YELLOW_CLEARANCE"
    assert event["yellow_duration_s"] == 3.0
    assert event["active_lane"] == "Approach-N"


def test_select_strategy_valid_and_invalid(client):
    # 1. Switch to gap_extension
    res1 = client.post("/api/v1/strategy/select", json={"strategy": "gap_extension"})
    assert res1.status_code == 200
    assert res1.json()["active_strategy"] == "gap_extension"

    # 2. Switch to phase_skipping
    res2 = client.post("/api/v1/strategy/select", json={"strategy": "phase_skipping"})
    assert res2.status_code == 200
    assert res2.json()["active_strategy"] == "phase_skipping"

    # 3. Invalid strategy -> 400 Bad Request
    res3 = client.post("/api/v1/strategy/select", json={"strategy": "invalid_magic_strategy"})
    assert res3.status_code == 400
    assert "Invalid strategy" in res3.json()["detail"]


def test_websocket_telemetry_broadcast(client):
    with client.websocket_connect("/ws/telemetry") as websocket:
        data = websocket.receive_json()
        assert "timestamp" in data
        assert data["intersection_id"] == "IX-104"
        assert "active_phase" in data
        assert "queue_counts" in data
        assert "green_splits" in data
        assert isinstance(data["tracks"], list)
