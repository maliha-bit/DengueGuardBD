from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import ApprovalStatus, Language, Role
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class User(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "users"

    name_en: Mapped[str] = mapped_column(String(100))
    name_bn: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(enum_column(Role), default=Role.citizen)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        enum_column(ApprovalStatus), default=ApprovalStatus.approved
    )
    organisation_id: Mapped[str | None] = mapped_column(String(36))
    division_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("divisions.id")
    )
    district_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("districts.id")
    )
    language: Mapped[Language] = mapped_column(enum_column(Language), default=Language.en)
    alert_divisions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)


class RefreshToken(Base, UUIDPkMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
