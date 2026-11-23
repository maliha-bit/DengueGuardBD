
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART = HERE / "models"
CLEAN_CSV = HERE / "cleaned_dataset.csv"

CLASS_LABELS = {0: 'Very Low', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'}

# Load bundles
_risk_bundle  = joblib.load(ART / "risk_classifier.joblib")
_case_bundle  = joblib.load(ART / "case_forecaster.joblib")
_death_bundle = joblib.load(ART / "death_forecaster.joblib")
_trend_bundle = joblib.load(ART / "trend_predictor.joblib")

_risk_model  = _risk_bundle["model"];   _risk_feats  = _risk_bundle["features"]
_case_model  = _case_bundle["model"];   _case_feats  = _case_bundle["features"]
_death_model = _death_bundle["model"];  _death_feats = _death_bundle["features"]
_trend_model = _trend_bundle["model"];  _trend_feats = _trend_bundle["features"]


def _top_drivers(model, feats, k: int = 3) -> list:
    importances = model.feature_importances_
    idx = np.argsort(importances)[::-1][:k]
    return [{"feature": feats[i], "importance": round(float(importances[i]), 3)}
            for i in idx]


def forecast(features_row: dict) -> dict:
    """
    Given a dict of ALL feature columns (the model will select what it needs),
    return the 7-day risk forecast.
    """
    row_df = pd.DataFrame([features_row])

    # Each model gets ONLY the columns it was trained on
    X_risk  = row_df[_risk_feats]
    X_case  = row_df[_case_feats]
    X_death = row_df[_death_feats]
    X_trend = row_df[_trend_feats]

    class_id = int(_risk_model.predict(X_risk)[0])
    class_probs = _risk_model.predict_proba(X_risk)[0].tolist()

    cases  = float(np.expm1(_case_model.predict(X_case)[0]))
    deaths = float(np.expm1(_death_model.predict(X_death)[0]))

    trend_up    = int(_trend_model.predict(X_trend)[0])
    trend_proba = float(_trend_model.predict_proba(X_trend)[1][1])

    return {
        "risk_level": CLASS_LABELS[class_id],
        "risk_confidence": round(max(class_probs), 3),
        "predicted_cases_next_7d": int(max(0, round(cases))),
        "predicted_deaths_next_7d": int(max(0, round(deaths))),
        "trend": "up" if trend_up else "down",
        "trend_confidence": round(trend_proba, 3),
        "drivers": _top_drivers(_risk_model, _risk_feats, k=3),
    }


if __name__ == "__main__":
    import json
    print("=" * 70)
    print("Demo: Dhaka latest forecast")
    print("=" * 70)
    df = pd.read_csv(CLEAN_CSV)
    latest = df[df['Division'] == 'Dhaka'].iloc[-1].to_dict()
    result = forecast(latest)
    print(json.dumps(result, indent=2))