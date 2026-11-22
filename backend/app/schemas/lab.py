from typing import Any

from pydantic import model_validator

from app.models.enums import HospitalType, LabTestCode
from app.schemas.common import CamelModel, LocalizedText, loc


class LabTestRead(CamelModel):
    test_id: str
    lab_id: str
    code: LabTestCode | str
    price_bdt: int
    price_max_bdt: int
    turnaround_hours: int

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "price_bdt") and not isinstance(obj, dict):
            return {
                "test_id": obj.id,
                "lab_id": obj.lab_id,
                "code": obj.code,
                "price_bdt": obj.price_bdt,
                "price_max_bdt": obj.price_max_bdt,
                "turnaround_hours": obj.turnaround_hours,
            }
        return obj


class LabRead(CamelModel):
    lab_id: str
    name: LocalizedText
    type: HospitalType | str
    division_id: str
    district_id: str
    address: LocalizedText
    phone: str
    location: list[float]
    home_collection: bool
    weekly_hours: list | None = None
    tests: list[LabTestRead] = []

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en") and not isinstance(obj, dict):
            return {
                "lab_id": obj.id,
                "name": loc(obj, "name"),
                "type": obj.type,
                "division_id": obj.division_id,
                "district_id": obj.district_id,
                "address": loc(obj, "address"),
                "phone": obj.phone,
                "location": [obj.lat, obj.lng],
                "home_collection": obj.home_collection,
                "weekly_hours": obj.weekly_hours,
                "tests": obj.tests,
            }
        return obj
