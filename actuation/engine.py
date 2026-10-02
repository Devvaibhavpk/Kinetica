"""Signal Actuation Engine for Project Kinetica.

Dynamically computes green phase durations and issues PhaseDecisions based on
real-time queue length observations and Webster's saturation flow kinematics.
Replaces fixed-timer cycles with demand-responsive traffic signal control.

Includes dynamic phase termination (gap-out) logic that prematurely ends a
green phase when the queue dissipates, freeing cross-street capacity immediately.

AGENTS.md Rule 7 compliance:
    DEFAULT_SATURATION_FLOW_RATE is explicitly a literature default (Webster 1958,
    HCM 2016: 1800–2000 veh/hr/lane). Phase 5 must replace it with an observed
    departure-count value from the vision pipeline before reporting it as measured.
"""

from datetime import datetime, timedelta
from typing import Union

from schemas.lane_state import LaneObservation, PhaseDecision, PhaseReason

# ---------------------------------------------------------------------------
# Literature default — explicitly NOT a measured value (AGENTS.md Rule 7)
# Range from Webster (1958) / Highway Capacity Manual (HCM 2016): 1800–2000 veh/hr/lane
# ---------------------------------------------------------------------------
DEFAULT_SATURATION_FLOW_RATE: int = 1900
# Phase 5 refinement: replace with observed value from vision departure-count stream

# ---------------------------------------------------------------------------
# Kinematic constants
# ---------------------------------------------------------------------------
AVERAGE_VEHICLE_SPACING_M: float = 7.0
# Average stop-to-stop vehicle length (4.5 m) + clearance gap (2.5 m), HCM standard

START_UP_LOST_TIME_S: float = 2.0
# Driver perception-reaction delay at green onset (HCM 2016, §19)

MIN_BASE_GREEN_S: float = 10.0
# Absolute minimum green to allow pedestrian clearance and prevent phase chatter

MAX_GREEN_EXTENSION_S: float = 60.0
# Upper bound: prevents indefinite green causing cross-street starvation

# ---------------------------------------------------------------------------
# Gap-out / Dynamic phase termination constants
# ---------------------------------------------------------------------------
DENSITY_GAP_OUT_THRESHOLD: float = 0.02
# Critical approaching density (veh/m) below which the lane is deemed effectively empty

MIN_SAFETY_GREEN_BEFORE_GAP_S: float = 7.0
# Minimum elapsed green before gap-out may trigger (prevents premature termination
# during the initial queue-discharge surge before vehicles have cleared the stopline)


def compute_green_extension(queue_length_m: float) -> float:
    """Calculate the dynamic green phase extension required to clear a detected queue.

    Uses Webster's kinematic clearance formula derived from saturation flow theory:

        n_veh  = queue_length_m / AVERAGE_VEHICLE_SPACING_M        (vehicles in queue)
        s_sec  = DEFAULT_SATURATION_FLOW_RATE / 3600.0              (veh/s discharge rate)
        T_ext  = START_UP_LOST_TIME_S + (n_veh / s_sec)            (clearance time in s)
        result = clamp(T_ext, 0.0, MAX_GREEN_EXTENSION_S)

    Args:
        queue_length_m: Physical length of the stopped vehicle queue in metres from stopline.
                        A value ≤ 0.0 returns 0.0 (no extension needed).

    Returns:
        float: Required green extension in seconds, rounded to 2 d.p., bounded in
               [0.0, MAX_GREEN_EXTENSION_S].
    """
    if queue_length_m <= 0.0:
        return 0.0

    vehicles_in_queue: float = queue_length_m / AVERAGE_VEHICLE_SPACING_M
    sat_flow_per_sec: float = DEFAULT_SATURATION_FLOW_RATE / 3600.0
    discharge_time: float = START_UP_LOST_TIME_S + (vehicles_in_queue / sat_flow_per_sec)

    return round(float(min(MAX_GREEN_EXTENSION_S, max(0.0, discharge_time))), 2)


