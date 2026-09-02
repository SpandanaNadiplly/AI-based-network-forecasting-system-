"""
Traffic Preprocessor Module
Handles data cleaning, leak column removal, missing/inf values, and categorical/numerical transformations.
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler, OneHotEncoder


# Identifier columns that cause data leakage across datasets (e.g. CIC-IDS, NSL-KDD)
DEFAULT_LEAKY_COLUMNS = {
    "flow id", "source ip", "src ip", "destination ip", "dst ip",
    "source port", "src port", "destination port",
    "timestamp", "time", "fwd header length.1", "unnamed: 0", "id"
}


class TrafficDataCleaner:
    """Cleans raw network traffic DataFrames before feature transformation."""

    def __init__(self, leaky_columns=None, drop_non_numeric_unencoded=False):
        self.leaky_columns = set(leaky_columns) if leaky_columns is not None else DEFAULT_LEAKY_COLUMNS
        self.drop_non_numeric_unencoded = drop_non_numeric_unencoded

    def clean_dataframe(self, df: pd.DataFrame, is_training: bool = False, target_col: str = "label"):
        """
        Normalizes column names, strips whitespace, handles inf/nan values,
        and separates target variable if present.
        """
        df = df.copy()

        # Strip whitespace from column names
        df.columns = [str(c).strip() for c in df.columns]

        # Check for label column
        found_target = None
        for col in df.columns:
            if col.strip().lower() == target_col.lower():
                found_target = col
                break

        y = None
        if found_target is not None:
            df[found_target] = df[found_target].astype(str).str.strip()
            if is_training:
                # Replace infs and drop NaNs in training
                df = df.replace([np.inf, -np.inf], np.nan)
                df = df.dropna(subset=[found_target])
            y = df[found_target]
            X = df.drop(columns=[found_target])
        else:
            X = df

        # Replace inf with nan and handle numeric issues
        X = X.replace([np.inf, -np.inf], np.nan)

        # Remove leaky columns
        cols_to_drop = [c for c in X.columns if c.strip().lower() in self.leaky_columns]
        if cols_to_drop:
            X = X.drop(columns=cols_to_drop)

        return X, y


class NetworkFeaturePreprocessor(BaseEstimator, TransformerMixin):
    """
    Scikit-learn compatible transformer for production network traffic feature preprocessing.
    Encodes categorical features, imputes missing values, and scales numeric features.
    """

    def __init__(self, categorical_cols=None, numerical_cols=None):
        self.categorical_cols = categorical_cols or ["protocol_type", "protocol", "flag", "service"]
        self.numerical_cols = numerical_cols
        self.scaler = StandardScaler()
        self.encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.active_cat_cols_ = []
        self.active_num_cols_ = []
        self.medians_ = {}
        self.feature_names_out_ = []

    def fit(self, X: pd.DataFrame, y=None):
        X = X.copy()

        # Identify categorical and numerical columns present in X
        self.active_cat_cols_ = [c for c in self.categorical_cols if c in X.columns]
        self.active_num_cols_ = [
            c for c in X.columns
            if c not in self.active_cat_cols_ and pd.api.types.is_numeric_dtype(X[c])
        ]

        # Calculate medians for missing value imputation
        for c in self.active_num_cols_:
            self.medians_[c] = float(X[c].median()) if not np.isnan(X[c].median()) else 0.0

        # Fit numerical scaler
        if self.active_num_cols_:
            num_data = X[self.active_num_cols_].fillna(self.medians_)
            self.scaler.fit(num_data)

        # Fit categorical encoder
        if self.active_cat_cols_:
            cat_data = X[self.active_cat_cols_].astype(str).fillna("missing")
            self.encoder.fit(cat_data)
            cat_feature_names = list(self.encoder.get_feature_names_out(self.active_cat_cols_))
        else:
            cat_feature_names = []

        self.feature_names_out_ = list(self.active_num_cols_) + cat_feature_names
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        X = X.copy()
        parts = []

        # Transform numerical columns
        if self.active_num_cols_:
            num_df = pd.DataFrame(index=X.index)
            for c in self.active_num_cols_:
                if c in X.columns:
                    num_df[c] = pd.to_numeric(X[c], errors="coerce").fillna(self.medians_.get(c, 0.0))
                else:
                    num_df[c] = self.medians_.get(c, 0.0)
            scaled_num = self.scaler.transform(num_df[self.active_num_cols_])
            parts.append(scaled_num)

        # Transform categorical columns
        if self.active_cat_cols_:
            cat_df = pd.DataFrame(index=X.index)
            for c in self.active_cat_cols_:
                if c in X.columns:
                    cat_df[c] = X[c].astype(str).fillna("missing")
                else:
                    cat_df[c] = "missing"
            encoded_cat = self.encoder.transform(cat_df[self.active_cat_cols_])
            parts.append(encoded_cat)

        if not parts:
            raise ValueError("No matching features found in DataFrame for transformation.")

        return np.hstack(parts)

    def get_feature_names_out(self, input_features=None):
        return np.array(self.feature_names_out_)
