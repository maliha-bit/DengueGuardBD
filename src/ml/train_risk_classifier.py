
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.dummy import DummyClassifier

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
TARGET = 'target_next_class'

print("=" * 70)
print("Train: Risk Classifier")
print("=" * 70)

df = pd.read_csv(CLEAN_CSV).dropna(subset=FEATURES + [TARGET])
X = df[FEATURES]
y = df[TARGET].astype(int)
print(f"Samples: {len(X)}, Features: {X.shape[1]}, Classes: {sorted(y.unique())}")

X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf = RandomForestClassifier(
    n_estimators=400, max_depth=12, min_samples_leaf=2,
    class_weight='balanced', random_state=42, n_jobs=-1
)
clf.fit(X_tr, y_tr)
pred = clf.predict(X_te)

acc = accuracy_score(y_te, pred)
print(f"\nAccuracy: {acc:.4f}")
print("\nClassification report:")
print(classification_report(y_te, pred, digits=3, zero_division=0))
print("\nConfusion matrix:")
print(confusion_matrix(y_te, pred))

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(clf, X, y, cv=cv, scoring='f1_macro')
print(f"\n5-Fold CV F1-macro: {scores.mean():.4f} +/- {scores.std():.4f}")

base = DummyClassifier(strategy='most_frequent').fit(X_tr, y_tr)
base_acc = accuracy_score(y_te, base.predict(X_te))
print(f"Majority baseline: {base_acc:.4f}  |  Model: {acc:.4f}")

clf.fit(X, y)

# Save model + its feature list as ONE bundle
joblib.dump({"model": clf, "features": FEATURES}, ART / "risk_classifier.joblib")
print(f"\n[OK] Saved {ART / 'risk_classifier.joblib'}")