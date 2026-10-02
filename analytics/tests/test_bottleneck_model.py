"""Tests for Bottleneck Forecasting, Log Validation, and Flow Calibration.

Covers build-spec.md §§ 5.1–5.6 and AGENTS.md Rule 7 saturation flow calibration:
- Log file existence, validation, and asof timestamp alignment
- DecisionTreeRegressor training with max_depth=3
- Gini feature importances extraction and JSON persistence
- Saturation flow rate empirical calibration
"""

from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import Tuple
import pandas as pd
import pytest

from analytics.bottleneck_model import (
    load_simulation_logs,
    train_bottleneck_model,
)
from analytics.calibrate_flow import (
    calibrate_saturation_flow_rate,
    compute_steady_discharge_rate,
)


def _create_mock_logs(base_dir: Path, n_records: int = 25) -> Tuple[Path, Path]:
    """Helper to generate mock simulation log files for testing."""
    t0 = datetime(2026, 10, 1, 10, 0, 0)
    obs_list = []
    dec_list = []

    for i in range(n_records):
        t = t0 + timedelta(seconds=i * 2.0)
        obs_list.append({
            "lane_id": "lane_N",
            "timestamp": t.isoformat(),
            "vehicle_count": i % 8,
            "queue_length_m": float((i % 8) * 5.0),
            "density_veh_per_m": float((i % 8) * 0.05),
        })
        dec_list.append({
            "intersection_id": "INT-01",
            "active_lane_id": "lane_N",
            "phase_start": t.isoformat(),
            "phase_end": (t + timedelta(seconds=15.0)).isoformat(),
            "reason": "preempted" if i % 10 == 0 else "extended",
        })

    obs_path = base_dir / "test_obs.json"
    dec_path = base_dir / "test_dec.json"

    with open(obs_path, "w") as f:
        json.dump(obs_list, f)
    with open(dec_path, "w") as f:
        json.dump(dec_list, f)

    return obs_path, dec_path


def test_load_simulation_logs_missing_files_raises():
    """Verify load_simulation_logs raises RuntimeError if log files are missing."""
    with pytest.raises(RuntimeError, match="missing"):
        load_simulation_logs("nonexistent_obs.json", "nonexistent_dec.json")


def test_load_simulation_logs_empty_files_raises(tmp_path: Path):
    """Verify load_simulation_logs raises RuntimeError if log files are empty."""
    obs_empty = tmp_path / "empty_obs.json"
    dec_empty = tmp_path / "empty_dec.json"
    obs_empty.write_text("[]")
    dec_empty.write_text("[]")

    with pytest.raises(RuntimeError, match="empty"):
        load_simulation_logs(obs_empty, dec_empty)


def test_load_simulation_logs_merges_properly(tmp_path: Path):
    """Verify load_simulation_logs produces merged dataframe with engineered features."""
    obs_path, dec_path = _create_mock_logs(tmp_path, n_records=20)

    df_merged = load_simulation_logs(obs_path, dec_path)

    assert isinstance(df_merged, pd.DataFrame)
    assert len(df_merged) == 20
    assert "density_veh_per_m" in df_merged.columns
    assert "is_preempted" in df_merged.columns
    assert "hour_of_day" in df_merged.columns


def test_train_bottleneck_model_max_depth_and_importances(tmp_path: Path):
    """Verify train_bottleneck_model trains with max_depth=3 and saves importances."""
    obs_path, dec_path = _create_mock_logs(tmp_path, n_records=30)
    df_merged = load_simulation_logs(obs_path, dec_path)

    out_json = tmp_path / "importances.json"
    model, importances = train_bottleneck_model(df_merged, output_path=out_json, max_depth=3)

    # Assert tree depth constraint (build-spec § 5.5)
    assert model.max_depth == 3
    assert out_json.exists()

    # Importances dictionary verification (build-spec § 5.6)
    assert isinstance(importances, dict)
    assert "density_veh_per_m" in importances
    assert "queue_length_m" in importances
    assert sum(importances.values()) == pytest.approx(1.0, abs=1e-2)


def test_train_bottleneck_model_insufficient_samples():
    """Verify ValueError is raised on insufficient samples."""
    df_tiny = pd.DataFrame([{"density_veh_per_m": 0.1, "queue_length_m": 5.0}])
    with pytest.raises(ValueError, match="Insufficient"):
        train_bottleneck_model(df_tiny)


def test_calibrate_saturation_flow_rate():
    """Verify empirical saturation flow rate calibration (Phase 5 refinement)."""
    # 5 cycles: 10 departures per 22 seconds green (effective green = 20s)
    # Expected rate: (10 veh / 20s) * 3600 = 1800.0 veh/hr/lane
    departures = [10, 10, 10, 10, 10]
    greens = [22.0, 22.0, 22.0, 22.0, 22.0]

    rate = calibrate_saturation_flow_rate(departures, greens, start_up_lost_time_s=2.0)
    assert rate == pytest.approx(1800.0, abs=1.0)

    discharge_sec = compute_steady_discharge_rate(rate)
    assert discharge_sec == pytest.approx(0.5, abs=0.01)


def test_calibrate_saturation_flow_rate_fallback():
    """Verify fallback to literature default (1900.0) when data is insufficient."""
    rate = calibrate_saturation_flow_rate([], [])
    assert rate == 1900.0
