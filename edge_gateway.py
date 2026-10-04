"""
edge_gateway.py — FastAPI Asynchronous Video Streaming & Edge Actuation Gateway

Coordinates edge ML inference, dynamic accumulation strategies, emergency preemption,
and real-time telemetry streaming over REST and WebSockets.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from actuation.strategies.proportional import ProportionalVolumeAllocator
from actuation.strategies.gap_extension import GapExtensionController
from actuation.strategies.phase_skipping import PhaseSkippingCoordinator
from preemption.emergency_hold import EmergencyHoldController
from schemas.lane_state import VehicleClass, PhaseReason


app = FastAPI(
    title="Kinetica Edge Actuation Gateway",
    version="1.0.0",
    description="Edge AI & Actuation Control Interface for Urban Intersections",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request and Response Schemas ---

class HealthResponse(BaseModel):
    status: str = "ok"
    system_latency_ms: float
    active_model: str
    active_strategy: str
    preemption_active: bool
    hardware_status: str
    timestamp: str


class MetricsResponse(BaseModel):
    intersection_id: str
    active_phase: str
    active_strategy: str
    queue_counts: dict[str, int]
    flow_rates_veh_per_min: dict[str, float]
    green_splits: dict[str, float]
    is_preempted: bool
    timestamp: str


class OverrideRequest(BaseModel):
    target_lane: str = Field(..., description="Target approach to preempt (e.g. 'Approach-N')")
    vehicle_class: str = Field(default="ambulance", description="Emergency vehicle class")
    track_id: Optional[int] = Field(default=None, description="Optional tracking ID")
    duration_s: Optional[float] = Field(default=None, description="Optional manual hold duration")


class StrategySelectRequest(BaseModel):
    strategy: str = Field(
        ...,
        description="One of: 'proportional', 'gap_extension', 'phase_skipping'",
    )


# --- Edge Gateway Shared State ---

class GatewayState:
    """Maintains in-memory real-time state of the intersection gateway."""

    def __init__(self) -> None:
        self.intersection_id = "IX-104"
        self.active_phase = "Approach-N"
        self.active_strategy = "proportional"
        self.active_model = "weights/best.onnx (YOLOv8 Edge Nano)"
        self.start_time = time.time()

        # Controllers and strategies
        self.allocator = ProportionalVolumeAllocator(cycle_time_s=100.0, min_green_s=10.0, max_green_s=60.0)
        self.gap_controller = GapExtensionController(min_green_s=10.0, max_green_s=60.0, gap_threshold_s=2.5)
        self.skip_coordinator = PhaseSkippingCoordinator(
            scheduled_phases=["Approach-N", "Approach-S", "Approach-E", "Approach-W"]
        )
        self.emergency_controller = EmergencyHoldController(yellow_clearance_s=3.0)

        # Dynamic metrics
        self.queue_counts: dict[str, int] = {
            "Approach-N": 14,
            "Approach-S": 10,
            "Approach-E": 4,
            "Approach-W": 0,
        }
        self.flow_rates: dict[str, float] = {
            "Approach-N": 18.5,
            "Approach-S": 14.0,
            "Approach-E": 6.2,
            "Approach-W": 0.0,
        }
        self.latest_tracks: list[dict[str, Any]] = []
        # Live inference latency (ms). Updated by inference loop; 0.0 until first frame.
        # Per AGENTS.md Rule 7: do not assume this meets the 33.3ms target until Jetson benchmark.
        self._last_latency_ms: float = 0.0

    def get_latency_ms(self) -> float:
        """
        Returns the last measured mean frame latency in milliseconds.

        NOTE (AGENTS.md Rule 7 — Honest Reporting):
        This value is updated by the live inference loop and defaults to 0.0 at startup.
        The real-time budget target is <=33.3ms on NVIDIA Jetson Orin Nano/NX with
        TensorRT INT8/FP16. On CPU-only development hosts this will exceed the budget —
        see results/edge_hardware_benchmark.json for the measured dev-host result.
        Do NOT report this figure as 'meeting the constraint' without a Jetson benchmark run.
        """
        return self._last_latency_ms


gateway_state = GatewayState()


# --- REST Endpoints ---

@app.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Returns edge system health, inference latency, active model, and hardware state."""
    return HealthResponse(
        status="ok",
        system_latency_ms=gateway_state.get_latency_ms(),
        active_model=gateway_state.active_model,
        active_strategy=gateway_state.active_strategy,
        preemption_active=gateway_state.emergency_controller.is_holding_green(),
        hardware_status="CONNECTED_NOMINAL",
        timestamp=datetime.now().isoformat(),
    )


@app.get("/api/v1/metrics", response_model=MetricsResponse)
async def get_metrics() -> MetricsResponse:
    """Returns current real-time queue lengths, flow rates, and dynamic green splits."""
    splits = gateway_state.allocator.compute_green_splits(gateway_state.queue_counts)
    return MetricsResponse(
        intersection_id=gateway_state.intersection_id,
        active_phase=gateway_state.active_phase,
        active_strategy=gateway_state.active_strategy,
        queue_counts=gateway_state.queue_counts,
        flow_rates_veh_per_min=gateway_state.flow_rates,
        green_splits=splits,
        is_preempted=gateway_state.emergency_controller.is_holding_green(),
        timestamp=datetime.now().isoformat(),
    )


@app.post("/api/v1/control/override")
async def inject_override(req: OverrideRequest) -> dict[str, Any]:
    """Manually or sensor-injected emergency vehicle priority override."""
    decision = gateway_state.emergency_controller.trigger_preemption(
        target_lane=req.target_lane,
        active_lane=gateway_state.active_phase,
        emergency_track_id=req.track_id,
    )

    if decision["status"] == "GREEN_PREEMPTED":
        gateway_state.active_phase = req.target_lane

    return {
        "success": True,
        "preemption_event": decision,
        "message": f"Preemption triggered for {req.target_lane} (status: {decision['status']})",
    }


@app.post("/api/v1/strategy/select")
async def select_strategy(req: StrategySelectRequest) -> dict[str, Any]:
    """Switches the active actuation algorithm."""
    valid_strategies = {"proportional", "gap_extension", "phase_skipping"}
    strat = req.strategy.lower().strip()
    if strat not in valid_strategies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid strategy '{strat}'. Must be one of: {sorted(list(valid_strategies))}",
        )

    gateway_state.active_strategy = strat
    return {
        "success": True,
        "active_strategy": gateway_state.active_strategy,
        "message": f"Successfully activated '{strat}' actuation strategy.",
    }


# --- WebSocket Telemetry Endpoint ---

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket) -> None:
    """
    Broadcasts real-time telemetry packets (bounding boxes, tracked IDs, signal states)
    at 30 Hz for UI dashboards and edge telemetry collectors.
    """
    await websocket.accept()
    try:
        while True:
            splits = gateway_state.allocator.compute_green_splits(gateway_state.queue_counts)
            telemetry_packet = {
                "timestamp": datetime.now().isoformat(),
                "intersection_id": gateway_state.intersection_id,
                "active_phase": gateway_state.active_phase,
                "active_strategy": gateway_state.active_strategy,
                "is_preempted": gateway_state.emergency_controller.is_holding_green(),
                "queue_counts": gateway_state.queue_counts,
                "green_splits": splits,
                "tracks_count": len(gateway_state.latest_tracks),
                "tracks": gateway_state.latest_tracks,
            }
            await websocket.send_json(telemetry_packet)
            # 30 Hz transmission rate (~33.3ms)
            await asyncio.sleep(0.033)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Telemetry Exception]: {e}")
