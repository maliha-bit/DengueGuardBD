from pydantic import EmailStr, Field, field_validator, model_validator

from app.models.enums import STAFF_ROLES, Language, Role
from app.schemas.common import CamelModel


class RegisterRequest(CamelModel):
    name_en: str = Field(max_length=100)
    name_bn: str = Field(max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = Field(default=None, max_length=32)
    role: Role = Role.citizen
    division_id: str | None = None
    district_id: str | None = None
    language: Language = Language.en
    organisation_id: str | None = Field(default=None, max_length=36)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.lower()

    @model_validator(mode="after")
    def _require_organisation_for_staff(self) -> "RegisterRequest":
        if self.role in STAFF_ROLES and not self.organisation_id:
            raise ValueError("organisationId is required for staff registration")
        return self


class LoginRequest(CamelModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.lower()


class TokenPair(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(CamelModel):
    access_token: str


class RefreshRequest(CamelModel):
    refresh_token: str


class RejectRequest(CamelModel):
    reason: str
