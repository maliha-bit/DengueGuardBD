
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, f1_score, classification_report

HERE = Path(__file__).resolve().parent
CLEAN_CSV = HERE / "cleaned_dataset.csv"
ART = HERE / "models"
ART.mkdir(exist_ok=True)

FEATURES = [
    'Pollution_ord', 'Density_ord', 'temp_c', 'Humidity', 'pressure_mbar',
    'Infected_lag1', 'Infected_lag2', 'Infected_lag3', 'Death_lag1',
    'Infected_roll3', 'Infected_roll6', 'Humidity_roll3',
    'month_sin', 'month_cos', 'is_monsoon'
]
TARGET = 'target_trend_up'

print("=" * 70)
print("Train: Trend Predictor (up/down)")
print("=" * 70)

df = pd.read_csv(CLEAN_CSV).dropna(subset=FEATURES + [TARGET])
X = df[FEATURES]
y = df[TARGET].astype(int)
print(f"Samples: {len(X)}, Up-rate: {y.mean():.2%}")

X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf = RandomForestClassifier(
    n_estimators=300, max_depth=8, class_weight='balanced',
    random_state=42, n_jobs=-1
)
clf.fit(X_tr, y_tr)
proba = clf.predict_proba(X_te)[:, 1]
pred = (proba >= 0.5).astype(int)

print(f"\nROC-AUC: {roc_auc_score(y_te, proba):.4f}")
print(f"F1     : {f1_score(y_te, pred):.4f}")
print("\nClassification report:")
print(classification_report(y_te, pred, digits=3, zero_division=0))

clf.fit(X, y)
joblib.dump({"model": clf, "features": FEATURES}, ART / "trend_predictor.joblib")
print(f"\n[OK] Saved {ART / 'trend_predictor.joblib'}")