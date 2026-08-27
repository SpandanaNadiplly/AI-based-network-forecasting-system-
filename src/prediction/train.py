import os
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import joblib
# pyrefly: ignore [missing-import]
from sklearn.model_selection import train_test_split
# pyrefly: ignore [missing-import]
from sklearn.preprocessing import StandardScaler, OneHotEncoder
# pyrefly: ignore [missing-import]
from sklearn.compose import ColumnTransformer
# pyrefly: ignore [missing-import]
from sklearn.pipeline import Pipeline
# pyrefly: ignore [missing-import]
from sklearn.ensemble import RandomForestClassifier
# pyrefly: ignore [missing-import]
from sklearn.metrics import classification_report, confusion_matrix

def train_model():
    print("🚀 Ingesting synthetic network traffic data...")
    data_path = "/Users/spandana/Desktop/AD/AI-based-network-forecasting-system-/data/raw/synthetic_network_traffic.csv"
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")
        
    df = pd.read_csv(data_path)
    print(f"📋 Loaded dataset with shape: {df.shape}")
    
    # Define columns
    target_col = "label"
    categorical_cols = ["protocol_type"]
    numerical_cols = [col for col in df.columns if col not in [target_col] + categorical_cols]
    
    print(f"🔢 Numerical features: {numerical_cols}")
    print(f"🔤 Categorical features: {categorical_cols}")
    print(f"🎯 Target variable: {target_col}")
    
    # Split features and target
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"💪 Training set size: {X_train.shape[0]} samples")
    print(f"🧪 Testing set size: {X_test.shape[0]} samples")
    
    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
        ]
    )
    
    # Full training pipeline
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)),
        ]
    )
    
    # Fit model
    print("🧠 Training Random Forest model...")
    pipeline.fit(X_train, y_train)
    print("✅ Model training complete.")
    
    # Evaluate model
    print("\n📊 Evaluating model on test set...")
    y_pred = pipeline.predict(X_test)
    
    print("\n🎯 Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\n🧩 Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Save model and pipeline
    os.makedirs("/Users/spandana/Desktop/AD/AI-based-network-forecasting-system-/models", exist_ok=True)
    model_save_path = "/Users/spandana/Desktop/AD/AI-based-network-forecasting-system-/models/network_forecasting_pipeline.pkl"
    joblib.dump(pipeline, model_save_path)
    print(f"\n💾 Pipeline successfully saved to: {model_save_path}")

if __name__ == "__main__":
    train_model()
