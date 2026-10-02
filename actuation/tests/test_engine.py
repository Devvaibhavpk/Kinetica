"""Tests for Actuation Engine — Success Criterion 1 (SC1) validation gate.

Covers build-spec.md §§ 3.13–3.15:
    - test_green_duration_scales_with_queue: SC1 formal gate
    - test_green_extension_physical_bounds: sanity checks on kinematic formula
    - test_next_phase_decision_extended: integration of engine with LaneObservation
    - test_next_phase_decision_empty_lane: validates SCHEDULED reason for empty lanes
    - test_next_phase_decision_output_schema: proves PhaseDecision schema compliance
    - test_baseline_fixed_timer_reason_and_duration: validates baseline 90s cycle
    - test_baseline_fixed_timer_round_robin: validates lane cycling behaviour
    - test_baseline_fixed_timer_guards: validates ValueError guards
    - test_saturation_flow_rate_constant: traceability compliance check
"""

from datetime import datetime, timedelta
import pytest

from actuation.baseline_fixed_timer import fixed_timer_phase_decision
from actuation.engine import (
    DEFAULT_SATURATION_FLOW_RATE,
    MAX_GREEN_EXTENSION_S,
    MIN_BASE_GREEN_S,
    compute_green_extension,
    next_phase_decision,
)
from schemas.lane_state import LaneObservation, PhaseDecision, PhaseReason, VehicleClass


# ---------------------------------------------------------------------------
# Helper factory
# ---------------------------------------------------------------------------

def _make_obs(
    lane_id: str = "lane_N",
    queue_length_m: float = 0.0,
    vehicle_count: int = 0,
    density_veh_per_m: float = 0.0,
) -> LaneObservation:
    return LaneObservation(
        lane_id=lane_id,
        timestamp=datetime.now(),
        vehicle_count=vehicle_count,
        queue_length_m=queue_length_m,
        density_veh_per_m=density_veh_per_m,
        class_counts={VehicleClass.STANDARD: vehicle_count},
    )


# ---------------------------------------------------------------------------
# SC1 — Success Criterion 1 formal validation gate
# ---------------------------------------------------------------------------

def test_green_duration_scales_with_queue():
    """SC1 Validation Gate.

    Test ID: actuation/tests/test_engine.py::test_green_duration_scales_with_queue
    build-spec.md § 3.14

    Asserts that compute_green_extension produces strictly monotonically increasing
    durations for progressively larger queue lengths. This is the exact test whose
    PASS flips the SC1 checkbox in success_criteria.md.
    """
    # Zero queue → zero extension (lane already empty)
    assert compute_green_extension(0.0) == 0.0
    assert compute_green_extension(-10.0) == 0.0  # Negative input treated as zero

    # Monotonic scaling across three representative queue lengths
    queue_lengths = [10.0, 50.0, 100.0]
    durations = [compute_green_extension(q) for q in queue_lengths]

    for i in range(len(durations) - 1):
        assert durations[i] < durations[i + 1], (
            f"Non-monotonic: Q={queue_lengths[i]}m → {durations[i]}s "
            f"not less than Q={queue_lengths[i+1]}m → {durations[i+1]}s"
        )


def test_green_extension_physical_bounds():
    """Verify compute_green_extension always stays within physical limits."""
    # Minimum: positive queue must yield positive extension
    assert compute_green_extension(1.0) > 0.0

    # Maximum: very long queue must be capped at MAX_GREEN_EXTENSION_S
    assert compute_green_extension(10_000.0) == pytest.approx(MAX_GREEN_EXTENSION_S)

    # Exact expected value for a 35m queue:
    # n = 35/7 = 5 veh; s = 1900/3600 ≈ 0.5278 veh/s; T = 2 + 5/0.5278 ≈ 11.47s
    result = compute_green_extension(35.0)
    assert 10.0 < result < 15.0, f"Unexpected extension for 35m queue: {result}s"


# ---------------------------------------------------------------------------
# next_phase_decision — integration tests
# ---------------------------------------------------------------------------

