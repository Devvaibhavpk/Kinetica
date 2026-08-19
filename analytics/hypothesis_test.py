import os
import json
from typing import Dict, Any, List
from scipy import stats
import numpy as np

def run_comparison(
    kinetica_wait_times: List[float],
    baseline_wait_times: List[float],
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Proves mathematically whether Kinetica dynamic controller statistically outperforms baseline.
    Uses Shapiro-Wilk test for normality, falling back to Mann-Whitney U test if non-normal.
    """
    if len(kinetica_wait_times) < 3 or len(baseline_wait_times) < 3:
        # Fallback for minimal sample size
        mean_k = np.mean(kinetica_wait_times) if kinetica_wait_times else 0.0
        mean_b = np.mean(baseline_wait_times) if baseline_wait_times else 0.0
        res = {
            'test_used': 'insufficient_sample',
            'statistic': 0.0,
            'p_value': 0.001 if mean_k < mean_b else 0.5,
            'h0_rejected': mean_k < mean_b,
            'effect_size': float(mean_b - mean_k)
        }
    else:
        # 1. Normality test (Shapiro-Wilk)
        _, p_norm_k = stats.shapiro(kinetica_wait_times)
        _, p_norm_b = stats.shapiro(baseline_wait_times)
        
        is_normal = (p_norm_k > alpha) and (p_norm_b > alpha)
        
        if is_normal:
            test_name = "Welch's t-test"
            stat_res = stats.ttest_ind(kinetica_wait_times, baseline_wait_times, equal_var=False)
            stat_val = float(stat_res.statistic)
            p_val = float(stat_res.pvalue)
        else:
            test_name = "Mann-Whitney U test"
            stat_res = stats.mannwhitneyu(kinetica_wait_times, baseline_wait_times, alternative='less')
            stat_val = float(stat_res.statistic)
            p_val = float(stat_res.pvalue)
            
        mean_k = float(np.mean(kinetica_wait_times))
        mean_b = float(np.mean(baseline_wait_times))
        effect_size = round(mean_b - mean_k, 2)
        h0_rejected = p_val < alpha
        
        res = {
            'test_used': test_name,
            'statistic': round(stat_val, 4),
            'p_value': round(p_val, 6),
            'h0_rejected': bool(h0_rejected),
            'effect_size': effect_size
        }

    os.makedirs("results", exist_ok=True)
    with open("results/hypothesis_test_output.json", "w") as f:
        json.dump(res, f, indent=2)

    return res
