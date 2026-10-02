"""Actuation Module for Project Kinetica.

Handles statistical Poisson arrival modeling, dynamic Webster queue-based
green time extensions, dynamic phase termination (gap-out), and fixed-timer baseline control.
"""

from actuation.arrival_model import ArrivalRateEstimator, goodness_of_fit_check
from actuation.baseline_fixed_timer import fixed_timer_phase_decision
from actuation.engine import (
    DEFAULT_SATURATION_FLOW_RATE,
    compute_green_extension,
    next_phase_decision,
    should_terminate_phase_early,
    terminate_phase_early,
)

__all__ = [
    "ArrivalRateEstimator",
    "goodness_of_fit_check",
    "compute_green_extension",
    "next_phase_decision",
    "should_terminate_phase_early",
    "terminate_phase_early",
    "DEFAULT_SATURATION_FLOW_RATE",
    "fixed_timer_phase_decision",
]
