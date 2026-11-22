from datetime import date, datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import AgeGroup, FeverDays, TriageOutcome, UrineOutput
from app.schemas.common import CamelModel


class TriageResultRead(CamelModel):
    result_id: str
    user_id: str
    outcome: TriageOutcome | str
    age_group: AgeGroup | str
    fever_days: FeverDays | str
    symptoms: list[str]
    warning_signs: list[str]
    risk_factors: list[str]
    created_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "outcome") and not isinstance(obj, dict):
            return {
                "result_id": obj.id,
                "user_id": obj.user_id,
                "outcome": obj.outcome,
                "age_group": obj.age_group,
                "fever_days": obj.fever_days,
                "symptoms": obj.symptoms,
                "warning_signs": obj.warning_signs,
                "risk_factors": obj.risk_factors,
                "created_at": obj.created_at,
            }
        return obj


class FeverLogEntryRead(CamelModel):
    entry_id: str
    user_id: str
    date: date | str
    temperature_c: float
    fluid_glasses: int
    urine: UrineOutput | str
    warning_signs: list[str]

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "temperature_c") and not isinstance(obj, dict):
            return {
                "entry_id": obj.id,
                "user_id": obj.user_id,
                "date": obj.date,
                "temperature_c": obj.temperature_c,
                "fluid_glasses": obj.fluid_glasses,
                "urine": obj.urine,
                "warning_signs": obj.warning_signs,
            }
        return obj


class ChecklistProgressRead(CamelModel):
    checked: list[str]
    updated_at: datetime | str
