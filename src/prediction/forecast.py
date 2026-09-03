"""
Risk Forecasting Module
=======================
Predicts the risk level of the *next* time window based on the trend
across a sliding buffer of recent detection outputs.

This is a lightweight, rule-based-on-top-of-ML-output layer.
No deep learning or new dependencies are required — only numpy.

Design rationale (for project viva):
    The Random Forest detects what is happening *right now* in a single
    window.  RiskForecaster watches *across* windows: if attack
    probability is steadily climbing, that upward momentum is a stronger
    signal of imminent threat than any single window reading.  We
    quantify that momentum with three simple, interpretable signals and
    combine them with fixed weights.
"""

from __future__ import annotations

from collections import deque
from typing import Dict, List, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Risk level thresholds — kept identical to ThreatRiskEvaluator so that
# the forecast levels are directly comparable to the detection levels.
# ---------------------------------------------------------------------------
_LEVEL_THRESHOLDS: List[Tuple[float, str]] = [
    (80.0, "CRITICAL"),
    (50.0, "HIGH"),
    (25.0, "MEDIUM"),
    (0.0,  "LOW"),
]


def _score_to_level(score: float) -> str:
    """Map a 0-100 numeric score to a named risk level."""
    for threshold, level in _LEVEL_THRESHOLDS:
        if score >= threshold:
            return level
    return "LOW"


