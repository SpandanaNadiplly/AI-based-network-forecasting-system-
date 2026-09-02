"""
Feature Engineering Module
Derives flow-level statistics, bandwidth metrics, and anomaly indicators from raw network traffic.
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class NetworkFlowFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Computes domain-specific engineered features for intrusion detection:
    - Byte transfer ratios & totals
    - Packet rate per connection
    - Port scan indicators
    - Failed login rate
    """

    def __init__(self, add_engineered_features: bool = True):
        self.add_engineered_features = add_engineered_features

    def fit(self, X: pd.DataFrame, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.add_engineered_features:
            return X

        df = X.copy()

        # Total Bytes & Byte Ratios (handling zero division safely)
        if "src_bytes" in df.columns and "dst_bytes" in df.columns:
            src = pd.to_numeric(df["src_bytes"], errors="coerce").fillna(0)
            dst = pd.to_numeric(df["dst_bytes"], errors="coerce").fillna(0)
            df["total_bytes"] = src + dst
            df["byte_ratio"] = (src + 1.0) / (dst + 1.0)
            df["byte_asymmetry"] = (src - dst) / (src + dst + 1.0)

        # Bytes per second (throughput)
        if "total_bytes" in df.columns and "duration" in df.columns:
            dur = pd.to_numeric(df["duration"], errors="coerce").fillna(0)
            df["bytes_per_sec"] = df["total_bytes"] / (dur + 0.001)

        # Port scanning intensity
        if "unique_dst_ports" in df.columns and "connections_to_same_host" in df.columns:
            ports = pd.to_numeric(df["unique_dst_ports"], errors="coerce").fillna(1)
            conns = pd.to_numeric(df["connections_to_same_host"], errors="coerce").fillna(1)
            df["port_dispersion_ratio"] = ports / (conns + 1.0)

        # Failed auth intensity
        if "failed_logins" in df.columns and "connections_to_same_host" in df.columns:
            failed = pd.to_numeric(df["failed_logins"], errors="coerce").fillna(0)
            conns = pd.to_numeric(df["connections_to_same_host"], errors="coerce").fillna(1)
            df["failed_login_ratio"] = failed / (conns + 1.0)

        return df
