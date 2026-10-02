"""Tests for Actuation Arrival Modeling — build-spec.md §§ 3.12, 3.14.

Covers:
    - Estimator convergence on named synthetic scenarios (3.14)
    - Estimator convergence against known ground-truth rate (3.14)
    - Rolling window purging correctness (3.3)
    - Empty-window edge case safety (3.4)
    - Chi-square goodness-of-fit: accept exponential, reject constant (3.6)
    - Chi-square small-sample graceful handling (3.5)
    - JSON persistence of goodness-of-fit result (3.7)
    - ArrivalRateEstimator initialisation guards (3.2)
    - Dynamic phase termination (gap-out) logic (3.12)
    - Phase decision truncation (3.12)
"""

from datetime import datetime, timedelta
import json
from pathlib import Path
import numpy as np
import pytest

from actuation.arrival_model import ArrivalRateEstimator, goodness_of_fit_check
from actuation.engine import should_terminate_phase_early, terminate_phase_early
from data.synthetic_generator import generate_scenario
from schemas.lane_state import LaneObservation, PhaseDecision, PhaseReason, VehicleClass


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _make_obs(
    lane_id: str = "lane_N",
    t: datetime = None,
    vehicle_count: int = 0,
    queue_length_m: float = 0.0,
    density_veh_per_m: float = 0.0,
) -> LaneObservation:
    return LaneObservation(
        lane_id=lane_id,
        timestamp=t or datetime.now(),
        vehicle_count=vehicle_count,
        queue_length_m=queue_length_m,
        density_veh_per_m=density_veh_per_m,
        class_counts={VehicleClass.STANDARD: vehicle_count},
    )


def _feed_estimator(
    estimator: ArrivalRateEstimator,
    t0: datetime,
    interval_s: float,
    vehicles_per_step: int,
    steps: int,
) -> None:
    """Feed a deterministic ramp of vehicle counts into the estimator."""
    for step in range(steps):
        obs = _make_obs(
            t=t0 + timedelta(seconds=step * interval_s),
            vehicle_count=step * vehicles_per_step,
            queue_length_m=step * vehicles_per_step * 5.0,
        )
        estimator.update(obs)


# ---------------------------------------------------------------------------
# ArrivalRateEstimator — initialisation guards
# ---------------------------------------------------------------------------

def test_estimator_rejects_non_positive_window():
    """window_s <= 0 must raise ValueError."""
    with pytest.raises(ValueError, match="window_s"):
        ArrivalRateEstimator(window_s=0)
    with pytest.raises(ValueError, match="window_s"):
        ArrivalRateEstimator(window_s=-10)


def test_estimator_rejects_invalid_alpha():
    """alpha outside (0.0, 1.0] must raise ValueError."""
    with pytest.raises(ValueError, match="alpha"):
        ArrivalRateEstimator(alpha=0.0)
    with pytest.raises(ValueError, match="alpha"):
        ArrivalRateEstimator(alpha=1.5)


def test_empty_window_returns_zero_lambda():
    """lambda_estimate must return 0.0 when no observations have been ingested."""
    estimator = ArrivalRateEstimator(window_s=60)
    assert estimator.lambda_estimate() == 0.0


# ---------------------------------------------------------------------------
# 3.14 — Estimator convergence
# ---------------------------------------------------------------------------

def test_estimator_convergence_known_ground_truth():
    """Sub-phase 3.14: EWMA must converge within 5 % of a known deterministic rate.

    Ground truth: 1 vehicle every 2.0 s  →  λ = 0.50 veh/s.
    """
    estimator = ArrivalRateEstimator(window_s=60, alpha=0.25)
    t0 = datetime(2026, 10, 1, 12, 0, 0)
    _feed_estimator(estimator, t0=t0, interval_s=2.0, vehicles_per_step=1, steps=30)

    estimated = estimator.lambda_estimate()
    assert abs(estimated - 0.50) < 0.025, (
        f"Estimator did not converge within 5 %: expected 0.50, got {estimated:.4f}"
    )


