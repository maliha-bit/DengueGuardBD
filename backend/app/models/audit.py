from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AuditAction, Role
from app.models.mixins import UUIDPkMixin, enum_column


class AuditLog(Base, UUIDPkMixin):
    __tablename__ = "audit_logs"

    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    actor_role: Mapped[Role] = mapped_column(enum_column(Role))
    action: Mapped[AuditAction] = mapped_column(enum_column(AuditAction))
    target_en: Mapped[str] = mapped_column(String(200))
    target_bn: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
