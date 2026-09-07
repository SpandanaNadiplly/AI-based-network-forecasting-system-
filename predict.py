"""
Command-Line Interface for Network Traffic Forecasting & Threat Prediction
Usage:
    python predict.py --file data/processed/test.csv --limit 10
    python predict.py --sample
"""

import argparse
import json
import os
import sys
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.prediction.predictor import NetworkForecastingPredictor


def run_sample_predictions(predictor: NetworkForecastingPredictor):
    print("=" * 70)
    print("🧪 RUNNING INFERENCE ON SAMPLE LIVE NETWORK FLOWS")
    print("=" * 70)

    sample_flows = [
        {
            "name": "Benign Web Browsing",
            "flow": {
                "duration": 35.2,
                "src_bytes": 1820.0,
                "dst_bytes": 1250.0,
                "packet_rate": 14.5,
                "connections_to_same_host": 3,
                "unique_dst_ports": 2,
                "failed_logins": 0,
                "dst_port": 443,
                "protocol_type": "tcp"
            }
        },
        {
            "name": "SYN Flood / DoS Spike",
            "flow": {
                "duration": 2.1,
                "src_bytes": 68.0,
                "dst_bytes": 20.0,
                "packet_rate": 620.0,
                "connections_to_same_host": 380,
                "unique_dst_ports": 1,
                "failed_logins": 0,
                "dst_port": 80,
                "protocol_type": "tcp"
            }
        },
        {
            "name": "Reconnaissance / Port Scan",
            "flow": {
                "duration": 0.4,
                "src_bytes": 32.0,
                "dst_bytes": 8.0,
                "packet_rate": 75.0,
                "connections_to_same_host": 2,
                "unique_dst_ports": 35,
                "failed_logins": 0,
                "dst_port": 1433,
                "protocol_type": "tcp"
            }
        },
        {
            "name": "SSH / FTP Credential Brute Force",
            "flow": {
                "duration": 8.5,
                "src_bytes": 340.0,
                "dst_bytes": 110.0,
                "packet_rate": 22.0,
                "connections_to_same_host": 45,
                "unique_dst_ports": 1,
                "failed_logins": 9,
                "dst_port": 22,
                "protocol_type": "tcp"
            }
        }
    ]

    for item in sample_flows:
        flow_name = item["name"]
        flow_data = item["flow"]
        res = predictor.predict_flow(flow_data)

        status_emoji = "🚨" if res["is_attack"] else "🟢"
        print(f"\n{status_emoji} Flow Type: {flow_name}")
        print(f"  • Prediction     : {res['predicted_label']} (Confidence: {res['confidence'] * 100:.1f}%)")
        print(f"  • Attack Prob    : {res['attack_probability'] * 100:.1f}%")
        print(f"  • Risk Score     : {res['risk_score']}/100 [{res['risk_level']}]")
        forecast = res.get("forecast", {})
        if forecast:
            print(f"  • T+1 Forecast   : {forecast.get('forecast_risk_level')} ({forecast.get('forecast_risk_score', 0):.1f}/100) [Confidence: {forecast.get('forecast_confidence', 0)*100:.0f}%]")
            print(f"  • Forecast Note  : {forecast.get('forecast_reason')}")
        print(f"  • Alert Trigger  : {'YES' if res['alert_triggered'] else 'NO'}")
        print(f"  • Recommendation : {res['recommendation']}")


def run_file_prediction(predictor: NetworkForecastingPredictor, file_path: str, limit: int = 10, output_csv: str = None):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    print(f"📄 Reading traffic data from: {file_path}")
    df = pd.read_csv(file_path)
    if limit:
        df = df.head(limit)

    results_df = predictor.predict_batch(df)
    print(f"\n📊 Batch Prediction Summary ({len(results_df)} flows):")
    print(results_df[["predicted_label", "confidence", "risk_score", "risk_level", "alert_triggered"]].to_string())

    if output_csv:
        results_df.to_csv(output_csv, index=False)
        print(f"\n💾 Saved prediction results to: {output_csv}")


def main():
    parser = argparse.ArgumentParser(description="Predict network traffic flows and detect cyber attacks")
    parser.add_argument("--model", default="models/production_network_forecaster.pkl", help="Path to trained model")
    parser.add_argument("--file", help="Path to input CSV file for batch prediction")
    parser.add_argument("--limit", type=int, default=10, help="Number of rows to predict from file")
    parser.add_argument("--out", help="Save predictions to CSV")
    parser.add_argument("--sample", action="store_true", help="Run quick sample test flows")
    args = parser.parse_args()

    predictor = NetworkForecastingPredictor.load(args.model)

    if args.file:
        run_file_prediction(predictor, args.file, limit=args.limit, output_csv=args.out)
    else:
        run_sample_predictions(predictor)


if __name__ == "__main__":
    main()
