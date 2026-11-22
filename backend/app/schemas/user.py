from typing import Any

from pydantic import EmailStr, model_validator

from app.models.enums import ApprovalStatus, Language, Role
from app.schemas.common import CamelModel, LocalizedText, loc


class UserRead(CamelModel):
    user_id: str
    name: LocalizedText
    role: Role
    division_id: str | None
    alert_divisions: list[str]
    approval_status: ApprovalStatus | None = None
    organisation_id: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "user_id": obj.id,
                "name": loc(obj, "name"),
                "role": obj.role,
                "division_id": obj.division_id,
                "alert_divisions": obj.alert_divisions,
                "approval_status": obj.approval_status,
                "organisation_id": obj.organisation_id,
            }
        return obj


class UserCreate(CamelModel):
    name_en: str
    name_bn: str
    email: EmailStr
    password: str
    phone: str | None = None
    role: Role = Role.citizen
    division_id: str | None = None
    district_id: str | None = None
    language: Language = Language.en
