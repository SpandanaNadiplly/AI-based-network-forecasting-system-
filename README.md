# AI-Based Network Traffic Forecasting System

## 🧠 Overview
An end-to-end AI/ML pipeline for detecting, classifying, and forecasting network attacks from live or captured traffic data.

## 🏗️ Architecture
```
Network Traffic Data
       ↓
  Data Collection          ← src/collection/
       ↓
 Data Preprocessing        ← src/preprocessing/
       ↓
 Feature Extraction        ← src/features/
       ↓
 Time-Window Analysis      ← src/features/
       ↓
  AI/ML Prediction         ← src/prediction/
       ↓
  ┌────┴────┐
  ↓         ↓
Normal   Suspicious → Attack Classification
                    → Attack Probability
                    → Risk Level Assessment
                    → Future Attack Forecast
                    → Alert / Dashboard      ← src/alert/
```

## 📁 Project Structure
```
AI-based-network-forecasting-system-/
│
├── data/
│   ├── raw/              # Raw PCAP / CSV traffic captures
│   ├── processed/        # Cleaned & normalized data
│   └── features/         # Extracted feature sets
│
├── notebooks/            # Jupyter notebooks for EDA & experimentation
│
├── src/
│   ├── collection/       # Traffic capture & ingestion
│   ├── preprocessing/    # Cleaning, normalization, encoding
│   ├── features/         # Feature extraction & time-window analysis
│   ├── prediction/       # ML models (training, inference)
│   └── alert/            # Risk scoring, forecasting, dashboard
│
├── models/               # Saved trained models (.pkl, .h5)
├── logs/                 # Runtime logs
│
├── requirements.txt      # Python dependencies
└── README.md
```

## 🚀 Setup

```bash
# 1. Clone the repo
git clone https://github.com/SpandanaNadiplly/AI-based-network-forecasting-system-.git
cd AI-based-network-forecasting-system-

# 2. Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Launch Jupyter Notebook
jupyter notebook notebooks/
```

## 🧪 Pipeline Stages

| Stage | Description | Key Libraries |
|-------|-------------|---------------|
| Data Collection | PCAP / CSV ingestion | `scapy`, `pandas` |
| Preprocessing | Normalize, encode, handle nulls | `pandas`, `scikit-learn` |
| Feature Extraction | Statistical + flow features | `numpy`, `scipy` |
| Time-Window Analysis | Sliding window traffic stats | `pandas` |
| AI/ML Prediction | Random Forest, XGBoost, LSTM | `scikit-learn`, `xgboost`, `tensorflow` |
| Attack Classification | Multi-class classifier | `scikit-learn` |
| Risk Assessment | Probability + risk scoring | `numpy` |
| Forecasting | Future attack prediction | `tensorflow`, `keras` |
| Alert / Dashboard | Visualization & alerts | `matplotlib`, `seaborn` |

## 📊 Datasets (recommended)
- [CICIDS 2017](https://www.unb.ca/cic/datasets/ids-2017.html) — Intrusion Detection
- [NSL-KDD](https://www.unb.ca/cic/datasets/nsl.html) — Classic network anomaly
- [UNSW-NB15](https://research.unsw.edu.au/projects/unsw-nb15-dataset) — Modern attack traffic

## 🔧 Tech Stack
- **Language**: Python 3.13
- **ML**: scikit-learn, XGBoost, LightGBM, TensorFlow/Keras
- **Data**: pandas, numpy, scipy
- **Network**: scapy
- **Visualization**: matplotlib, seaborn
- **Notebook**: Jupyter