def test_next_phase_decision_extended():
    """Verify that a queued lane receives reason=EXTENDED with duration > MIN_BASE_GREEN_S."""
    now = datetime.now()
    obs = _make_obs(lane_id="lane_N", queue_length_m=45.0, vehicle_count=8, density_veh_per_m=0.18)

    decision = next_phase_decision(current_time=now, obs=obs)

    assert isinstance(decision, PhaseDecision)
    assert decision.active_lane_id == "lane_N"
    assert decision.reason == PhaseReason.EXTENDED
    duration_s = (decision.phase_end - decision.phase_start).total_seconds()
    assert duration_s >= MIN_BASE_GREEN_S
    assert duration_s <= MAX_GREEN_EXTENSION_S


def test_next_phase_decision_empty_lane():
    """Verify that an empty lane receives reason=SCHEDULED with exactly MIN_BASE_GREEN_S."""
    now = datetime.now()
    obs = _make_obs(lane_id="lane_S", queue_length_m=0.0, vehicle_count=0, density_veh_per_m=0.0)

    decision = next_phase_decision(current_time=now, obs=obs)

    assert decision.reason == PhaseReason.SCHEDULED
    duration_s = (decision.phase_end - decision.phase_start).total_seconds()
    assert duration_s == pytest.approx(MIN_BASE_GREEN_S)


def test_next_phase_decision_output_schema():
    """Verify full PhaseDecision schema compliance: all fields populated and consistent."""
    now = datetime.now()
    obs = _make_obs(lane_id="lane_E", queue_length_m=28.0, vehicle_count=5, density_veh_per_m=0.15)

    decision = next_phase_decision(current_time=now, obs=obs, intersection_id="INT-07")

    assert decision.intersection_id == "INT-07"
    assert decision.active_lane_id == "lane_E"
    assert isinstance(decision.reason, PhaseReason)
    assert decision.phase_end > decision.phase_start


# ---------------------------------------------------------------------------
# Baseline fixed-timer tests
# ---------------------------------------------------------------------------

def test_baseline_fixed_timer_reason_and_duration():
    """Verify baseline always returns SCHEDULED with exactly split_seconds duration."""
    now = datetime.now()
    decision = fixed_timer_phase_decision(current_time=now)

    assert isinstance(decision, PhaseDecision)
    assert decision.reason == PhaseReason.SCHEDULED
    duration_s = (decision.phase_end - decision.phase_start).total_seconds()
    assert duration_s == pytest.approx(90.0)


def test_baseline_fixed_timer_round_robin():
    """Verify that consecutive 90s epochs return the expected round-robin lane IDs."""
    # Anchor to a known epoch that starts a fresh cycle
    lanes = ["lane_N", "lane_E", "lane_S", "lane_W"]
    split_s = 90.0
    base_epoch = 0.0  # epoch second 0 → lane_N (index 0)

    for idx, expected_lane in enumerate(lanes):
        epoch = base_epoch + idx * split_s
        decision = fixed_timer_phase_decision(
            current_time=epoch,
            lanes=lanes,
            split_seconds=split_s,
        )
        assert decision.active_lane_id == expected_lane, (
            f"At epoch {epoch}s expected {expected_lane}, got {decision.active_lane_id}"
        )


def test_baseline_fixed_timer_guards():
    """Verify ValueError is raised for empty lanes and non-positive split_seconds."""
    now = datetime.now()

    with pytest.raises(ValueError, match="non-empty"):
        fixed_timer_phase_decision(current_time=now, lanes=[])

    with pytest.raises(ValueError, match="positive"):
        fixed_timer_phase_decision(current_time=now, split_seconds=0.0)


# ---------------------------------------------------------------------------
# Traceability / AGENTS.md Rule 7 compliance
# ---------------------------------------------------------------------------

def test_saturation_flow_rate_constant():
    """Verify DEFAULT_SATURATION_FLOW_RATE is exactly 1900 (literature default, not measured).

    Per AGENTS.md Rule 7, this constant must remain a clearly documented placeholder
    until Phase 5 replaces it with an observed departure-count value.
    """
    assert DEFAULT_SATURATION_FLOW_RATE == 1900
