"""
train_death_forecaster.py — Predicts next-month death count.
Run: python src/ml/train_death_forecaster.py
"""
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

HERE = Path(__file__).resolve().parent
CLEAN_CSV = HERE / "cleaned_dataset.csv"
ART = HERE / "models"
ART.mkdir(exist_ok=True)

FEATURES = [
    'Pollution_ord', 'Density_ord', 'temp_c', 'Humidity', 'pressure_mbar',
    'Infected_lag1', 'Infected_lag2', 'Infected_lag3', 'Death_lag1',
    'Infected_roll3', 'Infected_roll6', 'death_rate',
    'month_sin', 'month_cos', 'is_monsoon'
]
TARGET = 'target_next_death'

print("=" * 70)
print("Train: Death Forecaster")
print("=" * 70)

df = pd.read_csv(CLEAN_CSV).dropna(subset=FEATURES + [TARGET])
X = df[FEATURES]
y = np.log1p(df[TARGET].values)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

reg = GradientBoostingRegressor(
    n_estimators=400, learning_rate=0.03, max_depth=3,
    min_samples_leaf=3, random_state=42
)
reg.fit(X_tr, y_tr)
pred = np.expm1(reg.predict(X_te)).clip(min=0)
y_true = np.expm1(y_te)

print(f"MAE : {mean_absolute_error(y_true, pred):.2f} deaths")
print(f"R^2 : {r2_score(y_true, pred):.4f}")

base = df.loc[X_te.index, 'Death_lag1'].values
print(f"Baseline MAE (persistence): {mean_absolute_error(y_true, base):.2f}")

reg.fit(X, y)
joblib.dump({"model": reg, "features": FEATURES}, ART / "death_forecaster.joblib")
print(f"\n[OK] Saved {ART / 'death_forecaster.joblib'}")