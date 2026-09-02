"""
Deployable Inference Engine
Provides single-flow and batch prediction APIs, schema validation, and alert enrichment.
"""

import os
from typing import Dict, Any, List, Union
import joblib
import pandas as pd
import numpy as np

from .model import DeployableNetworkForecastingModel
from ..alert.risk_engine import ThreatRiskEvaluator, ThreatAlert


class NetworkForecastingPredictor:
    """
    High-level production inference interface for network traffic analysis and forecasting.
    """

    def __init__(self, model_pipeline: DeployableNetworkForecastingModel):
        self.model = model_pipeline
        self.risk_evaluator = ThreatRiskEvaluator()
        self.classes = self.model.classes_
        self.metadata = getattr(self.model, "metadata_", {})

    @classmethod
    def load(cls, model_path: str = "models/production_network_forecaster.pkl") -> "NetworkForecastingPredictor":
        """Loads a serialized production model pipeline from disk."""
        if not os.path.exists(model_path):
            # Try searching relative to project root
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidate = os.path.join(base_dir, model_path)
            if os.path.exists(candidate):
                model_path = candidate
            else:
                raise FileNotFoundError(f"Model file not found at: {model_path}")

        loaded = joblib.load(model_path)
        if isinstance(loaded, dict) and "model" in loaded:
            model = loaded["model"]
        else:
            model = loaded

        return cls(model_pipeline=model)

    def predict_flow(self, flow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs real-time prediction on a single network traffic flow dictionary.
        Returns prediction, probability distributions, composite risk score, and alert details.
        """
        df = pd.DataFrame([flow_data])
        preds = self.model.predict(df)
        probas = self.model.predict_proba(df)[0]

        pred_label = str(preds[0])
        prob_dict = {str(cls_name): float(probas[i]) for i, cls_name in enumerate(self.classes)}

        alert: ThreatAlert = self.risk_evaluator.evaluate(pred_label, prob_dict)

        result = {
            "predicted_label": pred_label,
            "is_attack": pred_label != "Normal",
            "confidence": round(float(np.max(probas)), 4),
            "attack_probability": alert.attack_probability,
            "probabilities": alert.all_probabilities,
            "risk_score": alert.risk_score,
            "risk_level": alert.risk_level,
            "alert_triggered": alert.alert_triggered,
            "recommendation": alert.recommendation
        }
        return result

    def predict_batch(self, batch_data: Union[pd.DataFrame, List[Dict[str, Any]]]) -> pd.DataFrame:
        """
        Runs batch inference on a DataFrame or list of flow dictionaries.
        Returns enriched DataFrame with predictions, probabilities, risk scores, and alert statuses.
        """
        if isinstance(batch_data, list):
            df = pd.DataFrame(batch_data)
        elif isinstance(batch_data, pd.DataFrame):
            df = batch_data.copy()
        else:
            raise TypeError("batch_data must be a pandas DataFrame or a list of dictionaries")

        if len(df) == 0:
            return pd.DataFrame()

        preds = self.model.predict(df)
        probas = self.model.predict_proba(df)

        results = []
        for i, row_pred in enumerate(preds):
            prob_dict = {str(cls_name): float(probas[i][j]) for j, cls_name in enumerate(self.classes)}
            alert = self.risk_evaluator.evaluate(str(row_pred), prob_dict)
            results.append({
                "predicted_label": str(row_pred),
                "is_attack": str(row_pred) != "Normal",
                "confidence": round(float(np.max(probas[i])), 4),
                "attack_probability": alert.attack_probability,
                "risk_score": alert.risk_score,
                "risk_level": alert.risk_level,
                "alert_triggered": alert.alert_triggered,
                "recommendation": alert.recommendation
            })

        result_df = pd.DataFrame(results, index=df.index)
        return pd.concat([df, result_df], axis=1)

    def get_model_info(self) -> Dict[str, Any]:
        """Returns metadata, classes, and top feature importances of the deployable model."""
        return {
            "metadata": self.metadata,
            "classes": self.classes,
            "top_features": self.model.get_feature_importances(top_n=10)
        }
