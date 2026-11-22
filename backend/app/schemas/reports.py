from datetime import date, datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import BreedingReportStatus, BreedingSiteType, PreventionTaskStatus
from app.schemas.common import CamelModel


class BreedingReportRead(CamelModel):
    report_id: str
    reference: str
    user_id: str
    photo_url: str | None
    location: list[float]
    area_name: str
    site_type: BreedingSiteType | str
    note: str
    status: BreedingReportStatus | str
    status_note: str | None = None
    created_at: datetime | str
    updated_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "reference") and not isinstance(obj, dict):
            return {
                "report_id": obj.id,
                "reference": obj.reference,
                "user_id": obj.user_id,
                "photo_url": obj.photo_path,
                "location": [obj.lat, obj.lng],
                "area_name": obj.area_name,
                "site_type": obj.site_type,
                "note": obj.note,
                "status": obj.status,
                "status_note": obj.status_note,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
        return obj


class PreventionTaskRead(CamelModel):
    task_id: str
    title: str
    area: str
    division_id: str
    assigned_team: str
    due_date: date | str
    linked_report_id: str | None
    status: PreventionTaskStatus | str
    created_at: datetime | str
    updated_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "assigned_team") and not isinstance(obj, dict):
            return {
                "task_id": obj.id,
                "title": obj.title,
                "area": obj.area,
                "division_id": obj.division_id,
                "assigned_team": obj.assigned_team,
                "due_date": obj.due_date,
                "linked_report_id": obj.linked_report_id,
                "status": obj.status,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
        return obj
