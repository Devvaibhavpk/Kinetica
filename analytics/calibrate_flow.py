"""Saturation Flow Rate Empirical Calibration Module.

Phase 5 Refinement (AGENTS.md Rule 7 Compliance):
Replaces the literature default placeholder (DEFAULT_SATURATION_FLOW_RATE = 1900 veh/hr/lane)
with an empirically observed value computed from vision departure-count telemetry
and green phase durations according to Highway Capacity Manual (HCM 2016, Chapter 19).
"""

from typing import List, Optional

__all__ = [
    "calibrate_saturation_flow_rate",
    "compute_steady_discharge_rate",
]


def calibrate_saturation_flow_rate(
    departure_counts: List[int],
    green_durations_s: List[float],
    start_up_lost_time_s: float = 2.0,
    fallback_rate: float = 1900.0,
) -> float:
    """Calculate the calibrated saturation flow rate (veh/hr/lane) from observed departure streams.

    HCM 2016 Saturation Flow Formula:
        s = 3600 * (sum(departures) / sum(green_durations - start_up_lost_time))

    Filters out cycles with green duration <= start_up_lost_time to prevent
    zero/negative division. If total effective green time is negligible (< 10s),
    safely falls back to the literature default.

    Args:
        departure_counts: Number of discharged vehicles observed clearing stopline per green cycle.
        green_durations_s: Allocated green phase duration in seconds for each corresponding cycle.
        start_up_lost_time_s: Initial lost time before steady saturation flow (default: 2.0s).
        fallback_rate: Default rate to return if data is insufficient (default: 1900 veh/hr/lane).

    Returns:
        float: Calibrated saturation flow rate in vehicles per hour per lane (veh/hr/lane).
    """
    if len(departure_counts) != len(green_durations_s) or not departure_counts:
        return float(fallback_rate)

    total_departures = 0
    total_effective_green_s = 0.0

    for deps, green_s in zip(departure_counts, green_durations_s):
        eff_green = green_s - start_up_lost_time_s
        if eff_green > 0.0 and deps >= 0:
            total_departures += deps
            total_effective_green_s += eff_green

    if total_effective_green_s < 10.0 or total_departures == 0:
        return float(fallback_rate)

    # Discharges per second
    departures_per_sec = float(total_departures) / total_effective_green_s
    calibrated_rate = departures_per_sec * 3600.0

    # Sanity bounds (1200 to 2400 veh/hr/lane physical limits under urban conditions)
    bounded_rate = max(1200.0, min(2400.0, calibrated_rate))
    return round(float(bounded_rate), 1)


def compute_steady_discharge_rate(calibrated_rate: float) -> float:
    """Convert saturation flow rate (veh/hr/lane) to steady-state vehicles per second."""
    return float(calibrated_rate) / 3600.0
