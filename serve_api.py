"""
Production REST API & SOC Web Dashboard Server
Serves real-time inference endpoints and the AegisNet interactive web UI on localhost.

Usage:
    python serve_api.py --port 8080 --model models/production_network_forecaster.pkl
"""

import argparse
import json
import mimetypes
import os
import random
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.prediction.predictor import NetworkForecastingPredictor


GLOBAL_PREDICTOR = None
TEST_DATASET_CACHE = None


def get_test_dataset():
    global TEST_DATASET_CACHE
    if TEST_DATASET_CACHE is None:
        test_path = os.path.join(PROJECT_ROOT, "data", "processed", "test.csv")
        if os.path.exists(test_path):
            TEST_DATASET_CACHE = pd.read_csv(test_path)
    return TEST_DATASET_CACHE


class NetworkForecastingRequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for Network Forecasting Web Dashboard and REST API Server."""

    def _send_json(self, status_code: int, data: Dict[str, Any]):
        response_bytes = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(response_bytes)

    def _serve_static_file(self, file_path: str):
        if not os.path.exists(file_path):
            self._send_json(404, {"error": "Static file not found"})
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        with open(file_path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content)

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        # 1. Static Root & UI Assets
        if self.path == "/" or self.path == "/index.html":
            index_path = os.path.join(PROJECT_ROOT, "static", "index.html")
            self._serve_static_file(index_path)
            return

        if self.path.startswith("/static/"):
            rel_path = self.path[len("/static/"):]
            static_file_path = os.path.join(PROJECT_ROOT, "static", rel_path)
            self._serve_static_file(static_file_path)
            return

        # 2. API Endpoints
        if self.path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "service": "AegisNet AI Network Threat Forecasting Platform",
                "model_loaded": GLOBAL_PREDICTOR is not None,
                "version": "2.1.0-production"
            })
        elif self.path == "/metadata" or self.path == "/model-info":
            if GLOBAL_PREDICTOR is None:
                self._send_json(503, {"error": "Model not loaded"})
                return
            info = GLOBAL_PREDICTOR.get_model_info()
            self._send_json(200, info)
        elif self.path == "/forecast-state":
            # Returns the current forecaster's next-window prediction without
            # requiring a new detection call. Useful for polling from the dashboard.
            if GLOBAL_PREDICTOR is None:
                self._send_json(503, {"error": "Model not loaded"})
                return
            forecast = GLOBAL_PREDICTOR.forecaster.forecast_next_window()
            self._send_json(200, forecast)
        elif self.path == "/stream-sample":
            # Returns a realistic random network flow for live telemetry streaming
            test_df = get_test_dataset()
            if test_df is not None and len(test_df) > 0:
                sample_row = test_df.sample(1).iloc[0].to_dict()
            else:
                sample_row = {
                    "duration": round(random.uniform(0.1, 45.0), 2),
                    "src_bytes": round(random.uniform(20.0, 3000.0), 1),
                    "dst_bytes": round(random.uniform(10.0, 2500.0), 1),
                    "packet_rate": round(random.uniform(5.0, 800.0), 1),
                    "connections_to_same_host": random.randint(1, 400),
                    "unique_dst_ports": random.randint(1, 50),
                    "failed_logins": random.randint(0, 10),
                    "dst_port": random.choice([80, 443, 22, 21, 8080, 1433, 3306]),
                    "protocol_type": random.choice(["tcp", "udp"])
                }
            self._send_json(200, sample_row)
        elif self.path == "/dataset-summary":
            test_df = get_test_dataset()
            if test_df is not None:
                sample_flows = test_df.head(25).to_dict(orient="records")
            else:
                sample_flows = []
            self._send_json(200, {
                "total_test_rows": len(test_df) if test_df is not None else 0,
                "sample_test_flows": sample_flows
            })
        else:
            self._send_json(404, {"error": f"Endpoint {self.path} not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._send_json(400, {"error": "Empty request body"})
            return

        try:
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON payload: {str(e)}"})
            return

        if GLOBAL_PREDICTOR is None:
            self._send_json(503, {"error": "Model not loaded"})
            return

        if self.path == "/predict":
            try:
                if isinstance(payload, list):
                    payload = payload[0] if payload else {}
                result = GLOBAL_PREDICTOR.predict_flow(payload)
                self._send_json(200, result)
            except Exception as e:
                self._send_json(500, {"error": f"Prediction failed: {str(e)}"})

        elif self.path == "/predict_batch":
            try:
                if isinstance(payload, dict) and "flows" in payload:
                    flows = payload["flows"]
                elif isinstance(payload, list):
                    flows = payload
                else:
                    flows = [payload]

                results_df = GLOBAL_PREDICTOR.predict_batch(flows)
                response_records = results_df.to_dict(orient="records")
                self._send_json(200, {
                    "count": len(response_records),
                    "results": response_records
                })
            except Exception as e:
                self._send_json(500, {"error": f"Batch prediction failed: {str(e)}"})
        else:
            self._send_json(404, {"error": f"Endpoint {self.path} not found"})


def run_server(port: int = 8080, model_path: str = "models/production_network_forecaster.pkl"):
    global GLOBAL_PREDICTOR
    print(f"[*] Loading production model from: {model_path} ...")
    GLOBAL_PREDICTOR = NetworkForecastingPredictor.load(model_path)
    print("[OK] Model loaded successfully!")

    # Pre-cache test dataset
    get_test_dataset()

    server_address = ("", port)
    httpd = HTTPServer(server_address, NetworkForecastingRequestHandler)
    print("=" * 70)
    print(f"[*] AEGISNET DASHBOARD & API ACTIVE AT: http://localhost:{port}")
    print(f"    Open in browser : http://localhost:{port}")
    print(f"    API Health      : http://localhost:{port}/health")
    print(f"    Model Info      : http://localhost:{port}/metadata")
    print(f"    Forecast State  : http://localhost:{port}/forecast-state")
    print("=" * 70)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down API server...")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve Network Forecasting Dashboard & REST API")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--model", default="models/production_network_forecaster.pkl", help="Model file path")
    args = parser.parse_args()

    run_server(port=args.port, model_path=args.model)
