from typing import Any

from pydantic import model_validator

from app.schemas.common import CamelModel, LocalizedText, loc


class DivisionRead(CamelModel):
    division_id: str
    name: LocalizedText
    center: list[float]

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "division_id": obj.id,
                "name": loc(obj, "name"),
                "center": (obj.center_lat, obj.center_lng),
            }
        return obj


class DistrictRead(CamelModel):
    district_id: str
    name: LocalizedText
    center: list[float]

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "district_id": obj.id,
                "name": loc(obj, "name"),
                "center": (obj.center_lat, obj.center_lng),
            }
        return obj
