from datetime import datetime, timedelta, timezone
from schemas.lane_state import PhaseDecision, PhaseReason

LANES_CYCLE = ["lane_N", "lane_E", "lane_S", "lane_W"]
CYCLE_DURATION_S = 90.0
PHASE_DURATION_S = 22.5

def fixed_timer_phase_decision(current_time: float | datetime) -> PhaseDecision:
    if isinstance(current_time, (int, float)):
        dt_start = datetime.fromtimestamp(current_time, tz=timezone.utc)
        ts_val = current_time
    else:
        dt_start = current_time
        ts_val = current_time.timestamp()

    cycle_time = ts_val % CYCLE_DURATION_S
    lane_idx = int(cycle_time // PHASE_DURATION_S) % len(LANES_CYCLE)
    active_lane = LANES_CYCLE[lane_idx]

    dt_end = dt_start + timedelta(seconds=PHASE_DURATION_S)

    return PhaseDecision(
        intersection_id="IX-01",
        active_lane_id=active_lane,
        phase_start=dt_start,
        phase_end=dt_end,
        reason=PhaseReason.SCHEDULED
    )
