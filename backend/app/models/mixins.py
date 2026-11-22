import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column


def enum_column(enum_cls: type[enum.Enum]) -> SAEnum:
    """A SQLAlchemy Enum column storing the Python enum's .value as plain
    text (native_enum=False), so adding a new member later is a plain
    migration instead of a Postgres ALTER TYPE."""
    return SAEnum(enum_cls, native_enum=False, values_callable=lambda e: [m.value for m in e])


class UUIDPkMixin:
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
