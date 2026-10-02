"""Emergency Vehicle Override Priority Multipliers and Rules.

Defines vehicle-class priority scaling factors and rule-based escalation
logic for emergency responders (ambulances, police) and vulnerable road users
(school vans operating in designated school zones).
"""

from typing import Dict

from schemas.lane_state import PriorityEvent, VehicleClass

__all__ = [
    "PRIORITY_MULTIPLIERS",
    "SCHOOL_ZONE_ESCALATION",
    "apply_override",
]

# Baseline urgency multipliers per vehicle class
PRIORITY_MULTIPLIERS: Dict[VehicleClass, float] = {
    VehicleClass.AMBULANCE: 1000.0,
    VehicleClass.POLICE: 1000.0,
    VehicleClass.STANDARD: 1.0,
    VehicleClass.TWO_WHEELER: 1.0,
    VehicleClass.SCHOOL_VAN: 1.0,
}

# Escalation factor for school transport vehicles inside active school zones
SCHOOL_ZONE_ESCALATION: float = 50.0


def apply_override(event: PriorityEvent, is_school_zone: bool = False) -> float:
    """Determine the effective priority multiplier for an incoming PriorityEvent.

    Applies emergency preemption rules:
    - AMBULANCE and POLICE receive immediate 1000x priority override.
    - SCHOOL_VAN receives 50x escalation if detected in a designated school zone,
      or baseline 1x priority outside school zones.
    - STANDARD and TWO_WHEELER receive baseline 1x priority.

    Args:
        event: Incoming PriorityEvent carrying vehicle classification and detection telemetry.
        is_school_zone: Boolean flag indicating if the detection occurred in a school zone.

    Returns:
        float: Calculated priority multiplier to feed into LanePriorityHeap.compute_score.
    """
    if event.vehicle_class == VehicleClass.SCHOOL_VAN and is_school_zone:
        return SCHOOL_ZONE_ESCALATION

    return PRIORITY_MULTIPLIERS.get(event.vehicle_class, 1.0)
