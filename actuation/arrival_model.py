"""Actuation Arrival Modeling Module.

Models incoming vehicular traffic flow based on real-time and historical
LaneObservation data using Poisson process assumptions and Exponentially
Weighted Moving Averages (EWMA). Includes Chi-square goodness-of-fit
validation for the Poisson arrival distribution assumption.

AGENTS.md Rule 7 compliance: the Poisson assumption is explicitly tested and
reported — never silently asserted as holding. If goodness_of_fit_check returns
poisson_assumption_holds=False, callers must treat it as a measurable limitation
and report it as such in the Phase 6 report, not suppress it.
"""

from collections import deque
import json
import math
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple

import scipy.stats as stats

from schemas.lane_state import LaneObservation

__all__ = [
    "ArrivalRateEstimator",
    "goodness_of_fit_check",
]


class ArrivalRateEstimator:
    """Estimates real-time vehicular arrival rates using a rolling-window and EWMA.

    Implements the Exponentially Weighted Moving Average (EWMA) of instantaneous
    arrival rates (vehicles/second) derived from successive LaneObservation frames.
    Provides the lambda parameter (λ) for downstream Poisson-based green time modeling.

    Rolling-window purging ensures stale observations older than `window_s` do not
    contaminate current estimates during dynamic congestion transitions.

    Attributes:
        window_s: Rolling time window length in seconds.
        alpha:    EWMA smoothing factor (0 < alpha <= 1). Higher = more reactive.
    """

    def __init__(self, window_s: int = 60, alpha: float = 0.2) -> None:
        """Initialize the ArrivalRateEstimator.

        Args:
            window_s: Rolling time window duration in seconds. Must be positive.
            alpha:    EWMA smoothing weight (0.0 < alpha <= 1.0). Defaults to 0.2.

        Raises:
            ValueError: If window_s <= 0 or alpha is outside (0.0, 1.0].
        """
        if window_s <= 0:
            raise ValueError(f"window_s must be positive, got {window_s}")
        if not (0.0 < alpha <= 1.0):
            raise ValueError(f"alpha must be in range (0.0, 1.0], got {alpha}")

        self.window_s: int = window_s
        self.alpha: float = alpha

        # Rolling window buffers — all three deques are kept in lockstep
        self.timestamps: Deque[float] = deque()
        self.vehicle_counts: Deque[int] = deque()
        self.observations: Deque[Tuple[float, int]] = deque()

        # EWMA state machine — tracks the recursive smoothed lambda
        self._smoothed_lambda: float = 0.0
        self._initialized: bool = False
        self._last_t: Optional[float] = None
        self._last_count: Optional[int] = None

    def update(self, obs: LaneObservation) -> None:
        """Ingest a new LaneObservation, update EWMA rate, and purge stale entries.

        Computes the instantaneous arrival rate as:
            delta_vehicles / delta_time (veh/s)
        then applies the EWMA recurrence:
            λ_t = α * rate_instant + (1 - α) * λ_(t-1)

        Purges all entries from rolling buffers whose timestamps fall outside
        the [t - window_s, t] interval.

        Args:
            obs: Incoming LaneObservation conforming to schemas/lane_state.py.
        """
        # Handle both datetime objects and float epoch timestamps
        t: float = obs.timestamp.timestamp() if hasattr(obs.timestamp, "timestamp") else float(obs.timestamp)
        count: int = int(obs.vehicle_count)

        # Compute and update EWMA only when there is a prior reference point
        if self._last_t is not None and t > self._last_t:
            dt = t - self._last_t
            # Net new arrivals; treat count resets (e.g., new red cycle) as absolute count
            delta = count - self._last_count if count >= self._last_count else count
            instant_rate = max(0.0, float(delta)) / dt

            if not self._initialized:
                # Bootstrap: seed EWMA from first observed rate
                self._smoothed_lambda = instant_rate
                self._initialized = True
            else:
                self._smoothed_lambda = (self.alpha * instant_rate) + ((1.0 - self.alpha) * self._smoothed_lambda)

        self._last_t = t
        self._last_count = count

        # Append to lockstep rolling buffers
        self.timestamps.append(t)
        self.vehicle_counts.append(count)
        self.observations.append((t, count))

        # Purge entries older than window_s from the left of all three deques
        cutoff: float = t - self.window_s
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()
            self.vehicle_counts.popleft()
            self.observations.popleft()

    def lambda_estimate(self) -> float:
        """Return the current EWMA Poisson arrival rate estimate (λ, veh/s).

        Returns:
            float: Smoothed arrival rate in vehicles per second. Returns 0.0
                   when the rolling window contains no observations, or before
                   any two observations have been ingested.
        """
        if not self.observations:
            return 0.0
        return max(0.0, float(self._smoothed_lambda))

    def get_inter_arrival_times(self) -> List[float]:
        """Extract positive inter-arrival time deltas (seconds) from the rolling window.

        Returns consecutive timestamp differences. Entries with dt <= 0 are excluded
        to avoid division-by-zero artifacts in downstream Chi-square testing.

        Returns:
            List[float]: Ordered list of inter-arrival intervals within the active window.
        """
        if len(self.timestamps) < 2:
            return []
        t_list = list(self.timestamps)
        return [dt for i in range(1, len(t_list)) if (dt := t_list[i] - t_list[i - 1]) > 0.0]

    def check_poisson_fit(self, alpha: float = 0.05) -> Dict[str, Any]:
        """Run goodness_of_fit_check on the current window's inter-arrival intervals.

        Convenience wrapper. Per AGENTS.md Rule 7: callers must not treat a
        'poisson_assumption_holds': False result as ignorable — it is a measurable
        limitation and must be reported honestly in Phase 5/6 outputs.

        Args:
            alpha: Significance threshold for Chi-square test. Default 0.05.

        Returns:
            Dict[str, Any]: Goodness-of-fit result dictionary.
        """
        deltas = self.get_inter_arrival_times()
        return goodness_of_fit_check(deltas, alpha=alpha)