def test_estimator_convergence_on_synthetic_scenario():
    """Sub-phase 3.14: Estimator produces non-negative, physically plausible λ on synthetic data."""
    estimator = ArrivalRateEstimator(window_s=60, alpha=0.3)
    n_processed = 0

    for item in generate_scenario("queue_buildup", duration_s=40):
        if isinstance(item, LaneObservation) and item.lane_id == "lane_N":
            estimator.update(item)
            n_processed += 1

    assert n_processed > 0, "No LaneObservation items were produced by the generator."
    lam = estimator.lambda_estimate()
    assert 0.0 <= lam <= 10.0, f"λ outside physical range: {lam}"


def test_estimator_higher_rate_produces_higher_lambda():
    """A doubling of the arrival rate must approximately double the EWMA estimate."""
    t0 = datetime(2026, 10, 1, 12, 0, 0)

    est_slow = ArrivalRateEstimator(window_s=60, alpha=0.5)
    _feed_estimator(est_slow, t0=t0, interval_s=2.0, vehicles_per_step=1, steps=30)

    est_fast = ArrivalRateEstimator(window_s=60, alpha=0.5)
    _feed_estimator(est_fast, t0=t0, interval_s=2.0, vehicles_per_step=2, steps=30)

    assert est_fast.lambda_estimate() > est_slow.lambda_estimate(), (
        "Higher arrival rate did not produce higher lambda estimate."
    )


# ---------------------------------------------------------------------------
# 3.3 — Rolling window purging
# ---------------------------------------------------------------------------

def test_rolling_window_purges_old_entries():
    """Entries older than window_s must be expelled from all three deques."""
    estimator = ArrivalRateEstimator(window_s=30, alpha=0.5)
    t0 = datetime(2026, 10, 1, 12, 0, 0)

    estimator.update(_make_obs(t=t0, vehicle_count=1, queue_length_m=5.0))
    estimator.update(_make_obs(t=t0 + timedelta(seconds=20), vehicle_count=2, queue_length_m=10.0))
    estimator.update(_make_obs(t=t0 + timedelta(seconds=45), vehicle_count=3, queue_length_m=15.0))

    # Entry at t0 is 45s behind the latest (t0+45s), exceeding window_s=30s
    assert len(estimator.timestamps) == 2
    assert len(estimator.vehicle_counts) == 2
    assert len(estimator.observations) == 2
    # First remaining entry should be the t0+20s observation
    assert estimator.timestamps[0] == pytest.approx((t0 + timedelta(seconds=20)).timestamp())


def test_inter_arrival_times_excludes_non_positive_deltas():
    """get_inter_arrival_times must only return strictly positive deltas."""
    estimator = ArrivalRateEstimator(window_s=60, alpha=0.5)
    t0 = datetime(2026, 10, 1, 12, 0, 0)
    # Two observations at the same timestamp (dt=0) should produce no inter-arrival time
    for _ in range(2):
        estimator.update(_make_obs(t=t0, vehicle_count=5, queue_length_m=25.0))
    times = estimator.get_inter_arrival_times()
    assert all(t > 0.0 for t in times)


# ---------------------------------------------------------------------------
# 3.5 / 3.6 — Chi-square goodness-of-fit
# ---------------------------------------------------------------------------

def test_goodness_of_fit_accepts_exponential():
    """True exponential inter-arrivals must fail to reject H0 (p >= 0.05)."""
    np.random.seed(42)
    exp_deltas = np.random.exponential(scale=2.0, size=200).tolist()
    result = goodness_of_fit_check(exp_deltas)
    assert result["poisson_assumption_holds"] is True
    assert result["p_value"] >= 0.05


def test_goodness_of_fit_rejects_constant():
    """Constant inter-arrivals (deterministic, non-random) must reject H0 (p < 0.05)."""
    const_deltas = [2.0] * 100
    result = goodness_of_fit_check(const_deltas)
    assert result["poisson_assumption_holds"] is False
    assert result["p_value"] < 0.05


