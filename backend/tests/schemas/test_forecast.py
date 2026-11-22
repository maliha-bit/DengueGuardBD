from types import SimpleNamespace

from app.schemas.forecast import ForecastRead


def test_forecast_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="f-1",
        division_id="dhaka",
        target_date="2026-11-23",
        predicted_cases=120,
        risk_level="high",
        generated_at="2026-11-22T10:00:00Z",
    )
    out = ForecastRead.model_validate(row).model_dump(by_alias=True)
    assert out == {
        "forecastId": "f-1",
        "divisionId": "dhaka",
        "targetDate": "2026-11-23",
        "predictedCases": 120,
        "riskLevel": "high",
        "generatedAt": "2026-11-22T10:00:00Z",
    }
