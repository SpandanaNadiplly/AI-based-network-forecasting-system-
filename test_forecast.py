"""
Forecast Demo & Acceptance Test
================================
Feeds synthetic window sequences directly into RiskForecaster and prints the
forecast output at each step.  No trained model or running API needed — this
exercises the forecasting layer in isolation.

Usage:
    python test_forecast.py

Expected behaviour (acceptance criteria):
    Scenario 1 (Normal flat)   → forecast score stays LOW (< 20) throughout.
    Scenario 2 (Rising attack) → forecast score climbs to HIGH/CRITICAL by the
                                  last few windows, *before* the highest-risk
                                  single window would alone trigger an alert.
    Scenario 3 (Recovering)    → after a burst of attacks, Normal windows pull
                                  the forecast score back down noticeably.
"""

import sys
import os
import importlib.util

# Allow running from repo root without installing the package.
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import RiskForecaster directly from its source file so this script only
# requires numpy — not sklearn/joblib from the rest of the model stack.
# This keeps the demo runnable without a full environment.
_forecast_path = os.path.join(PROJECT_ROOT, "src", "prediction", "forecast.py")
_spec = importlib.util.spec_from_file_location("forecast", _forecast_path)
_mod  = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
RiskForecaster = _mod.RiskForecaster


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bar(value: float, width: int = 30) -> str:
    """ASCII progress bar for a 0-100 value."""
    filled = int(round(value / 100 * width))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def _level_colour(level: str) -> str:
    """ANSI colour prefix for terminal output."""
    colours = {
        "LOW":      "\033[92m",   # green
        "MEDIUM":   "\033[93m",   # yellow
        "HIGH":     "\033[91m",   # red
        "CRITICAL": "\033[95m",   # magenta
    }
    reset = "\033[0m"
    return colours.get(level, "") + level + reset


def run_scenario(
    name: str,
    windows: list,
    window_count: int = 8,
) -> None:
    """
    Feed a sequence of synthetic window observations into a fresh RiskForecaster
    and print the forecast after each step.

    Each entry in `windows` is a tuple:
        (predicted_label: str, probabilities: dict, risk_score: float)
    """
    print(f"\n{'=' * 70}")
    print(f"  SCENARIO: {name}")
    print(f"{'=' * 70}")
    print(f"  {'Step':>4}  {'Label':>10}  {'AttkP':>6}  {'CurrRisk':>8}  {'FcstScore':>9}  {'FcstLevel':>10}  {'Conf':>5}")
    print(f"  {'-'*4}  {'-'*10}  {'-'*6}  {'-'*8}  {'-'*9}  {'-'*10}  {'-'*5}")

    forecaster = RiskForecaster(window_count=window_count)

    for step, (label, probs, risk_score) in enumerate(windows, start=1):
        forecaster.observe(label, probs, risk_score)
        fc = forecaster.forecast_next_window()

        atk_p = 1.0 - probs.get("Normal", 1.0)
        print(
            f"  {step:>4}  {label:>10}  {atk_p:>5.0%}  {risk_score:>7.1f}  "
            f"{fc['forecast_risk_score']:>8.1f}  "
            f"{_level_colour(fc['forecast_risk_level']):>10}  "
            f"{fc['forecast_confidence']:>4.0%}"
        )

    # Print final forecast details
    final = forecaster.forecast_next_window()
    print(f"\n  Final forecast score : {final['forecast_risk_score']:.1f}/100  {_bar(final['forecast_risk_score'])}")
    print(f"  Final forecast level : {_level_colour(final['forecast_risk_level'])}")
    print(f"  Reason               : {final['forecast_reason']}")
    print(f"  Confidence           : {final['forecast_confidence']:.0%} ({final['windows_observed']} windows)")


# ---------------------------------------------------------------------------
# Synthetic window definitions
# ---------------------------------------------------------------------------

def _normal_probs(normal_p: float = 0.92) -> dict:
    """Build a realistic-looking probability dict for a 'Normal' window."""
    residual = 1.0 - normal_p
    return {
        "Normal":     normal_p,
        "DoS":        round(residual * 0.40, 4),
        "PortScan":   round(residual * 0.35, 4),
        "BruteForce": round(residual * 0.25, 4),
    }


