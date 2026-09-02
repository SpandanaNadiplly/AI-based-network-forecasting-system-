"""
Risk Engine & Alert Assessment Module
Calculates composite risk scores (0-100), alert levels, and security recommendations.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List
import numpy as np


THREAT_BASE_SEVERITY = {
    "Normal": 0.0,
    "PortScan": 0.65,
    "BruteForce": 0.85,
    "DoS": 0.90,
    "DDoS": 0.95,
    "U2R": 0.98,
    "R2L": 0.85,
    "Botnet": 0.92,
    "Other": 0.50,
}

REMEDIATION_GUIDELINES = {
    "Normal": "No action required. Traffic conforms to standard baseline profile.",
    "PortScan": "Inspect source host for port scanning behavior. Consider rate-limiting or firewall drop rule for scanning source IP.",
    "BruteForce": "Enforce account lockout policies, fail2ban rate-limiting, and alert SOC for repeated credential brute-force attempts.",
    "DoS": "Activate DoS traffic shaping, enable SYN flood cookies/rate limiters, and inspect traffic spike on targeted destination port.",
    "DDoS": "Trigger upstream DDoS mitigation scrubbers, enforce edge BGP blackholing, and enable geo-blocking/rate-limiting.",
    "U2R": "CRITICAL: Isolate target host immediately. Execute privilege escalation audit and examine local security logs.",
    "Other": "Inspect anomalous packet payload and verify flow behavior in SIEM."
}


@dataclass
class ThreatAlert:
    predicted_class: str
    attack_probability: float
    all_probabilities: Dict[str, float]
    risk_score: float  # 0 - 100
    risk_level: str   # LOW, MEDIUM, HIGH, CRITICAL
    alert_triggered: bool
    recommendation: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ThreatRiskEvaluator:
    """Evaluates prediction probabilities to compute structured risk scores and alerts."""

    def __init__(self, alert_threshold: float = 0.50):
        self.alert_threshold = alert_threshold

    def evaluate(self, predicted_label: str, probabilities: Dict[str, float]) -> ThreatAlert:
        normal_prob = probabilities.get("Normal", 0.0)
        attack_prob = 1.0 - normal_prob if "Normal" in probabilities else (
            1.0 - probabilities.get(predicted_label, 0.0) if predicted_label == "Normal" else probabilities.get(predicted_label, 1.0)
        )

        # Base severity multiplier
        base_severity = THREAT_BASE_SEVERITY.get(predicted_label, 0.70)

        # Calculate composite 0-100 risk score
        if predicted_label == "Normal":
            # Normal traffic risk score remains very low unless uncertainty is high
            risk_score = round(max(0.0, (1.0 - normal_prob) * 30.0), 2)
        else:
            confidence = probabilities.get(predicted_label, attack_prob)
            raw_risk = (base_severity * 70.0) + (confidence * 30.0)
            risk_score = round(min(100.0, max(0.0, raw_risk)), 2)

        # Determine Risk Level
        if risk_score >= 80.0:
            risk_level = "CRITICAL"
        elif risk_score >= 50.0:
            risk_level = "HIGH"
        elif risk_score >= 25.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        alert_triggered = (predicted_label != "Normal") or (risk_score >= 35.0)
        recommendation = REMEDIATION_GUIDELINES.get(predicted_label, REMEDIATION_GUIDELINES["Other"])

        return ThreatAlert(
            predicted_class=predicted_label,
            attack_probability=round(float(attack_prob), 4),
            all_probabilities={k: round(float(v), 4) for k, v in probabilities.items()},
            risk_score=risk_score,
            risk_level=risk_level,
            alert_triggered=alert_triggered,
            recommendation=recommendation
        )
