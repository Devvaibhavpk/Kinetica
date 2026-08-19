import random
from analytics.hypothesis_test import run_comparison

def test_h0_rejected_at_alpha_05():
    """
    SC4: Asserts that hypothesis test rejects H0 (baseline wait > kinetica wait) at alpha = 0.05.
    """
    random.seed(42)
    # Baseline wait times around 90 seconds (fixed timer cycle delay)
    baseline = [random.gauss(85.0, 10.0) for _ in range(50)]
    # Kinetica wait times around 30 seconds (dynamic actuation)
    kinetica = [random.gauss(30.0, 5.0) for _ in range(50)]

    res = run_comparison(kinetica, baseline, alpha=0.05)

    assert res["h0_rejected"] is True, f"Expected H0 rejected, got {res}"
    assert res["p_value"] < 0.05, f"Expected p_value < 0.05, got {res['p_value']}"
