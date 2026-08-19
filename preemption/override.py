from schemas.lane_state import PriorityEvent, VehicleClass

PRIORITY_MULTIPLIERS = {
    VehicleClass.AMBULANCE: 1000.0,
    VehicleClass.POLICE: 1000.0,
    VehicleClass.SCHOOL_VAN: 1.0,
    VehicleClass.STANDARD: 1.0,
    VehicleClass.TWO_WHEELER: 1.0,
}

SCHOOL_ZONE_ESCALATION = 50.0

def apply_override(event: PriorityEvent, is_school_zone: bool = False) -> float:
    """
    Returns numerical priority multiplier for a given priority event.
    Escalates SCHOOL_VAN multiplier if detected within a school zone.
    """
    if event.vehicle_class == VehicleClass.SCHOOL_VAN and is_school_zone:
        return SCHOOL_ZONE_ESCALATION
    return PRIORITY_MULTIPLIERS.get(event.vehicle_class, 1.0)
