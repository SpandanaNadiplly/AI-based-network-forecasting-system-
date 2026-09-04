# AEGIS·NET AI: Comprehensive System Summary & Operational Manual

---

## 1. Executive Summary

**AEGIS·NET AI (v2.1 PRO)** is an enterprise-grade, machine-learning-driven **Network Intrusion Detection & Predictive Threat Defense Platform**.

The system combines:
1. **High-Accuracy Multi-Class Classifier**: A trained Random Forest model with 100 decision trees and 16 engineered features achieving **99.98% accuracy** and a **1.000 ROC-AUC** across 4 traffic classes:
   - `Normal` (Legitimate enterprise web/API traffic)
   - `DoS` (Volumetric SYN floods and packet exhaustion)
   - `PortScan` (Reconnaissance and port sweep probes)
   - `BruteForce` (Authentication credential stuffing on SSH/FTP)
2. **Predictive Risk & EWMA Forecasting Engine**: Calculates real-time threat velocity and forecasts the threat level for the **next monitoring window ($T+1$)**, moving beyond reactive detection to proactive threat anticipation.
3. **RESTful Telemetry API**: Localhost HTTP daemon (`serve_api.py`) exposing sub-2ms inference endpoints (`/predict`, `/predict_batch`, `/forecast-state`, `/stream-sample`, `/metadata`).
4. **Interactive SOC Command Center**: Dark-themed, real-time Security Operations Center (SOC) dashboard built with Vanilla CSS, Chart.js, and asynchronous JavaScript.

---

## 2. Network Scanning Mechanism: Is It Scanning Your Laptop or Whole Network?

### Clarification:
> **The platform is currently operating in AI Telemetry Ingestion & Real-Time Flow Inference Mode.**

- **What it is currently processing**:
  - The live dashboard streams **network flow telemetry vectors** (packet rate, byte asymmetry, failed logins, destination ports, connection frequencies) sampled from the evaluation dataset (`data/processed/test.csv`) via the `/stream-sample` endpoint.
  - When you interact with the sliders or presets, it sends the exact flow parameters directly to the local AI inference engine via `POST /predict`.
- **Is it silently sniffing raw Wi-Fi/Ethernet packets (Promiscuous Mode)?**:
  - **No.** It does not capture raw physical network interface frames (like Wireshark or `libpcap` on `en0`/`eth0`). This prevents unauthorized eavesdropping, driver permission errors, and high CPU usage.
- **Can it monitor real physical network / laptop traffic?**:
  - **Yes.** Because the server exposes standard REST API endpoints (`POST /predict` and `POST /predict_batch`), any flow exporter (e.g., **Zeek/Bro**, **Suricata**, **Argus**, **Cisco NetFlow**, or a local Python packet sniffer) can pipe real laptop or physical network traffic directly into this system.

---

## 3. Detailed UI Button & Control Guide

Here is an explanation of what **every button, tab, and slider** does in the web interface:

### 3.1 Top Command Header

| Control / Button | Icon | Action & Functionality |
| :--- | :--- | :--- |
| **Sound Alerts Toggle** | 🔊 / 🔇 (`#btnAudioToggle`) | Enables/mutes the Web Audio API audio synthesizer. When enabled, high-risk attack detections trigger real-time audible warning klaxons and normal flows trigger subtle clicks. |
| **Export Incident Report** | 🛡️ (`triggerQuickMitigationExport()`) | Instantly generates and downloads a formatted JSON threat audit log (`AegisNet_Threat_Audit_<timestamp>.json`) containing summary metrics, class distributions, and the last 15 blocked threats. |
| **Model Status Badge** | 🟢 (`#navModelStatus`) | Live ping indicator confirming the Random Forest model is loaded in memory and actively responding. |
| **Inference Latency** | ⚡ (`#navLatency`) | Displays live round-trip API prediction latency in milliseconds (typically `~1.0ms - 1.5ms`). |
| **Global DEFCON Badge** | 📡 (`#navDefcon`) | Dynamic threat posture gauge: updates automatically from **DEFCON 4 (Normal)** to **DEFCON 3 (Elevated)** or **DEFCON 1 (Severe)** depending on real-time threat frequency. |

