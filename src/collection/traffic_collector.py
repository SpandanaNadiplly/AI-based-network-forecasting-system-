"""
Traffic Collection Module
Handles loading network traffic files (CSV, PCAP) and streaming synthetic or live captured flows.
"""

import glob
import os
from typing import List, Generator, Dict, Any
import pandas as pd


class TrafficCollector:
    """Collects, discovers, and reads network traffic datasets from files or live streams."""

    def __init__(self, data_dir: str = "data/raw"):
        self.data_dir = data_dir

    def discover_csv_files(self) -> List[str]:
        """Finds all CSV traffic capture files in data_dir."""
        pattern = os.path.join(self.data_dir, "**", "*.csv")
        files = sorted(glob.glob(pattern, recursive=True))
        return files

    def load_all_data(self) -> pd.DataFrame:
        """Loads and concatenates all available CSV traffic data into a single DataFrame."""
        files = self.discover_csv_files()
        if not files:
            raise FileNotFoundError(f"No CSV traffic files found in {self.data_dir}")

        frames = []
        for file_path in files:
            df = pd.read_csv(file_path, low_memory=False)
            frames.append(df)

        combined_df = pd.concat(frames, ignore_index=True)
        return combined_df

    def stream_flows(self, batch_size: int = 1) -> Generator[List[Dict[str, Any]], None, None]:
        """Simulates live traffic ingestion by streaming flow records."""
        df = self.load_all_data()
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i : i + batch_size]
            yield batch.to_dict(orient="records")
