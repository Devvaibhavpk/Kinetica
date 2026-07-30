from datetime import datetime
from schemas.lane_state import LaneObservation

def generate_scenario(
    scenario_name: str,
    duration_s: int,
    lanes: list[str],
    ambulance_injection_time_s: int | None = None,
    ambulance_lane: str | None = None,
) -> list[LaneObservation]:
    """
    Yields a scripted LaneObservation stream: baseline Poisson arrivals
    per lane, with an optional single PriorityEvent injected at a fixed time.
    """
    # TODO: Implement synthetic generation logic in Phase 2
    pass
