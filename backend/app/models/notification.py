from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import NotificationKind
from app.models.mixins import UUIDPkMixin, enum_column


class Notification(Base, UUIDPkMixin):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    kind: Mapped[NotificationKind] = mapped_column(enum_column(NotificationKind))
    title_en: Mapped[str] = mapped_column(String(200))
    title_bn: Mapped[str] = mapped_column(String(200))
    body_en: Mapped[str] = mapped_column(String(500))
    body_bn: Mapped[str] = mapped_column(String(500))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