def _attack_probs(attack_class: str, attack_p: float) -> dict:
    """Build a probability dict for an attack window with the given confidence."""
    normal_p = 1.0 - attack_p
    other_classes = [c for c in ["DoS", "PortScan", "BruteForce"] if c != attack_class]
    split = normal_p * 0.1  # tiny residual among non-predicted classes
    probs = {"Normal": round(normal_p, 4), attack_class: round(attack_p, 4)}
    for c in other_classes:
        probs[c] = round(split / len(other_classes), 4)
    return probs


# ---------------------------------------------------------------------------
# Scenario 1 — Flat Normal traffic
# All windows Normal, attack probability stays below 10%.
# Expected: forecast score stays LOW (< 20) throughout.
# ---------------------------------------------------------------------------
SCENARIO_1 = [
    ("Normal", _normal_probs(0.94), 1.8),
    ("Normal", _normal_probs(0.92), 2.4),
    ("Normal", _normal_probs(0.91), 2.7),
    ("Normal", _normal_probs(0.93), 2.1),
    ("Normal", _normal_probs(0.90), 3.0),
    ("Normal", _normal_probs(0.92), 2.4),
    ("Normal", _normal_probs(0.94), 1.8),
    ("Normal", _normal_probs(0.91), 2.7),
]

# ---------------------------------------------------------------------------
# Scenario 2 — Rising attack probability (DoS escalation)
# Attack probability climbs from ~5% to ~88% over 8 windows.
# Expected: forecast crosses HIGH (≥50) by window 5-6, CRITICAL-ish by window 8,
# *before* any single window risk score alone would trigger the highest alert.
# ---------------------------------------------------------------------------
SCENARIO_2 = [
    ("Normal",  _attack_probs("DoS", 0.05),  2.0),   # barely above baseline
    ("Normal",  _attack_probs("DoS", 0.12),  4.2),
    ("Normal",  _attack_probs("DoS", 0.22), 11.0),
    ("PortScan",_attack_probs("DoS", 0.36), 25.5),   # first classification change
    ("DoS",     _attack_probs("DoS", 0.51), 45.0),
    ("DoS",     _attack_probs("DoS", 0.65), 56.5),
    ("DoS",     _attack_probs("DoS", 0.77), 64.0),
    ("DoS",     _attack_probs("DoS", 0.88), 71.6),
]

# ---------------------------------------------------------------------------
# Scenario 3 — Attack burst followed by recovery
# 4 attack windows then 4 Normal windows.
# Expected: score rises then falls noticeably as Normal windows accumulate.
# ---------------------------------------------------------------------------
SCENARIO_3 = [
    ("BruteForce", _attack_probs("BruteForce", 0.80), 62.5),
    ("BruteForce", _attack_probs("BruteForce", 0.85), 65.5),
    ("BruteForce", _attack_probs("BruteForce", 0.82), 63.5),
    ("BruteForce", _attack_probs("BruteForce", 0.78), 59.6),
    ("Normal",     _normal_probs(0.72),                 8.4),
    ("Normal",     _normal_probs(0.85),                 4.5),
    ("Normal",     _normal_probs(0.91),                 2.7),
    ("Normal",     _normal_probs(0.94),                 1.8),
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    print("\n" + "=" * 70)
    print("  RiskForecaster -- Forecast Demo & Acceptance Test")
    print("  (No model or API needed -- exercises the forecasting layer only)")
    print("=" * 70)

    run_scenario("Flat Normal Traffic (expect LOW throughout)", SCENARIO_1)
    run_scenario("Rising DoS Attack Probability (expect HIGH->CRITICAL)", SCENARIO_2)
    run_scenario("Attack Burst then Recovery (expect score fall after window 4)", SCENARIO_3)

    print(f"\n{'=' * 70}")
    print("  Done.  Check that:")
    print("    * Scenario 1 : forecast score stays below 20 throughout")
    print("    * Scenario 2 : forecast score crosses 50 (HIGH) by window 5-6,")
    print("                   and reaches >=65 by window 8")
    print("    * Scenario 3 : forecast score clearly drops in the second half")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