---

### 3.2 Top KPI Performance Ribbon

1. **Total Flows Analyzed**: Live counter tracking cumulative flows processed since the session began.
2. **Safe / Normal Flows**: Counter & percentage badge of legitimate, non-malicious traffic.
3. **Threats Intercepted**: Counter & percentage badge of blocked attacks (DoS, PortScan, BruteForce).
4. **Next-Window Forecast**: Predictive risk score ($0\% - 100\%$) and risk category (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with AI trend explanation.

---

### 3.3 Navigation Tabs

The command center features **5 dedicated tactical tabs**:

```
[ Live SOC Radar & Stream ] [ Attack Simulator & Lab ] [ Predictive Horizon ] [ Batch Forensics & CSV ] [ AI Pipeline & Metadata ]
```

---

### 3.4 Tab 1: 📡 Live SOC Radar & Stream

| Button / Control | Type | How It Works |
| :--- | :--- | :--- |
| **Start Live Traffic / Pause Stream** | Primary Toggle Button (`#btnToggleLiveStream`) | Starts or pauses an asynchronous background loop that polls `/stream-sample`, runs AI prediction on each packet, streams rows into the live table, and updates charts in real time. |
| **Speed Dropdown** | Dropdown Selector (`#streamSpeed`) | Adjusts the packet ingestion interval between **0.6s (Fast)**, **1.2s (Normal)**, and **2.0s (Slow)**. |
| **Inject Attack** | Action Button (`#injectRandomAttack`) | Immediately generates and fires a synthetic high-severity attack burst into the stream to demonstrate instant detection and alert response. |
| **Search Filter Input** | Text Input (`#streamSearch`) | Dynamically filters the live stream table by port number, protocol (`TCP`/`UDP`), or classification label without pausing the stream. |
| **Traffic Type Selector** | Dropdown (`#streamFilter`) | Filters visible rows by `All Traffic`, `Threats Only`, `Safe Only`, `DoS Only`, `PortScan Only`, or `BruteForce Only`. |
| **Inspect Flow Button** | Table Row Button (`.btn-inspect-row`) | Opens the **Deep Packet Inspector Modal** for that specific flow, displaying all 16 raw features, raw JSON payload, and a 1-click **Copy JSON** button. |

---

### 3.5 Tab 2: 🎯 Attack Simulator & Interactive Tuning Lab

| Control / Slider | Type | Function & Behavior |
| :--- | :--- | :--- |
| **Normal Web Flow** | Preset Button (`#presetBtn-normal`) | Preloads standard HTTPS parameters (`Port 443`, `14.5 pkts/s`, `0 failed logins`). AI classifies as **Normal Traffic (0% Risk)**. |
| **DoS Traffic Flood** | Preset Button (`#presetBtn-dos`) | Preloads volumetric attack parameters (`Port 80`, `620 pkts/s`, `380 conns to host`). AI classifies as **DoS Attack (95%+ Risk)**. |
| **Port Scan (Recon)** | Preset Button (`#presetBtn-portscan`) | Preloads scanning parameters (`35 unique dst ports`, `0.4s duration`). AI classifies as **PortScan Attack**. |
| **SSH / Auth Brute Force** | Preset Button (`#presetBtn-bruteforce`) | Preloads brute-force parameters (`Port 22`, `9 failed logins`). AI classifies as **BruteForce Attack**. |
| **Reset Baseline** | Button (`resetSimulatorDefaults()`) | Resets all sliders to standard normal traffic default values. |
| **Packet Rate Slider** | Range Slider (`0.5 - 1000 pkts/s`) | Adjusts traffic intensity. High values combined with many connections trigger DoS detection. |
| **Connections to Same Host** | Range Slider (`1 - 500`) | Adjusts connection concurrency targeting a single destination. |
| **Unique Destination Ports** | Range Slider (`1 - 60`) | Adjusts the number of ports contacted. High values trigger PortScan detection. |
| **Failed Login Attempts** | Range Slider (`0 - 25`) | Adjusts authentication failures. Values $\ge 3$ trigger BruteForce detection. |
| **Outbound / Inbound Bytes** | Range Sliders (`10B - 8000B`) | Modifies byte asymmetry and transfer ratios. |
| **Flow Duration** | Range Slider (`0.1s - 120s`) | Modifies flow lifetime. |
| **Destination Port Selector** | Dropdown (`443, 80, 22, 21, 1433, 3306, 8080`) | Changes the target service port. |
| **Deploy IP Block** | Playbook Button (`applyPlaybookMitigation('block_ip')`) | Simulates deploying a firewall quarantine rule on the attacker IP with an on-screen toast alert. |
| **Enable Rate-Limiting** | Playbook Button (`applyPlaybookMitigation('rate_limit')`) | Simulates applying traffic shaping / SYN-cookie rate-limiting. |
| **Isolate Port** | Playbook Button (`applyPlaybookMitigation('close_port')`) | Simulates shutting down or restricting the target vulnerable port. |

---

### 3.6 Tab 3: 🔮 Predictive Threat Horizon

- **Horizon Trend Chart**: Interactive Chart.js graph displaying past anomaly risk vs. projected $T+1$ risk trajectory with confidence boundaries.
- **Threat Velocity & Momentum**: Gauges measuring rate of anomaly acceleration.
- **Early-Warning Banner**: Alerts security teams in advance if risk trends indicate an imminent volumetric attack.

---

### 3.7 Tab 4: 🧪 Batch Forensics & CSV Dataset Evaluator

| Button / Control | Type | How It Works |
| :--- | :--- | :--- |
| **Load 2,040 Test Set Flows** | Batch Button (`loadSampleTestBatch()`) | Fetches the full test dataset batch from `/dataset-summary`, submits it to `/predict_batch`, and renders a complete breakdown with totals for DoS, PortScan, and BruteForce. |
| **Upload Custom Flow CSV** | File Input Button (`#batchCsvInput`) | Allows uploading any standard CSV traffic capture file. The client parses the CSV and runs batch inference on all rows via the local API. |

---

### 3.8 Tab 5: 🧠 AI Pipeline & Model Intelligence

- **Feature Importance Chart**: Dynamically renders a horizontal Gini Importance bar chart directly from the model metadata (`total_bytes`, `unique_dst_ports`, `dst_bytes`, `port_dispersion_ratio`, etc.).
- **Model Architecture Spec Grid**: Displays model hyperparameters (100 estimators, 10,200 training samples, 16 features, 99.98% accuracy).
- **Feature Pills Matrix**: Interactive badges highlighting all 16 engineered mathematical features used during inference.

---

### 3.9 Deep Packet Inspector Modal

- **Close Inspector (`&times;` or Button)**: Closes the modal flyout.
- **Copy Raw Telemetry JSON**: Copies the complete feature dictionary and prediction result directly to your system clipboard for reporting or debugging.

---

## 4. Summary Table of Endpoints

| Endpoint | Method | Role |
| :--- | :--- | :--- |
| `GET /` | HTML | Serves the main SOC dashboard UI |
| `GET /health` | JSON | Service status, model loaded confirmation, version |
| `GET /metadata` | JSON | Model architecture, class labels, and feature importances |
| `GET /forecast-state` | JSON | Current next-window risk forecast without submitting new data |
| `GET /stream-sample` | JSON | Returns a single realistic flow for live telemetry streaming |
| `GET /dataset-summary` | JSON | Returns cached test dataset rows for batch evaluation |
| `POST /predict` | JSON | Single flow classification and risk forecasting |
| `POST /predict_batch` | JSON | High-throughput batch classification for multiple flows |
