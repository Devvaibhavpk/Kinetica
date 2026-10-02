"""Tests for Comparative Hypothesis Testing and Success Criterion 4 (SC4).

Covers build-spec.md §§ 5.7–5.15:
- Sub-phase 5.14: generate_wait_times helper
- Sub-phase 5.15: SC4 formal validation gate (test_h0_rejected_at_alpha_05)
- Normality testing and branching (Welch's t-test vs Mann-Whitney U)
- Null hypothesis retention on identical wait times
- JSON artifact persistence to results/hypothesis_test_output.json
"""

import json
from pathlib import Path
import random
from typing import List, Tuple
import numpy as np
import pytest

from analytics.hypothesis_test import run_comparison


def generate_wait_times(
    n_samples: int = 50,
    seed: int = 42,
) -> Tuple[List[float], List[float]]:
    """Sub-phase 5.14: Synthetic wait-time generator for statistical validation.

    Generates:
        - Baseline: wait times heavily skewed towards ~85-90 seconds (fixed timer cycles).
        - Kinetica: wait times centered around ~25-30 seconds (adaptive demand-responsive).
    """
    random.seed(seed)
    np.random.seed(seed)

    baseline = [float(random.gauss(88.0, 10.0)) for _ in range(n_samples)]
    kinetica = [float(random.gauss(28.0, 6.0)) for _ in range(n_samples)]
    return kinetica, baseline


def test_h0_rejected_at_alpha_05():
    """SC4 Validation Gate.

    Test ID: analytics/tests/test_hypothesis_test.py::test_h0_rejected_at_alpha_05
    build-spec.md § 5.15

    Formally tests whether Kinetica wait times statistically significantly reject
    H0 (mu_kinetica >= mu_baseline) at alpha = 0.05.
    Asserts:
        - h0_rejected is strictly True
        - p_value is strictly < 0.05
        - effect_size is strictly positive (representing reduction in wait time)
    """
    kinetica, baseline = generate_wait_times(n_samples=50, seed=42)

    res = run_comparison(kinetica, baseline, alpha=0.05)

    assert res["h0_rejected"] is True, f"SC4 FAILED: Expected H0 rejected, got {res}"
    assert res["p_value"] < 0.05, f"SC4 FAILED: Expected p_value < 0.05, got {res['p_value']}"
    assert res["effect_size"] > 0.0, f"Expected positive effect size, got {res['effect_size']}"
    assert res["test_used"] in ["Welch's t-test", "Mann-Whitney U test"]


def test_normal_distribution_branches_to_welch():
    """Verify that normally distributed inputs select Welch's t-test."""
    np.random.seed(10)
    # Perfectly normal samples
    kinetica = np.random.normal(loc=30.0, scale=4.0, size=80).tolist()
    baseline = np.random.normal(loc=70.0, scale=6.0, size=80).tolist()

    res = run_comparison(kinetica, baseline, alpha=0.05)
    assert res["test_used"] == "Welch's t-test"
    assert res["h0_rejected"] is True
    assert res["p_value"] < 0.001


def test_skewed_distribution_branches_to_mann_whitney():
    """Verify that heavily skewed exponential inputs select Mann-Whitney U test."""
    np.random.seed(99)
    # Exponential distributions (severely non-normal, rejecting Shapiro-Wilk)
    kinetica = np.random.exponential(scale=15.0, size=100).tolist()
    baseline = (np.random.exponential(scale=35.0, size=100) + 40.0).tolist()

    res = run_comparison(kinetica, baseline, alpha=0.05)
    assert res["test_used"] == "Mann-Whitney U test"
    assert res["h0_rejected"] is True
    assert res["p_value"] < 0.05


def test_identical_distributions_fail_to_reject_h0():
    """Verify that identical distributions fail to reject H0 (p_value >= 0.05)."""
    np.random.seed(123)
    k_samples = np.random.normal(loc=50.0, scale=5.0, size=60).tolist()
    b_samples = np.random.normal(loc=50.0, scale=5.0, size=60).tolist()

    res = run_comparison(k_samples, b_samples, alpha=0.05)
    assert res["h0_rejected"] is False
    assert res["p_value"] >= 0.05


def test_small_sample_size_handling():
    """Verify graceful handling when sample size is too small for Shapiro-Wilk."""
    k_small = [10.0, 15.0]
    b_small = [60.0, 70.0]

    res = run_comparison(k_small, b_small, alpha=0.05)
    assert res["test_used"] == "insufficient_sample"
    assert res["h0_rejected"] is True
    assert res["effect_size"] > 0.0


def test_invalid_alpha_guard():
    """Verify invalid alpha values raise ValueError."""
    with pytest.raises(ValueError, match="alpha"):
        run_comparison([1.0, 2.0], [3.0, 4.0], alpha=-0.05)
    with pytest.raises(ValueError, match="alpha"):
        run_comparison([1.0, 2.0], [3.0, 4.0], alpha=1.5)


def test_empty_sample_guard():
    """Verify empty input samples raise ValueError."""
    with pytest.raises(ValueError, match="empty"):
        run_comparison([], [5.0, 10.0])


def test_json_artifact_persistence(tmp_path: Path):
    """Verify output JSON is saved correctly to disk."""
    out_file = tmp_path / "hypo_output.json"
    kinetica, baseline = generate_wait_times(n_samples=20)

    res = run_comparison(kinetica, baseline, output_path=out_file)
    assert out_file.exists()

    with open(out_file, "r") as f:
        loaded = json.load(f)

    assert loaded["test_used"] == res["test_used"]
    assert loaded["h0_rejected"] == res["h0_rejected"]
    assert loaded["p_value"] == pytest.approx(res["p_value"])
