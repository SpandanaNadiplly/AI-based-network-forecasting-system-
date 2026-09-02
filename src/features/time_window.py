"""
Time-Window Analysis Module
Computes sliding window metrics (burst rates, rolling anomaly counts, connection velocity)
over network traffic flows.
"""

import numpy as np
import pandas as pd


class TimeWindowAnalyzer:
    """Computes rolling time-window aggregation statistics on sequential traffic flow streams."""

    def __init__(self, window_size: int = 10):
        self.window_size = window_size

    def compute_window_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in ["packet_rate", "total_bytes", "bytes_per_sec", "connections_to_same_host"]:
            if col in numeric_cols:
                df[f"{col}_rolling_mean_{self.window_size}"] = (
                    df[col].rolling(window=self.window_size, min_periods=1).mean()
                )
                df[f"{col}_rolling_std_{self.window_size}"] = (
                    df[col].rolling(window=self.window_size, min_periods=1).std().fillna(0)
                )

        return df
