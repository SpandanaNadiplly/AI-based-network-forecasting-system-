"""
Deployable Network Forecasting & Attack Detection Model Pipeline
"""

import datetime
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

from ..preprocessing.preprocessor import TrafficDataCleaner, NetworkFeaturePreprocessor
from ..features.engineering import NetworkFlowFeatureEngineer


class DeployableNetworkForecastingModel(BaseEstimator, ClassifierMixin):
    """
    Production-ready deployable pipeline for network traffic forecasting and attack classification.
    Encapsulates raw data cleaning, flow feature engineering, encoding/scaling, and classification.
    """

    def __init__(
        self,
        n_estimators: int = 150,
        max_depth: int = 25,
        min_samples_split: int = 2,
        class_weight: str = "balanced",
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.class_weight = class_weight
        self.random_state = random_state

        self.cleaner = TrafficDataCleaner()
        self.feature_engineer = NetworkFlowFeatureEngineer()
        self.preprocessor = NetworkFeaturePreprocessor()
        self.classifier = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            class_weight=self.class_weight,
            random_state=self.random_state,
            n_jobs=-1
        )

        self.classes_ = []
        self.feature_names_ = []
        self.metadata_: Dict[str, Any] = {}

    def fit(self, X: pd.DataFrame, y: Union[pd.Series, np.ndarray]):
        # 1. Clean Data & Remove leaks
        X_clean, _ = self.cleaner.clean_dataframe(X, is_training=True)

        # 2. Extract engineered network flow features
        X_eng = self.feature_engineer.transform(X_clean)

        # 3. Fit & transform preprocessor
        X_proc = self.preprocessor.fit_transform(X_eng)
        self.feature_names_ = list(self.preprocessor.get_feature_names_out())

        # 4. Fit classifier
        self.classifier.fit(X_proc, y)
        self.classes_ = list(self.classifier.classes_)

        # 5. Attach metadata
        self.metadata_ = {
            "model_type": "DeployableNetworkForecastingModel (RandomForest)",
            "classes": self.classes_,
            "feature_count": len(self.feature_names_),
            "features": self.feature_names_,
            "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "n_samples": len(X),
        }
        return self

    def predict(self, X: Union[pd.DataFrame, Dict, List]) -> np.ndarray:
        df = self._ensure_dataframe(X)
        X_clean, _ = self.cleaner.clean_dataframe(df, is_training=False)
        X_eng = self.feature_engineer.transform(X_clean)
        X_proc = self.preprocessor.transform(X_eng)
        return self.classifier.predict(X_proc)

    def predict_proba(self, X: Union[pd.DataFrame, Dict, List]) -> np.ndarray:
        df = self._ensure_dataframe(X)
        X_clean, _ = self.cleaner.clean_dataframe(df, is_training=False)
        X_eng = self.feature_engineer.transform(X_clean)
        X_proc = self.preprocessor.transform(X_eng)
        return self.classifier.predict_proba(X_proc)

    def get_feature_importances(self, top_n: int = 15) -> List[Dict[str, Any]]:
        if not hasattr(self.classifier, "feature_importances_"):
            return []
        importances = self.classifier.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        results = []
        for idx in sorted_idx[:top_n]:
            results.append({
                "feature": self.feature_names_[idx] if idx < len(self.feature_names_) else f"feature_{idx}",
                "importance": float(round(importances[idx], 4))
            })
        return results

    @staticmethod
    def _ensure_dataframe(data: Union[pd.DataFrame, Dict, List]) -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            return data.copy()
        if isinstance(data, dict):
            return pd.DataFrame([data])
        if isinstance(data, list):
            return pd.DataFrame(data)
        raise TypeError(f"Expected DataFrame, dict, or list of dicts, got {type(data)}")