class RiskForecaster:
    """
    Sliding-window trend analyser that forecasts the risk level of the
    next network traffic window.

    Usage
    -----
    Instantiate once alongside the predictor, then call ``observe()``
    after every detection, and ``forecast_next_window()`` to read the
    current forecast.

        forecaster = RiskForecaster(window_count=8)

        # after each per-window detection:
        forecaster.observe(predicted_label, probabilities, risk_score)

        # read the forecast:
        forecast = forecaster.forecast_next_window()

    Parameters
    ----------
    window_count : int
        Number of recent windows to keep in the buffer (default 8).
        Larger values smooth out noise; smaller values react faster.

    Signal weights
    --------------
    Three signals are blended with fixed weights that sum to 1.0:

    attack_prob_slope (weight 0.45)
        The linear slope of the attack probability series across the
        buffer.  Positive slope means the attack likelihood is rising.
        This is the strongest single predictor of an incoming threat.

    risk_score_momentum (weight 0.35)
        Exponentially weighted moving average of the per-window risk
        scores, with more weight on recent windows.  Captures the
        overall severity trend independently of the class label.

    suspicious_window_ratio (weight 0.20)
        Fraction of buffered windows classified as non-Normal.
        Even if individual probabilities are modest, a high ratio of
        flagged windows indicates sustained suspicious behaviour.
    """

    WEIGHT_SLOPE: float = 0.45
    WEIGHT_MOMENTUM: float = 0.35
    WEIGHT_RATIO: float = 0.20

    def __init__(self, window_count: int = 8) -> None:
        if window_count < 2:
            raise ValueError("window_count must be at least 2 to compute a slope.")
        self.window_count = window_count

        # Each entry: {"predicted_label": str, "attack_prob": float, "risk_score": float}
        self._buffer: deque[Dict] = deque(maxlen=window_count)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def observe(
        self,
        predicted_label: str,
        probabilities: Dict[str, float],
        risk_score: float,
    ) -> None:
        """
        Record the detection result for one time window.

        Parameters
        ----------
        predicted_label : str
            The class label returned by the detector (e.g. ``"Normal"``,
            ``"DoS"``, ``"PortScan"``, ``"BruteForce"``).
        probabilities : dict
            Full class probability dict from the model, e.g.
            ``{"Normal": 0.82, "DoS": 0.06, ...}``.
        risk_score : float
            The 0-100 composite risk score already computed by
            ``ThreatRiskEvaluator.evaluate()``.
        """
        normal_prob = probabilities.get("Normal", 0.0)
        attack_prob = 1.0 - normal_prob

        self._buffer.append({
            "predicted_label": predicted_label,
            "attack_prob": float(attack_prob),
            "risk_score": float(risk_score),
        })

    def forecast_next_window(self) -> Dict:
        """
        Compute a forecast for the next time window based on the trend
        in the current buffer.

        Returns
        -------
        dict with keys:
            forecast_risk_score   : float  — 0-100 forecast risk score
            forecast_risk_level   : str    — LOW / MEDIUM / HIGH / CRITICAL
            forecast_reason       : str    — human-readable explanation
            forecast_confidence   : float  — 0.0-1.0 (rises with buffer fill)
            windows_observed      : int    — number of windows in buffer
        """
        n = len(self._buffer)

        # With fewer than 2 windows we cannot compute a slope at all.
        if n < 2:
            return {
                "forecast_risk_score": 0.0,
                "forecast_risk_level": "LOW",
                "forecast_reason": (
                    f"Insufficient history: only {n} window(s) observed. "
                    "Forecast becomes meaningful after 2+ windows."
                ),
                "forecast_confidence": 0.0,
                "windows_observed": n,
            }

        attack_probs = np.array([w["attack_prob"] for w in self._buffer])
        risk_scores  = np.array([w["risk_score"]  for w in self._buffer])
        labels       = [w["predicted_label"] for w in self._buffer]

        # --- Signal 1: linear slope of attack probability -----------------
        # x = window index (0, 1, ..., n-1)
        # We normalise to a "per-window" slope and scale it to 0-100.
        x = np.arange(n, dtype=float)
        slope = float(np.polyfit(x, attack_probs, 1)[0])  # slope in prob/window
        # A slope of +0.10 per window (rising 10% each step) maps to ~100.
        # Clamp at 0 (we only punish positive trends for forecast; flat/falling
        # is treated as low risk from this signal).
        slope_signal = float(np.clip(slope * 1000.0, 0.0, 100.0))

        # --- Signal 2: exponentially weighted risk score momentum ----------
        # Weights: most recent window gets weight n, oldest gets weight 1.
        ew_weights = np.arange(1, n + 1, dtype=float)
        ew_weights = ew_weights / ew_weights.sum()
        momentum_signal = float(np.dot(ew_weights, risk_scores))  # already 0-100

        # --- Signal 3: ratio of suspicious (non-Normal) windows -----------
        suspicious_count = sum(1 for lbl in labels if lbl != "Normal")
        ratio_signal = float(suspicious_count / n) * 100.0  # 0-100

        # --- Blend signals ------------------------------------------------
        forecast_score = (
            self.WEIGHT_SLOPE    * slope_signal    +
            self.WEIGHT_MOMENTUM * momentum_signal +
            self.WEIGHT_RATIO    * ratio_signal
        )
        forecast_score = float(np.clip(forecast_score, 0.0, 100.0))
        forecast_level = _score_to_level(forecast_score)

        # --- Confidence ---------------------------------------------------
        # Scales linearly with buffer fill.  A full buffer = 1.0.
        confidence = float(n / self.window_count)

        # --- Build human-readable reason ----------------------------------
        reason = self._build_reason(
            n, slope, slope_signal, momentum_signal, ratio_signal,
            suspicious_count, attack_probs
        )

        return {
            "forecast_risk_score": round(forecast_score, 2),
            "forecast_risk_level": forecast_level,
            "forecast_reason": reason,
            "forecast_confidence": round(confidence, 3),
            "windows_observed": n,
        }

    def reset(self) -> None:
        """Clear the observation buffer (e.g. after a long quiet period)."""
        self._buffer.clear()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_reason(
        self,
        n: int,
        slope: float,
        slope_signal: float,
        momentum_signal: float,
        ratio_signal: float,
        suspicious_count: int,
        attack_probs: np.ndarray,
    ) -> str:
        """Assemble a plain-English explanation of the dominant signal(s)."""
        parts: List[str] = []

        # Slope interpretation
        if slope_signal >= 40.0:
            direction = "rising sharply"
        elif slope_signal >= 15.0:
            direction = "rising steadily"
        elif slope <= -0.01:
            direction = "falling"
        else:
            direction = "flat"

        if slope_signal > 5.0:
            parts.append(
                f"Attack probability {direction} over last {n} window(s) "
                f"(slope {slope:+.3f}/window, "
                f"current {attack_probs[-1]:.0%})"
            )

        # Momentum interpretation
        if momentum_signal >= 70.0:
            parts.append(f"Recent risk scores are high (weighted avg {momentum_signal:.0f}/100)")
        elif momentum_signal >= 35.0:
            parts.append(f"Recent risk scores are elevated (weighted avg {momentum_signal:.0f}/100)")

        # Ratio interpretation
        if suspicious_count > 0:
            parts.append(
                f"{suspicious_count}/{n} recent window(s) flagged as non-Normal"
            )

        if not parts:
            return (
                f"No significant threat trend detected across {n} window(s). "
                "Traffic appears stable."
            )

        return "; ".join(parts) + "."
