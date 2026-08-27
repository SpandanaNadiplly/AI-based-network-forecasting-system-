#!/usr/bin/env python3
"""
NSL-KDD Dataset Downloader
===========================
Downloads the NSL-KDD dataset from GitHub mirror and prepares it
for the AI Network Forecasting pipeline.

Attack labels covered:
  - normal
  - DoS      (neptune, back, land, pod, smurf, teardrop, ...)
  - Probe     (portsweep, ipsweep, nmap, satan)
  - R2L       (guess_passwd, ftp_write, imap, ...)
  - U2R       (buffer_overflow, loadmodule, perl, rootkit)

Run: python download_nslkdd.py
"""

import os
import urllib.request
import sys

# ── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_RAW    = os.path.join(SCRIPT_DIR, "data", "raw")
os.makedirs(DATA_RAW, exist_ok=True)

# ── NSL-KDD files (GitHub mirror — no auth required) ─────────────────
BASE_URL = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master"

FILES = {
    "KDDTrain+.txt"         : f"{BASE_URL}/KDDTrain%2B.txt",
    "KDDTest+.txt"          : f"{BASE_URL}/KDDTest%2B.txt",
    "KDDTrain+_20Percent.txt": f"{BASE_URL}/KDDTrain%2B_20Percent.txt",
}

# ── Column names (41 features + label + difficulty) ──────────────────
COLUMNS = [
    "duration","protocol_type","service","flag","src_bytes","dst_bytes",
    "land","wrong_fragment","urgent","hot","num_failed_logins","logged_in",
    "num_compromised","root_shell","su_attempted","num_root","num_file_creations",
    "num_shells","num_access_files","num_outbound_cmds","is_host_login",
    "is_guest_login","count","srv_count","serror_rate","srv_serror_rate",
    "rerror_rate","srv_rerror_rate","same_srv_rate","diff_srv_rate",
    "srv_diff_host_rate","dst_host_count","dst_host_srv_count",
    "dst_host_same_srv_rate","dst_host_diff_srv_rate","dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate","dst_host_serror_rate","dst_host_srv_serror_rate",
    "dst_host_rerror_rate","dst_host_srv_rerror_rate",
    "label","difficulty_level"
]

# ── Attack → Category mapping ─────────────────────────────────────────
ATTACK_MAP = {
    # Normal
    "normal"          : "Normal",
    # DoS
    "back"            : "DoS",  "land"       : "DoS",  "neptune"   : "DoS",
    "pod"             : "DoS",  "smurf"      : "DoS",  "teardrop"  : "DoS",
    "apache2"         : "DoS",  "udpstorm"   : "DoS",  "processtable": "DoS",
    "mailbomb"        : "DoS",
    # Probe / Port Scan
    "ipsweep"         : "PortScan", "nmap"      : "PortScan",
    "portsweep"       : "PortScan", "satan"     : "PortScan",
    "mscan"           : "PortScan", "saint"     : "PortScan",
    # R2L (Remote to Local — includes Brute Force)
    "ftp_write"       : "BruteForce", "guess_passwd": "BruteForce",
    "imap"            : "BruteForce", "multihop"    : "BruteForce",
    "phf"             : "BruteForce", "spy"          : "BruteForce",
    "warezclient"     : "BruteForce", "warezmaster"  : "BruteForce",
    "snmpgetattack"   : "BruteForce", "named"        : "BruteForce",
    "xlock"           : "BruteForce", "xsnoop"       : "BruteForce",
    "sendmail"        : "BruteForce", "httptunnel"   : "BruteForce",
    "worm"            : "BruteForce", "snmpguess"    : "BruteForce",
    # U2R (privilege escalation)
    "buffer_overflow" : "U2R", "loadmodule": "U2R",
    "perl"            : "U2R", "rootkit"   : "U2R",
    "sqlattack"       : "U2R", "xterm"     : "U2R",
    "ps"              : "U2R",
}

def download_file(filename, url):
    dest = os.path.join(DATA_RAW, filename)
    if os.path.exists(dest):
        print(f"  ⏭  Already exists: {filename}")
        return dest
    print(f"  ⬇  Downloading {filename} ...", end=" ", flush=True)
    try:
        urllib.request.urlretrieve(url, dest)
        size_mb = os.path.getsize(dest) / (1024 * 1024)
        print(f"done ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"\n  ❌ Failed: {e}")
        return None
    return dest

def preprocess_and_save(raw_path, out_name):
    import pandas as pd

    print(f"\n  🔄 Preprocessing {os.path.basename(raw_path)} ...")
    df = pd.read_csv(raw_path, header=None, names=COLUMNS)

    # Map detailed labels → 5-class categories
    df["attack_category"] = df["label"].str.rstrip(".").map(
        lambda x: ATTACK_MAP.get(x, "Other")
    )

    # Drop difficulty column (not a feature)
    df.drop(columns=["difficulty_level"], inplace=True)

    out_path = os.path.join(SCRIPT_DIR, "data", "processed", out_name)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"  ✅ Saved → data/processed/{out_name}")
    print(f"     Shape  : {df.shape}")
    print(f"     Labels :\n{df['attack_category'].value_counts().to_string()}")
    return df

if __name__ == "__main__":
    print("=" * 55)
    print("  NSL-KDD Dataset Downloader")
    print("=" * 55)

    # 1. Download raw files
    print("\n📥 Downloading files from GitHub mirror...\n")
    for fname, url in FILES.items():
        download_file(fname, url)

    # 2. Preprocess
    print("\n⚙️  Preprocessing datasets...\n")
    try:
        import pandas as pd
        train_df = preprocess_and_save(
            os.path.join(DATA_RAW, "KDDTrain+.txt"),
            "nslkdd_train.csv"
        )
        test_df = preprocess_and_save(
            os.path.join(DATA_RAW, "KDDTest+.txt"),
            "nslkdd_test.csv"
        )
        print("\n✅ Download & preprocessing complete!")
        print(f"\n  📁 data/raw/       → raw .txt files")
        print(f"  📁 data/processed/ → nslkdd_train.csv, nslkdd_test.csv")
        print(f"\n  🚀 Next: open notebooks/02_data_exploration.ipynb")
    except ImportError:
        print("\n⚠️  pandas not installed yet — raw files downloaded.")
        print("   Run setup_env.sh first, then re-run this script.")
