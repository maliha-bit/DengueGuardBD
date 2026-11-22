from datetime import date, datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import ForecastJobStatus, RiskLevel
from app.schemas.common import CamelModel


class ForecastRead(CamelModel):
    forecast_id: str
    division_id: str
    target_date: date | str
    predicted_cases: int
    risk_level: RiskLevel | str
    generated_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "predicted_cases") and not isinstance(obj, dict):
            return {
                "forecast_id": obj.id,
                "division_id": obj.division_id,
                "target_date": obj.target_date,
                "predicted_cases": obj.predicted_cases,
                "risk_level": obj.risk_level,
                "generated_at": obj.generated_at,
            }
        return obj


class ForecastRunRead(CamelModel):
    job_id: str
    status: ForecastJobStatus | str
    progress: float
    started_at: datetime | str
    finished_at: datetime | str | None
    triggered_by: str | None

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "progress") and not isinstance(obj, dict):
            return {
                "job_id": obj.id,
                "status": obj.status,
                "progress": obj.progress,
                "started_at": obj.started_at,
                "finished_at": obj.finished_at,
                "triggered_by": obj.triggered_by,
            }
        return obj
