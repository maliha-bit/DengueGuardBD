from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import BreedingReportStatus, BreedingSiteType, PreventionTaskStatus
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class BreedingReport(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "breeding_reports"

    reference: Mapped[str] = mapped_column(String(32), unique=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    photo_path: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column()
    lng: Mapped[float] = mapped_column()
    area_name: Mapped[str] = mapped_column(String(150))
    site_type: Mapped[BreedingSiteType] = mapped_column(enum_column(BreedingSiteType))
    note: Mapped[str] = mapped_column(String(500))
    status: Mapped[BreedingReportStatus] = mapped_column(
        enum_column(BreedingReportStatus), default=BreedingReportStatus.submitted
    )
    status_note: Mapped[str | None] = mapped_column(String(500))
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"))
    district_id: Mapped[str] = mapped_column(String(32), ForeignKey("districts.id"))


class ReportStatusHistory(Base, UUIDPkMixin):
    __tablename__ = "report_status_history"

    report_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("breeding_reports.id"), index=True
    )
    status: Mapped[BreedingReportStatus] = mapped_column(enum_column(BreedingReportStatus))
    note: Mapped[str | None] = mapped_column(String(500))
    changed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PreventionTask(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "prevention_tasks"

    title: Mapped[str] = mapped_column(String(200))
    area: Mapped[str] = mapped_column(String(150))
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"))
    assigned_team: Mapped[str] = mapped_column(String(150))
    due_date: Mapped[date] = mapped_column(Date)
    linked_report_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("breeding_reports.id")
    )
    status: Mapped[PreventionTaskStatus] = mapped_column(
        enum_column(PreventionTaskStatus), default=PreventionTaskStatus.open
    )
