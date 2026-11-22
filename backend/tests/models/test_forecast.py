from sqlalchemy import UniqueConstraint

from app.models.forecast import Forecast, ForecastRun


def test_forecast_run_table_exists():
    assert ForecastRun.__tablename__ == "forecast_runs"


def test_forecast_fks_and_unique_constraint():
    fk_targets = {fk.target_fullname for fk in Forecast.__table__.foreign_keys}
    assert "divisions.id" in fk_targets
    assert "forecast_runs.id" in fk_targets
    names = {c.name for c in Forecast.__table__.constraints if isinstance(c, UniqueConstraint)}
    assert "uq_forecast_division_date_run" in names
