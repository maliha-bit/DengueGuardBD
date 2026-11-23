"""
train_case_forecaster.py — Predicts next-month infected count.
Run: python src/ml/train_case_forecaster.py
"""
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

HERE = Path(__file__).resolve().parent
CLEAN_CSV = HERE / "cleaned_dataset.csv"
ART = HERE / "models"
ART.mkdir(exist_ok=True)

FEATURES = [
    'Pollution_ord', 'Density_ord', 'temp_c', 'Humidity', 'pressure_mbar',
    'Infected_lag1', 'Infected_lag2', 'Infected_lag3', 'Death_lag1',
    'Infected_roll3', 'Infected_roll6', 'Humidity_roll3', 'Humidity_roll6',
    'month_sin', 'month_cos', 'is_monsoon'
]
TARGET = 'target_next_infected'

print("=" * 70)
print("Train: Case Forecaster")
print("=" * 70)

df = pd.read_csv(CLEAN_CSV).dropna(subset=FEATURES + [TARGET])
X = df[FEATURES]
y = np.log1p(df[TARGET].values)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

reg = GradientBoostingRegressor(
    n_estimators=500, learning_rate=0.03, max_depth=4,
    min_samples_leaf=3, subsample=0.9, random_state=42
)
reg.fit(X_tr, y_tr)
pred = reg.predict(X_te)

y_te_orig = np.expm1(y_te)
pred_orig = np.expm1(pred).clip(min=0)

mae = mean_absolute_error(y_te_orig, pred_orig)
rmse = np.sqrt(mean_squared_error(y_te_orig, pred_orig))
r2 = r2_score(y_te_orig, pred_orig)
print(f"MAE : {mae:.2f} cases")
print(f"RMSE: {rmse:.2f} cases")
print(f"R^2 : {r2:.4f}")

baseline_pred = df.loc[X_te.index, 'Infected_lag1'].values
baseline_mae = mean_absolute_error(y_te_orig, baseline_pred)
print(f"Persistence-baseline MAE: {baseline_mae:.2f}  |  Model MAE: {mae:.2f}")

cv = KFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(reg, X, y, cv=cv, scoring='r2')
print(f"5-Fold CV R^2: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

reg.fit(X, y)
joblib.dump(reg, ART / "case_forecaster.joblib")
print(f"\n[OK] Saved {ART / 'case_forecaster.joblib'}")