"""
Production ML Model Training Pipeline
Trains on all available network traffic data, executes cross-validation,
and exports deployable model artifacts with full metadata.
"""

import argparse
import json
import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.collection.traffic_collector import TrafficCollector
from src.preprocessing.preprocessor import TrafficDataCleaner
from src.prediction.model import DeployableNetworkForecastingModel


def run_cross_validation(X: pd.DataFrame, y: pd.Series, n_splits: int = 5):
    """Evaluates the model using Stratified K-Fold Cross Validation."""
    print(f"\n🔄 Running {n_splits}-Fold Stratified Cross-Validation on {len(X):,} samples...")
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

    all_y_true = []
    all_y_pred = []
    fold_f1_scores = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

        model = DeployableNetworkForecastingModel(n_estimators=100, random_state=42 + fold)
        model.fit(X_tr, y_tr)
        preds = model.predict(X_val)

        score = f1_score(y_val, preds, average="weighted")
        fold_f1_scores.append(score)
        all_y_true.extend(y_val.tolist())
        all_y_pred.extend(preds.tolist())
        print(f"  Fold {fold}/{n_splits} - Weighted F1-Score: {score:.4f}")

    mean_f1 = float(np.mean(fold_f1_scores))
    std_f1 = float(np.std(fold_f1_scores))
    print(f"✅ CV Average Weighted F1: {mean_f1:.4f} (+/- {std_f1:.4f})")

    report_dict = classification_report(all_y_true, all_y_pred, output_dict=True, zero_division=0)
    return {
        "cv_folds": n_splits,
        "mean_f1_score": round(mean_f1, 4),
        "std_f1_score": round(std_f1, 4),
        "classification_report": report_dict,
        "labels": sorted(list(set(all_y_true)))
    }


def train_production_pipeline(
    data_dir: str = "data/raw",
    output_model_path: str = "models/production_network_forecaster.pkl",
    metadata_path: str = "models/model_metadata.json",
    save_splits_to_processed: bool = True
):
    print("=" * 70)
    print("🚀 STARTING PRODUCTION NETWORK FORECASTING ML TRAINING PIPELINE")
    print("=" * 70)

    # 1. Load all available data
    collector = TrafficCollector(data_dir=data_dir)
    print(f"📂 Searching for datasets in: {data_dir}")
    df_raw = collector.load_all_data()
    print(f"📊 Loaded {len(df_raw):,} total network traffic records across {df_raw.shape[1]} columns.")

    # 2. Clean and check target distribution
    cleaner = TrafficDataCleaner()
    X, y = cleaner.clean_dataframe(df_raw, is_training=True, target_col="label")

    if y is None or len(y) == 0:
        raise ValueError("Target label column not found in data!")

    print("\n🎯 Class Distribution across all data:")
    counts = y.value_counts()
    for label, count in counts.items():
        print(f"  • {label:<20} {count:>8,} flows ({count / len(y):6.2%})")

    # 3. Perform 5-Fold Stratified Cross-Validation for honest metrics
    cv_metrics = run_cross_validation(X, y, n_splits=5)

    # 4. Save processed train/test splits for notebook experimentation & reproducibility
    if save_splits_to_processed:
        processed_dir = os.path.join(PROJECT_ROOT, "data", "processed")
        os.makedirs(processed_dir, exist_ok=True)
        train_df = df_raw.sample(frac=0.8, random_state=42)
        test_df = df_raw.drop(train_df.index)

        train_path = os.path.join(processed_dir, "train.csv")
        test_path = os.path.join(processed_dir, "test.csv")
        train_df.to_csv(train_path, index=False)
        test_df.to_csv(test_path, index=False)
        print(f"\n💾 Saved split datasets:")
        print(f"  • {train_path} ({len(train_df):,} rows)")
        print(f"  • {test_path} ({len(test_df):,} rows)")

    # 5. Train Final Deployable Model on 100% of available data
    print("\n🧠 Training final deployable model pipeline on 100% of data...")
    final_model = DeployableNetworkForecastingModel(
        n_estimators=150,
        max_depth=25,
        min_samples_split=2,
        class_weight="balanced",
        random_state=42
    )
    final_model.fit(X, y)
    print("✅ Full model training complete!")

    # 6. Extract feature importances
    top_features = final_model.get_feature_importances(top_n=15)
    print("\n🌟 Top Feature Importances in Production Model:")
    for feat_info in top_features:
        print(f"  • {feat_info['feature']:<30} : {feat_info['importance']:.4f}")

    # 7. Save model artifact
    models_dir = os.path.dirname(output_model_path)
    if models_dir:
        os.makedirs(models_dir, exist_ok=True)

    joblib.dump(final_model, output_model_path)
    print(f"\n💾 Production model successfully saved to: {output_model_path}")

    # 8. Save comprehensive metadata
    metadata = {
        "model_version": "1.0.0-production",
        "model_name": "AI-Based Network Forecasting & Threat Classifier",
        "dataset_samples": int(len(df_raw)),
        "classes": list(final_model.classes_),
        "features": list(final_model.feature_names_),
        "top_features": top_features,
        "cross_validation_metrics": cv_metrics,
        "input_schema": {col: str(df_raw[col].dtype) for col in df_raw.columns if col != "label"},
        "status": "DEPLOYMENT_READY"
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"📄 Model metadata saved to: {metadata_path}")

    print("\n" + "=" * 70)
    print("🎉 DEPLOYMENT-READY MODEL BUILD COMPLETED SUCCESSFULLY")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Train deploy-ready network forecasting ML model")
    parser.add_argument("--data-dir", default="data/raw", help="Path to raw dataset folder")
    parser.add_argument("--out", default="models/production_network_forecaster.pkl", help="Output model path")
    parser.add_argument("--metadata", default="models/model_metadata.json", help="Output metadata path")
    args = parser.parse_args()

    train_production_pipeline(
        data_dir=args.data_dir,
        output_model_path=args.out,
        metadata_path=args.metadata
    )


if __name__ == "__main__":
    main()
