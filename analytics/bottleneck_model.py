import os
import json
import pandas as pd
import numpy as np
from typing import Tuple, Dict
from sklearn.tree import DecisionTreeRegressor

def load_simulation_logs(obs_path: str, dec_path: str) -> pd.DataFrame:
    if not os.path.exists(obs_path) or not os.path.exists(dec_path):
        raise RuntimeError("Simulation log files missing. Run full end-to-end scenario first.")

    with open(obs_path, "r") as f:
        obs_data = json.load(f)
    with open(dec_path, "r") as f:
        dec_data = json.load(f)

    df_obs = pd.DataFrame(obs_data)
    df_dec = pd.DataFrame(dec_data)

    if df_obs.empty or df_dec.empty:
        raise RuntimeError("Simulation logs are empty.")

    # Convert timestamps and merge
    df_obs['timestamp_sec'] = pd.to_datetime(df_obs['timestamp']).astype('int64') // 10**9
    df_dec['phase_start_sec'] = pd.to_datetime(df_dec['phase_start']).astype('int64') // 10**9

    merged = pd.merge_asof(
        df_obs.sort_values('timestamp_sec'),
        df_dec.sort_values('phase_start_sec'),
        left_on='timestamp_sec',
        right_on='phase_start_sec',
        direction='nearest'
    )
    return merged

def train_bottleneck_model(df: pd.DataFrame) -> Tuple[DecisionTreeRegressor, Dict[str, float]]:
    """
    Trains a shallow decision tree regressor to forecast downstream bottleneck delay.
    Saves feature importances to results/bottleneck_importances.json.
    """
    feature_cols = ['density_veh_per_m', 'vehicle_count', 'queue_length_m']
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0.0

    df['downstream_delay_m'] = df['queue_length_m'].shift(-5).fillna(df['queue_length_m'])

    X = df[feature_cols].fillna(0.0)
    y = df['downstream_delay_m'].fillna(0.0)

    model = DecisionTreeRegressor(max_depth=3, random_state=42)
    model.fit(X, y)

    importances = model.feature_importances_
    importances_dict = {col: round(float(imp), 4) for col, imp in zip(feature_cols, importances)}

    os.makedirs("results", exist_ok=True)
    with open("results/bottleneck_importances.json", "w") as f:
        json.dump(importances_dict, f, indent=2)

    return model, importances_dict
