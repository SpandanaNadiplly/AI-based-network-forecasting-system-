#!/bin/bash
# ============================================================
#  AI Network Forecasting System — Environment Setup Script
#  Run this once your internet connection is restored:
#    chmod +x setup_env.sh && ./setup_env.sh
# ============================================================

set -e
echo "=============================================="
echo " AI Network Forecasting System — Setup"
echo "=============================================="

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ---------- 1. Virtual Environment ----------
echo ""
echo "🔧 Step 1: Setting up virtual environment..."
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "  ✅ Virtual environment created."
else
  echo "  ✅ Virtual environment already exists."
fi
source venv/bin/activate

# ---------- 2. Upgrade pip ----------
echo ""
echo "🔧 Step 2: Upgrading pip..."
pip install --upgrade pip --quiet

# ---------- 3. Install packages (batch-by-batch for stability) ----------
echo ""
echo "🔧 Step 3: Installing core data libraries..."
pip install --retries 5 --timeout 60 pandas numpy scipy

echo ""
echo "🔧 Step 4: Installing ML libraries..."
pip install --retries 5 --timeout 60 scikit-learn xgboost lightgbm

echo ""
echo "🔧 Step 5: Installing deep learning (TensorFlow — large, be patient)..."
pip install --retries 5 --timeout 120 tensorflow keras

echo ""
echo "🔧 Step 6: Installing Jupyter..."
pip install --retries 5 --timeout 60 jupyter notebook ipython ipykernel

echo ""
echo "🔧 Step 7: Installing visualization & network tools..."
pip install --retries 5 --timeout 60 matplotlib seaborn scapy tqdm python-dotenv joblib

# ---------- 4. Register kernel ----------
echo ""
echo "🔧 Step 8: Registering Jupyter kernel..."
python -m ipykernel install --user --name=network-forecasting --display-name "Python (Network Forecasting)"

# ---------- 5. Done ----------
echo ""
echo "=============================================="
echo "✅ Environment setup complete!"
echo "  Activate : source venv/bin/activate"
echo "  Jupyter  : jupyter notebook notebooks/"
echo "=============================================="
