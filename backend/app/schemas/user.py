from typing import Any

from pydantic import EmailStr, Field, model_validator

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


class ProfileRead(CamelModel):
    user_id: str
    name: LocalizedText
    email: str
    phone: str | None
    role: Role
    division_id: str | None
    district_id: str | None
    alert_divisions: list[str]
    language: Language
    approval_status: ApprovalStatus | None = None
    organisation_id: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "user_id": obj.id,
                "name": loc(obj, "name"),
                "email": obj.email,
                "phone": obj.phone,
                "role": obj.role,
                "division_id": obj.division_id,
                "district_id": obj.district_id,
                "alert_divisions": obj.alert_divisions,
                "language": obj.language,
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


_NOT_NULLABLE_FIELDS = ("name_en", "name_bn", "language", "alert_divisions")


class UserUpdate(CamelModel):
    name_en: str | None = Field(default=None, max_length=100)
    name_bn: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    division_id: str | None = None
    district_id: str | None = None
    language: Language | None = None
    alert_divisions: list[str] | None = None

    @model_validator(mode="after")
    def _reject_null_for_non_nullable_fields(self) -> "UserUpdate":
        for field in _NOT_NULLABLE_FIELDS:
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self