def next_phase_decision(
    current_time: Union[float, datetime],
    obs: LaneObservation,
    intersection_id: str = "INT-01",
) -> PhaseDecision:
    """Evaluate the current lane state and issue the next PhaseDecision.

    Delegates to compute_green_extension to determine whether additional green time
    is warranted. Issues reason=EXTENDED when the queue demands clearance time,
    SCHEDULED when the lane is already empty (minimum base green only).

    Args:
        current_time: Phase start time. Accepts float epoch seconds or datetime.
        obs:           Active LaneObservation for the lane being controlled.
        intersection_id: Logical identifier of the intersection being managed.

    Returns:
        PhaseDecision: Fully populated schema object with phase boundaries and reason.
    """
    start_dt: datetime = (
        datetime.fromtimestamp(current_time)
        if isinstance(current_time, (int, float))
        else current_time
    )

    extension: float = compute_green_extension(obs.queue_length_m)

    if extension > 0.0:
        total_duration: float = max(MIN_BASE_GREEN_S, extension)
        reason: PhaseReason = PhaseReason.EXTENDED
    else:
        total_duration = MIN_BASE_GREEN_S
        reason = PhaseReason.SCHEDULED

    return PhaseDecision(
        intersection_id=intersection_id,
        active_lane_id=obs.lane_id,
        phase_start=start_dt,
        phase_end=start_dt + timedelta(seconds=total_duration),
        reason=reason,
    )


def should_terminate_phase_early(
    obs: LaneObservation,
    elapsed_green_s: float,
    min_green_s: float = MIN_SAFETY_GREEN_BEFORE_GAP_S,
    density_threshold: float = DENSITY_GAP_OUT_THRESHOLD,
) -> bool:
    """Determine whether the active green phase should gap out prematurely.

    Sub-phase 3.12 — Dynamic Phase Termination Logic.

    A gap-out is triggered when ALL three conditions hold simultaneously:
        1. elapsed_green_s >= min_green_s  (safety minimum has elapsed)
        2. obs.queue_length_m <= 0 OR obs.vehicle_count == 0  (queue has cleared)
        3. obs.density_veh_per_m < density_threshold          (no vehicles approaching)

    Condition 1 guards against triggering gap-out before the stopped queue has
    had time to begin discharging — the initial discharge surge can momentarily
    suppress density readings even while vehicles are still crossing the stopline.

    Args:
        obs:               Latest LaneObservation for the currently-active green lane.
        elapsed_green_s:   Wall-clock seconds elapsed since this green phase began.
        min_green_s:       Safety threshold before gap-out may fire. Default: 7.0s.
        density_threshold: Density cutoff below which the lane is deemed empty. Default: 0.02 veh/m.

    Returns:
        bool: True if gap-out should be triggered; False otherwise.
    """
    if elapsed_green_s < min_green_s:
        return False

    queue_cleared: bool = (obs.queue_length_m <= 0.0) or (obs.vehicle_count == 0)
    density_depleted: bool = obs.density_veh_per_m < density_threshold

    return queue_cleared and density_depleted


def terminate_phase_early(
    current_decision: PhaseDecision,
    termination_time: datetime,
) -> PhaseDecision:
    """Truncate an ongoing PhaseDecision at the gap-out timestamp.

    Constructs and returns a new PhaseDecision identical to `current_decision`
    except that phase_end is clamped to `termination_time`. All other fields,
    including reason, are preserved to maintain audit trail continuity.

    Args:
        current_decision: The active PhaseDecision being truncated.
        termination_time: The exact instant at which the gap-out was detected.

    Returns:
        PhaseDecision: Revised decision with phase_end = max(phase_start, termination_time).
    """
    effective_end: datetime = max(current_decision.phase_start, termination_time)
    return PhaseDecision(
        intersection_id=current_decision.intersection_id,
        active_lane_id=current_decision.active_lane_id,
        phase_start=current_decision.phase_start,
        phase_end=effective_end,
        reason=current_decision.reason,
    )
