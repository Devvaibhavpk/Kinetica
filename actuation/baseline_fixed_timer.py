"""Baseline Fixed-Timer Traffic Signal Controller.

Implements a naive, non-adaptive fixed-timer signal controller that rotates
through predefined lanes on a static round-robin schedule, ignoring all
real-time observation data.

Role in Kinetica:
    This controller serves as the **experimental control baseline** for Phase 5
    comparative hypothesis testing. By running identical synthetic scenarios through
    both this controller and actuation.engine.next_phase_decision, Phase 5 generates
    the paired wait-time distributions required for SC4 (Mann-Whitney U / t-test).

Design intent:
    Intentionally simple — any complexity here would contaminate the comparison.
    It must faithfully represent what a real fixed-timer city controller does:
    cycle blindly through lanes at a fixed interval regardless of demand.
"""

from datetime import datetime, timedelta
from typing import List, Union

from schemas.lane_state import PhaseDecision, PhaseReason

# Fixed cycle parameters — deliberately not tuned to any observed traffic pattern
DEFAULT_CYCLE_SPLIT_S: float = 90.0
DEFAULT_LANES: List[str] = ["lane_N", "lane_E", "lane_S", "lane_W"]


def fixed_timer_phase_decision(
    current_time: Union[float, datetime],
    lanes: List[str] = DEFAULT_LANES,
    split_seconds: float = DEFAULT_CYCLE_SPLIT_S,
    intersection_id: str = "INT-01",
) -> PhaseDecision:
    """Issue a PhaseDecision driven purely by a static round-robin cycle.

    Computes the active lane by partitioning the continuous epoch timeline into
    equal `split_seconds` slots and cycling through `lanes` in order:

        cycle_index = floor(epoch_s / split_seconds) mod len(lanes)

    No camera data, queue measurements, or arrival rates are consulted.
    Every returned PhaseDecision carries reason=PhaseReason.SCHEDULED.

    Args:
        current_time:   Current simulation or wall-clock time. Accepts float epoch
                        seconds or a datetime object.
        lanes:          Ordered list of lane IDs to cycle through. Defaults to
                        ['lane_N', 'lane_E', 'lane_S', 'lane_W'].
        split_seconds:  Fixed green phase duration per lane in seconds. Default: 90.0s.
        intersection_id: Logical identifier of the managed intersection. Default: 'INT-01'.

    Returns:
        PhaseDecision: Static decision with phase duration=split_seconds and
                       reason=PhaseReason.SCHEDULED.

    Raises:
        ValueError: If lanes is empty or split_seconds <= 0.
    """
    if not lanes:
        raise ValueError("lanes must be a non-empty list.")
    if split_seconds <= 0.0:
        raise ValueError(f"split_seconds must be positive, got {split_seconds}")

    if isinstance(current_time, (int, float)):
        start_dt: datetime = datetime.fromtimestamp(current_time)
        epoch_s: float = float(current_time)
    else:
        start_dt = current_time
        epoch_s = current_time.timestamp()

    cycle_index: int = int((epoch_s // split_seconds) % len(lanes))
    active_lane: str = lanes[cycle_index]

    return PhaseDecision(
        intersection_id=intersection_id,
        active_lane_id=active_lane,
        phase_start=start_dt,
        phase_end=start_dt + timedelta(seconds=split_seconds),
        reason=PhaseReason.SCHEDULED,
    )
