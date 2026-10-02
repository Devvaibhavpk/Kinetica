"""Bottleneck Forecasting and Feature Importance Model.

Sub-phases 5.1–5.6:
Utilizes a scikit-learn DecisionTreeRegressor to forecast secondary bottleneck
delays (queue length growth) following phase preemption events. Employs a shallow
tree (max_depth=3) to maintain strict model interpretability and extract Gini
feature importances for the Kinetica telemetry dashboard and Phase 6 report.
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, Tuple, Union

import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeRegressor

__all__ = [
    "load_simulation_logs",
    "train_bottleneck_model",
]


def load_simulation_logs(
    obs_path: Union[str, Path] = "results/obs_log.json",
    dec_path: Union[str, Path] = "results/dec_log.json",
) -> pd.DataFrame:
    """Load, validate, and join simulation observation and actuation decision logs.

    Sub-phase 5.2: Validates that both LaneObservation and PhaseDecision logs
    exist, are non-empty, and share overlapping time horizons. Merges them on
    nearest timestamp.

    Args:
        obs_path: Path to LaneObservation JSON log file.
        dec_path: Path to PhaseDecision JSON log file.

    Returns:
        pd.DataFrame: Merged time-series DataFrame with observation metrics and phase states.

    Raises:
        RuntimeError: If either log file does not exist, is empty, or lacks required fields.
    """
    obs_file = Path(obs_path)
    dec_file = Path(dec_path)

    if not obs_file.exists() or not dec_file.exists():
        raise RuntimeError(
            f"Simulation log files missing: '{obs_path}' or '{dec_path}'. "
            "A full end-to-end scenario simulation must be executed first."
        )

    try:
        with open(obs_file, "r", encoding="utf-8") as f:
            obs_data = json.load(f)
        with open(dec_file, "r", encoding="utf-8") as f:
            dec_data = json.load(f)
    except Exception as e:
        raise RuntimeError(f"Failed to parse simulation JSON logs: {e}") from e

    if not obs_data or not dec_data:
        raise RuntimeError("Simulation log files are empty. Run a simulation scenario with non-zero duration.")

    df_obs = pd.DataFrame(obs_data)
    df_dec = pd.DataFrame(dec_data)

    if "timestamp" not in df_obs.columns:
        raise RuntimeError("LaneObservation log missing required 'timestamp' column.")
    if "phase_start" not in df_dec.columns:
        raise RuntimeError("PhaseDecision log missing required 'phase_start' column.")

    # Standardize timestamps to integer epoch seconds for robust asof merging
    df_obs["dt"] = pd.to_datetime(df_obs["timestamp"])
    df_dec["dt"] = pd.to_datetime(df_dec["phase_start"])

    df_obs["timestamp_sec"] = df_obs["dt"].astype("int64") // 10**9
    df_dec["phase_start_sec"] = df_dec["dt"].astype("int64") // 10**9

    # Sort required for merge_asof
    df_obs = df_obs.sort_values("timestamp_sec").reset_index(drop=True)
    df_dec = df_dec.sort_values("phase_start_sec").reset_index(drop=True)

    merged = pd.merge_asof(
        df_obs,
        df_dec,
        left_on="timestamp_sec",
        right_on="phase_start_sec",
        direction="nearest",
        suffixes=("_obs", "_dec"),
    )

    # Add engineering features
    merged["is_preempted"] = (merged.get("reason", "") == "preempted").astype(float)
    merged["hour_of_day"] = merged["dt_obs"].dt.hour.astype(float)

    return merged


def train_bottleneck_model(
    df: pd.DataFrame,
    output_path: Union[str, Path] = "results/bottleneck_importances.json",
    max_depth: int = 3,
    lookahead_steps: int = 5,
) -> Tuple[DecisionTreeRegressor, Dict[str, float]]:
    """Train an interpretable DecisionTreeRegressor to forecast downstream bottleneck delay.

    Sub-phases 5.3–5.6:
    Isolates the target variable: the downstream queue length (queue_length_m)
    measured `lookahead_steps` into the future. Predicts this target using current
    density, vehicle count, queue length, preemption status, and hour of day.
    Saves Gini feature importances to `results/bottleneck_importances.json`.

    Args:
        df: Input DataFrame produced by load_simulation_logs or scenario logs.
        output_path: Destination path for persisting feature importance JSON.
        max_depth: Tree depth ceiling (default: 3 for strict interpretability).
        lookahead_steps: Time steps forward to project queue bottleneck severity.

    Returns:
        Tuple[DecisionTreeRegressor, Dict[str, float]]: Trained tree model and
        mapping of feature names to Gini importance scores.

    Raises:
        ValueError: If input DataFrame is empty or contains insufficient records.
    """
    if df.empty or len(df) < 5:
        raise ValueError(f"Insufficient training samples: expected >= 5, got {len(df)}")

    working_df = df.copy()

    # Ensure baseline observation columns exist
    base_cols = ["density_veh_per_m", "vehicle_count", "queue_length_m"]
    for col in base_cols:
        if col not in working_df.columns:
            working_df[col] = 0.0

    # Ensure auxiliary engineered features exist
    if "is_preempted" not in working_df.columns:
        if "reason" in working_df.columns:
            working_df["is_preempted"] = (working_df["reason"] == "preempted").astype(float)
        else:
            working_df["is_preempted"] = 0.0

    if "hour_of_day" not in working_df.columns:
        working_df["hour_of_day"] = 12.0

    feature_cols = ["density_veh_per_m", "vehicle_count", "queue_length_m", "is_preempted", "hour_of_day"]

    # Target: downstream queue length delay `lookahead_steps` ahead
    working_df["downstream_delay_m"] = (
        working_df["queue_length_m"].shift(-lookahead_steps).fillna(working_df["queue_length_m"])
    )

    X = working_df[feature_cols].fillna(0.0)
    y = working_df["downstream_delay_m"].fillna(0.0)

    # Train shallow regressor for high explainability (build-spec § 5.5)
    model = DecisionTreeRegressor(max_depth=max_depth, random_state=42)
    model.fit(X, y)

    # Extract Gini feature importances (build-spec § 5.6)
    raw_importances = model.feature_importances_
    importances_dict: Dict[str, float] = {
        col: round(float(imp), 4) for col, imp in zip(feature_cols, raw_importances)
    }

    # Persist to disk
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(importances_dict, f, indent=2)

    return model, importances_dict
