"""Predictive Analytics and Statistical Validation Module for Project Kinetica.

Provides:
- Machine learning regression tree modeling for secondary bottleneck forecasting.
- Formal statistical hypothesis testing (Welch's t-test / Mann-Whitney U test)
  comparing Kinetica against fixed-timer baselines (SC4).
- High-resolution comparison plot generation for academic reporting.
- Empirical saturation flow rate calibration from vision departure telemetry.
"""

from analytics.bottleneck_model import (
    load_simulation_logs,
    train_bottleneck_model,
)
from analytics.calibrate_flow import (
    calibrate_saturation_flow_rate,
    compute_steady_discharge_rate,
)
from analytics.generate_plots import (
    generate_all_plots,
    plot_feature_importances,
    plot_poisson_fit,
    plot_queue_progression,
    plot_wait_time_comparison,
)
from analytics.hypothesis_test import run_comparison

__all__ = [
    "load_simulation_logs",
    "train_bottleneck_model",
    "run_comparison",
    "generate_all_plots",
    "plot_wait_time_comparison",
    "plot_queue_progression",
    "plot_feature_importances",
    "plot_poisson_fit",
    "calibrate_saturation_flow_rate",
    "compute_steady_discharge_rate",
]