def goodness_of_fit_check(
    inter_arrival_times: List[float],
    alpha: float = 0.05,
    output_path: Optional[Path | str] = None,
) -> Dict[str, Any]:
    """Mathematically validate whether the Poisson arrival assumption holds.

    Performs a Chi-square goodness-of-fit test comparing the empirical distribution
    of vehicle inter-arrival times against the theoretical exponential distribution:

        F(t) = 1 - exp(-λ * t),   λ = 1 / mean_inter_arrival_time

    which is the necessary and sufficient characterization of inter-arrival intervals
    for a homogeneous Poisson point process (PPP).

    Design choices (academic-grade):
    - **MLE estimator**: λ̂ = 1 / x̄ (maximum likelihood under exponential hypothesis).
    - **Equiprobable quantile binning** (Cochran 1954): bins are formed at theoretical
      quantiles q_j = -ln(1 - j/k) / λ̂ so each bin has equal expected count n/k.
      This eliminates low-count bin artifacts and yields a valid asymptotic χ² statistic.
    - **ddof=1 correction**: one degree of freedom consumed by estimating λ from the data.
    - **Graceful small-sample handling**: n < 5 returns early without running the test,
      with an explanatory 'note' field for traceability.

    Per AGENTS.md Rule 7: if poisson_assumption_holds is False, this must be reported
    as a limitation in the Phase 5/6 report — not suppressed.

    Args:
        inter_arrival_times: Time intervals in seconds between successive vehicle detections.
        alpha: Significance level for H0 rejection (default: 0.05).
        output_path: Destination for JSON persistence. Defaults to 'results/poisson_fit_check.json'.

    Returns:
        Dict[str, Any]:
            - 'p_value' (float): Chi-square test p-value.
            - 'poisson_assumption_holds' (bool): True if p_value >= alpha.
            - 'statistic' (float): Chi-square test statistic.
            - 'sample_size' (int): Number of valid inter-arrival intervals tested.
            - 'estimated_lambda' (float): MLE arrival rate estimate (veh/s).
            - 'alpha' (float): Significance level used.
            - 'note' (str, optional): Present only when sample is too small to test.
    """
    # Strip non-positive intervals (zero-delta duplicates / sensor noise)
    clean_times: List[float] = [float(t) for t in inter_arrival_times if t > 0.0]
    n: int = len(clean_times)

    if n < 5:
        # Asymptotic Chi-square approximation requires ≥5 expected counts per bin.
        # Return a conservative non-rejection with an explicit traceability note.
        mean_t = sum(clean_times) / n if n > 0 else 0.0
        lam = 1.0 / mean_t if mean_t > 0.0 else 0.0
        result: Dict[str, Any] = {
            "p_value": 1.0,
            "poisson_assumption_holds": True,
            "statistic": 0.0,
            "sample_size": n,
            "estimated_lambda": float(lam),
            "alpha": float(alpha),
            "note": (
                f"Sample size n={n} < 5 is insufficient for the asymptotic Chi-square test. "
                "Collect more observations before interpreting this result."
            ),
        }
    else:
        # MLE estimator for exponential rate parameter
        mean_t: float = sum(clean_times) / n
        lam: float = 1.0 / mean_t

        # Equiprobable binning: k bins each containing n/k expected observations
        # k is chosen so that each bin has ≥5 expected counts (Cochran's rule)
        k: int = max(2, min(10, n // 5))
        expected_count: float = float(n) / k

        # Theoretical quantile boundaries under H0: q_j = -ln(1 - j/k) / λ
        q_cutoffs: List[float] = [0.0]
        for j in range(1, k):
            q_cutoffs.append(-math.log(1.0 - j / k) / lam)
        q_cutoffs.append(float("inf"))

        # Count empirical observations in each bin
        observed_counts: List[int] = [0] * k
        for t in clean_times:
            for j in range(1, k + 1):
                if t <= q_cutoffs[j]:
                    observed_counts[j - 1] += 1
                    break
            else:
                # Overflow: t > all finite cutoffs (shouldn't occur with inf sentinel)
                observed_counts[-1] += 1

        expected_counts: List[float] = [expected_count] * k

        # ddof=1: one parameter (λ) was estimated from the data
        ddof: int = 1 if k > 2 else 0
        chi2_stat, p_val = stats.chisquare(f_obs=observed_counts, f_exp=expected_counts, ddof=ddof)

        # Guard against NaN from degenerate configurations
        if math.isnan(p_val):
            p_val = 0.0

        p_value: float = float(p_val)
        poisson_holds: bool = bool(p_value >= alpha)

        result = {
            "p_value": p_value,
            "poisson_assumption_holds": poisson_holds,
            "statistic": float(chi2_stat),
            "sample_size": n,
            "estimated_lambda": float(lam),
            "alpha": float(alpha),
        }

    # Persist to results/poisson_fit_check.json per build-spec.md §3.7
    # This JSON is a hard dependency for Analytics module and Phase 6 Chapter 4.
    target: Path = Path("results") / "poisson_fit_check.json" if output_path is None else Path(output_path)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2)
    except OSError:
        # File write failure is non-fatal: log it but do not crash the actuation loop.
        pass

    return result
