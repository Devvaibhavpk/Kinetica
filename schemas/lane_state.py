from pydantic import BaseModel
from enum import Enum
from datetime import datetime

class VehicleClass(str, Enum):
    STANDARD = "standard"
    TWO_WHEELER = "two_wheeler"
    AMBULANCE = "ambulance"
    POLICE = "police"
    SCHOOL_VAN = "school_van"

class LaneObservation(BaseModel):
    lane_id: str
    timestamp: datetime
    vehicle_count: int
    queue_length_m: float
    density_veh_per_m: float
    class_counts: dict[VehicleClass, int]
    is_school_zone: bool = False

class PriorityEvent(BaseModel):
    lane_id: str
    vehicle_class: VehicleClass
    detected_at: datetime
    confidence: float

class PhaseReason(str, Enum):
    SCHEDULED = "scheduled"
    EXTENDED = "extended"
    PREEMPTED = "preempted"

class PhaseDecision(BaseModel):
    intersection_id: str
    active_lane_id: str
    phase_start: datetime
    phase_end: datetime
    reason: PhaseReason