def test_goodness_of_fit_small_sample_graceful():
    """n < 5 must return gracefully with a note field, not crash."""
    result = goodness_of_fit_check([1.0, 2.0, 1.5])
    assert "note" in result
    assert result["sample_size"] == 3
    assert result["p_value"] == pytest.approx(1.0)


def test_goodness_of_fit_empty_input():
    """Empty input must return gracefully with sample_size=0."""
    result = goodness_of_fit_check([])
    assert result["sample_size"] == 0
    assert result["estimated_lambda"] == pytest.approx(0.0)


def test_goodness_of_fit_result_schema():
    """Return dict must always contain the exact required keys."""
    np.random.seed(7)
    result = goodness_of_fit_check(np.random.exponential(1.5, 50).tolist())
    required_keys = {"p_value", "poisson_assumption_holds", "statistic", "sample_size", "estimated_lambda", "alpha"}
    assert required_keys.issubset(result.keys())


# ---------------------------------------------------------------------------
# 3.7 — JSON persistence
# ---------------------------------------------------------------------------

def test_goodness_of_fit_json_persistence(tmp_path: Path):
    """goodness_of_fit_check must write a valid JSON file to the specified path."""
    np.random.seed(0)
    out_file = tmp_path / "poisson_check.json"
    result = goodness_of_fit_check(
        np.random.exponential(2.0, 80).tolist(),
        output_path=out_file,
    )
    assert out_file.exists(), "JSON file was not created."
    with out_file.open() as fh:
        saved = json.load(fh)
    assert saved["p_value"] == pytest.approx(result["p_value"])
    assert saved["poisson_assumption_holds"] == result["poisson_assumption_holds"]


# ---------------------------------------------------------------------------
# 3.12 — Dynamic phase termination (gap-out)
# ---------------------------------------------------------------------------

def test_gap_out_does_not_trigger_before_safety_minimum():
    """Gap-out must not fire when elapsed_green_s < MIN_SAFETY_GREEN_BEFORE_GAP_S."""
    obs_empty = _make_obs(vehicle_count=0, queue_length_m=0.0, density_veh_per_m=0.0)
    assert should_terminate_phase_early(obs_empty, elapsed_green_s=4.0) is False


def test_gap_out_does_not_trigger_with_active_queue():
    """Gap-out must not fire when queue is still present regardless of elapsed time."""
    obs_active = _make_obs(vehicle_count=5, queue_length_m=25.0, density_veh_per_m=0.2)
    assert should_terminate_phase_early(obs_active, elapsed_green_s=20.0) is False


def test_gap_out_triggers_on_cleared_empty_lane():
    """Gap-out must fire when queue cleared + density below threshold + elapsed >= min."""
    obs_empty = _make_obs(vehicle_count=0, queue_length_m=0.0, density_veh_per_m=0.0)
    assert should_terminate_phase_early(obs_empty, elapsed_green_s=10.0) is True


def test_terminate_phase_early_truncates_correctly():
    """terminate_phase_early must produce a PhaseDecision with phase_end at termination_time."""
    now = datetime.now()
    original = PhaseDecision(
        intersection_id="INT-01",
        active_lane_id="lane_N",
        phase_start=now - timedelta(seconds=10),
        phase_end=now + timedelta(seconds=50),
        reason=PhaseReason.EXTENDED,
    )
    truncated = terminate_phase_early(original, termination_time=now)

    assert truncated.phase_end == now
    assert truncated.phase_end < original.phase_end
    # Reason must be preserved (audit trail continuity)
    assert truncated.reason == PhaseReason.EXTENDED
    assert truncated.intersection_id == original.intersection_id


def test_terminate_phase_early_cannot_precede_start():
    """Termination before phase_start must clamp phase_end to phase_start."""
    now = datetime.now()
    original = PhaseDecision(
        intersection_id="INT-01",
        active_lane_id="lane_W",
        phase_start=now,
        phase_end=now + timedelta(seconds=30),
        reason=PhaseReason.SCHEDULED,
    )
    truncated = terminate_phase_early(original, termination_time=now - timedelta(seconds=5))
    assert truncated.phase_end == now  # clamped to phase_start
