from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AgeGroup, FeverDays, TriageOutcome, UrineOutput
from app.models.mixins import UUIDPkMixin, enum_column


class TriageResult(Base, UUIDPkMixin):
    __tablename__ = "triage_results"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    outcome: Mapped[TriageOutcome] = mapped_column(enum_column(TriageOutcome))
    age_group: Mapped[AgeGroup] = mapped_column(enum_column(AgeGroup))
    fever_days: Mapped[FeverDays] = mapped_column(enum_column(FeverDays))
    symptoms: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    warning_signs: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    risk_factors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class FeverLog(Base, UUIDPkMixin):
    __tablename__ = "fever_logs"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_fever_log_user_date"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    temperature_c: Mapped[float] = mapped_column(Float)
    fluid_glasses: Mapped[int] = mapped_column(Integer)
    urine: Mapped[UrineOutput] = mapped_column(enum_column(UrineOutput))
    warning_signs: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ChecklistProgress(Base, UUIDPkMixin):
    __tablename__ = "checklist_progress"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True)
    checked: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
