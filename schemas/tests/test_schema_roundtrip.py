from datetime import datetime, timezone
import json
from schemas.lane_state import (
    VehicleClass,
    LaneObservation,
    PriorityEvent,
    PhaseReason,
    PhaseDecision
)

def test_lane_observation_roundtrip():
    original = LaneObservation(
        lane_id="lane_1",
        timestamp=datetime.now(timezone.utc),
        vehicle_count=10,
        queue_length_m=45.5,
        density_veh_per_m=0.22,
        class_counts={
            VehicleClass.STANDARD: 8,
            VehicleClass.TWO_WHEELER: 2
        },
        is_school_zone=True
    )
    
    serialized = original.model_dump_json()
    deserialized = LaneObservation.model_validate_json(serialized)
    assert original == deserialized

def test_priority_event_roundtrip():
    original = PriorityEvent(
        lane_id="lane_1",
        vehicle_class=VehicleClass.AMBULANCE,
        detected_at=datetime.now(timezone.utc),
        confidence=0.98
    )
    
    serialized = original.model_dump_json()
    deserialized = PriorityEvent.model_validate_json(serialized)
    assert original == deserialized

def test_phase_decision_roundtrip():
    original = PhaseDecision(
        intersection_id="ix_104",
        active_lane_id="lane_1",
        phase_start=datetime.now(timezone.utc),
        phase_end=datetime.now(timezone.utc),
        reason=PhaseReason.PREEMPTED
    )
    
    serialized = original.model_dump_json()
    deserialized = PhaseDecision.model_validate_json(serialized)
    assert original == deserialized
