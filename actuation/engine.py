from datetime import datetime, timedelta, timezone
from schemas.lane_state import LaneObservation, PhaseDecision, PhaseReason

DEFAULT_SATURATION_FLOW_RATE = 1900
# Phase 5 refinement: replace with observed value from vision departure-count stream

def compute_green_extension(queue_length_m: float) -> float:
    """
    Computes required green light extension time in seconds based on queue length in meters
    and saturation flow rate.
    """
    if queue_length_m <= 0:
        return 5.0
    # Assume 5 meters per vehicle
    num_vehicles = queue_length_m / 5.0
    # Saturation flow rate is 1900 veh/hr/lane => 1900 / 3600 veh/sec
    discharge_rate_per_sec = DEFAULT_SATURATION_FLOW_RATE / 3600.0
    clearance_time = num_vehicles / discharge_rate_per_sec
    # Bound between 5 and 60 seconds
    return min(60.0, max(5.0, clearance_time))

def next_phase_decision(current_time: float | datetime, obs: LaneObservation) -> PhaseDecision:
    if isinstance(current_time, (int, float)):
        dt_start = datetime.fromtimestamp(current_time, tz=timezone.utc)
    else:
        dt_start = current_time

    ext_seconds = compute_green_extension(obs.queue_length_m)
    dt_end = dt_start + timedelta(seconds=ext_seconds)

    return PhaseDecision(
        intersection_id="IX-01",
        active_lane_id=obs.lane_id,
        phase_start=dt_start,
        phase_end=dt_end,
        reason=PhaseReason.EXTENDED
    )
