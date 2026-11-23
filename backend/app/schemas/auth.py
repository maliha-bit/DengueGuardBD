from pydantic import EmailStr, Field, model_validator

from app.models.enums import Language, Role
from app.schemas.common import CamelModel

_STAFF_ROLES = {Role.hospital_staff, Role.lab_staff, Role.authority}


class RegisterRequest(CamelModel):
    name_en: str
    name_bn: str
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = None
    role: Role = Role.citizen
    division_id: str | None = None
    district_id: str | None = None
    language: Language = Language.en
    organisation_id: str | None = None

    @model_validator(mode="after")
    def _require_organisation_for_staff(self) -> "RegisterRequest":
        if self.role in _STAFF_ROLES and not self.organisation_id:
            raise ValueError("organisationId is required for staff registration")
        return self


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


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
