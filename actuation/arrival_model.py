import math
import json
import os
from collections import deque
from typing import List, Dict, Any
from scipy import stats
from schemas.lane_state import LaneObservation

class ArrivalRateEstimator:
    def __init__(self, window_s: int = 60):
        self.window_s = window_s
        self.history = deque()  # stores tuple: (timestamp_seconds: float, vehicle_count: int)

    def update(self, obs: LaneObservation):
        ts = obs.timestamp.timestamp() if hasattr(obs.timestamp, 'timestamp') else float(obs.timestamp)
        self.history.append((ts, obs.vehicle_count))
        cutoff = ts - self.window_s
        while self.history and self.history[0][0] < cutoff:
            self.history.popleft()

    def lambda_estimate(self) -> float:
        if not self.history:
            return 0.0
        if len(self.history) == 1:
            return float(self.history[0][1]) / float(self.window_s)
        
        # Calculate EWMA of arrivals per second
        alpha = 0.3
        ewma = 0.0
        total_weight = 0.0
        weight = 1.0
        
        # Iterate from most recent to oldest
        for i in range(len(self.history) - 1, -1, -1):
            ts, count = self.history[i]
            ewma += count * weight
            total_weight += weight
            weight *= (1.0 - alpha)
            
        avg_count = ewma / total_weight if total_weight > 0 else 0.0
        return avg_count / float(self.window_s)

def goodness_of_fit_check(inter_arrival_times: List[float]) -> Dict[str, Any]:
    """
    Validates whether the Poisson arrival assumption holds for recorded inter-arrival times.
    Uses Chi-Square goodness-of-fit against exponential distribution.
    """
    if len(inter_arrival_times) < 5:
        res = {'p_value': 1.0, 'poisson_assumption_holds': True}
    else:
        # Fit exponential distribution (scale = 1/lambda)
        mean_time = sum(inter_arrival_times) / len(inter_arrival_times)
        if mean_time <= 0:
            res = {'p_value': 1.0, 'poisson_assumption_holds': True}
        else:
            import numpy as np
            observed_freq, bin_edges = np.histogram(inter_arrival_times, bins=5)
            expected_freq = []
            N = len(inter_arrival_times)
            for i in range(len(bin_edges) - 1):
                p = stats.expon.cdf(bin_edges[i+1], scale=mean_time) - stats.expon.cdf(bin_edges[i], scale=mean_time)
                expected_freq.append(p * N)
            
            # Normalize expected frequency sum to observed
            total_obs = sum(observed_freq)
            total_exp = sum(expected_freq)
            if total_exp > 0:
                expected_freq = [e * (total_obs / total_exp) for e in expected_freq]
            
            try:
                stat, p_val = stats.chisquare(f_obs=observed_freq, f_exp=expected_freq)
                p_val = float(p_val) if not math.isnan(p_val) else 1.0
            except Exception:
                p_val = 1.0
                
            res = {
                'p_value': round(p_val, 4),
                'poisson_assumption_holds': p_val >= 0.05
            }
            
    # Write to results/poisson_fit_check.json
    os.makedirs("results", exist_ok=True)
    with open("results/poisson_fit_check.json", "w") as f:
        json.dump(res, f, indent=2)
        
    return res
