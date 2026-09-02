"""
Baseline attack classifier for the AI-based network forecasting system.

Goal: get ONE honest number on the board. Loads flow CSVs, cleans them,
trains a Random Forest, and prints per-class performance.

Usage:
    python train_baseline.py --data-dir data/raw --out models/baseline_rf.pkl
"""

import argparse
import glob
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Columns that leak the answer.
#
# These identify WHERE the traffic came from, not WHAT it looks like. The
# attacks in these datasets were generated from a handful of fixed machines,
# so a model given these columns just memorises "traffic from 172.16.0.1 is
# an attack" and scores 99.9% while learning nothing transferable.
# ---------------------------------------------------------------------------
LEAKY_COLUMNS = {
    "flow id", "source ip", "src ip", "destination ip", "dst ip",
    "source port", "src port", "destination port", "dst port",
    "timestamp", "protocol", "fwd header length.1", "unnamed: 0",
}


def load_data(data_dir):
    """Read every CSV in data_dir into one DataFrame."""
    paths = sorted(glob.glob(os.path.join(data_dir, "**", "*.csv"), recursive=True))
    if not paths:
        raise SystemExit(f"No CSV files found under {data_dir!r}")

    print(f"Found {len(paths)} CSV file(s):")
    frames = []
    for p in paths:
        print(f"  reading {os.path.basename(p)} ...", end=" ", flush=True)
        df = pd.read_csv(p, low_memory=False)
        print(f"{len(df):,} rows")
        frames.append(df)

    return pd.concat(frames, ignore_index=True)


def clean(df):
    """Normalise column names, drop leaky/broken columns, handle bad values."""
    # CIC-IDS CSVs ship with leading spaces in column names (' Label', not 'Label').
    # This bites everyone once. Normalise first so nothing downstream cares.
    df.columns = [c.strip() for c in df.columns]

    label_col = next((c for c in df.columns if c.lower() == "label"), None)
    if label_col is None:
        raise SystemExit(f"No 'Label' column found. Columns are: {list(df.columns)}")

    # Label values often have stray whitespace too.
    df[label_col] = df[label_col].astype(str).str.strip()

    # Flow-duration divisions produce inf when duration is 0. sklearn rejects inf.
    df = df.replace([np.inf, -np.inf], np.nan)

    before = len(df)
    df = df.dropna()
    print(f"\nDropped {before - len(df):,} rows with NaN/inf values "
          f"({len(df):,} remain)")

    y = df[label_col]
    X = df.drop(columns=[label_col])

    # Remove identifier columns that leak the label.
    drop = [c for c in X.columns if c.strip().lower() in LEAKY_COLUMNS]
    X = X.drop(columns=drop)
    if drop:
        print(f"Dropped {len(drop)} leaky/identifier column(s): {drop}")

    # Keep only numeric features for the baseline.
    non_numeric = X.select_dtypes(exclude=[np.number]).columns.tolist()
    if non_numeric:
        print(f"Dropped {len(non_numeric)} non-numeric column(s): {non_numeric}")
        X = X.drop(columns=non_numeric)

    # Constant columns carry zero information; drop them to speed things up.
    constant = X.columns[X.nunique() <= 1].tolist()
    if constant:
        print(f"Dropped {len(constant)} constant column(s)")
        X = X.drop(columns=constant)

    return X, y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="data/raw")
    ap.add_argument("--out", default="models/baseline_rf.pkl")
    ap.add_argument("--sample", type=int, default=None,
                    help="Train on N random rows instead of all (useful while iterating)")
    args = ap.parse_args()

    df = load_data(args.data_dir)
    print(f"\nCombined shape: {df.shape[0]:,} rows x {df.shape[1]} columns")

    X, y = clean(df)

    print("\nClass distribution:")
    counts = y.value_counts()
    for name, n in counts.items():
        print(f"  {name:<28} {n:>9,}  ({n / len(y):6.2%})")

    # Classes with only a couple of examples cannot be learned or evaluated.
    rare = counts[counts < 50].index.tolist()
    if rare:
        print(f"\nRemoving {len(rare)} class(es) with <50 examples: {rare}")
        keep = ~y.isin(rare)
        X, y = X[keep], y[keep]

    if args.sample and args.sample < len(X):
        X = X.sample(args.sample, random_state=42)
        y = y.loc[X.index]
        print(f"\nSampled down to {len(X):,} rows for a faster run")

    # NOTE: this is a random split. It is fine as a first baseline, but it
    # slightly overstates performance because flows from the same attack burst
    # can land on both sides. Once this works, switch to splitting by capture
    # day (train on Mon-Wed, test on Thu-Fri) and compare the two numbers.
    # The gap between them is the honest measure of how much you have learned.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    print(f"\nTrain: {len(X_train):,} rows   Test: {len(X_test):,} rows")

    print("\nTraining Random Forest ...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,          # limits memorisation; raise later and compare
        class_weight="balanced",  # stops the model ignoring rare attack classes
        n_jobs=-1,
        random_state=42,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    # Read the per-class recall column: it tells you what fraction of each real
    # attack type you actually caught. Overall accuracy is meaningless here
    # because ~80% of the traffic is benign.
    print("\n" + "=" * 70)
    print(classification_report(y_test, y_pred, digits=3, zero_division=0))
    print("=" * 70)

    labels = sorted(y.unique())
    cm = pd.DataFrame(
        confusion_matrix(y_test, y_pred, labels=labels),
        index=[f"true:{l}" for l in labels],
        columns=[f"pred:{l}" for l in labels],
    )
    print("\nConfusion matrix (rows = truth, columns = prediction):")
    print(cm.to_string())

    # If one feature dominates at >40% importance, be suspicious: it is often
    # a leak you have not spotted yet.
    print("\nTop 15 features by importance:")
    imp = pd.Series(clf.feature_importances_, index=X.columns).sort_values(ascending=False)
    for name, score in imp.head(15).items():
        print(f"  {score:.4f}  {name}")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    joblib.dump({"model": clf, "features": list(X.columns)}, args.out)
    print(f"\nSaved model to {args.out}")


if __name__ == "__main__":
    main()
