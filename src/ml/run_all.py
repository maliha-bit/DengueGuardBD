"""
run_all.py — One command to run the entire ML pipeline.
Run: python src/ml/run_all.py
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

STEPS = [
    ("EDA",              "eda.py"),
    ("Preprocessing",    "preprocessing.py"),
    ("Risk Classifier",  "train_risk_classifier.py"),
    ("Case Forecaster",  "train_case_forecaster.py"),
    ("Death Forecaster", "train_death_forecaster.py"),
    ("Trend Predictor",  "train_trend_predictor.py"),
    ("Demo Predictions", "predict.py"),
]

for name, script in STEPS:
    print(f"\n{'=' * 70}\n>>> {name}\n{'=' * 70}")
    r = subprocess.run([sys.executable, str(HERE / script)], cwd=str(HERE))
    if r.returncode != 0:
        print(f"[FAILED] {script}")
        sys.exit(1)

print("\n[OK] Pipeline complete. Artifacts in src/ml/models/")