from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import BloodGroup, DonationType, DonorRequestStatus, MisuseReason
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class DonorProfile(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "donor_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True)
    blood_group: Mapped[BloodGroup] = mapped_column(enum_column(BloodGroup))
    donation_type: Mapped[DonationType] = mapped_column(enum_column(DonationType))
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"))
    district_id: Mapped[str] = mapped_column(String(32), ForeignKey("districts.id"))
    last_donation_date: Mapped[date | None] = mapped_column(Date)
    phone: Mapped[str] = mapped_column(String(32))
    share_after_accept: Mapped[bool] = mapped_column(Boolean, default=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DonorRequest(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "donor_requests"

    donor_id: Mapped[str] = mapped_column(String(36), ForeignKey("donor_profiles.id"), index=True)
    requester_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    patient_blood_group: Mapped[BloodGroup] = mapped_column(enum_column(BloodGroup))
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id"))
    units_needed: Mapped[int] = mapped_column(Integer)
    needed_by: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    contact_phone: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(String(500))
    status: Mapped[DonorRequestStatus] = mapped_column(
        enum_column(DonorRequestStatus), default=DonorRequestStatus.sent
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MisuseReport(Base, UUIDPkMixin):
    __tablename__ = "misuse_reports"

    donor_request_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("donor_requests.id")
    )
    donor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("donor_profiles.id"))
    reporter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    reason: Mapped[MisuseReason] = mapped_column(enum_column(MisuseReason))
    note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
