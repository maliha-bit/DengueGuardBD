from datetime import datetime, time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AppointmentStatus, HospitalType
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class Hospital(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "hospitals"

    name_en: Mapped[str] = mapped_column(String(150))
    name_bn: Mapped[str] = mapped_column(String(150))
    type: Mapped[HospitalType] = mapped_column(enum_column(HospitalType))
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"))
    district_id: Mapped[str] = mapped_column(String(32), ForeignKey("districts.id"))
    address_en: Mapped[str] = mapped_column(String(255))
    address_bn: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    has_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class BedAvailability(Base):
    __tablename__ = "bed_availability"
    __table_args__ = (
        CheckConstraint(
            "general_available >= 0 AND general_available <= general_total",
            name="ck_bed_availability_general_bounds",
        ),
        CheckConstraint(
            "icu_available >= 0 AND icu_available <= icu_total",
            name="ck_bed_availability_icu_bounds",
        ),
    )

    hospital_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("hospitals.id"), primary_key=True
    )
    general_total: Mapped[int] = mapped_column(Integer)
    general_available: Mapped[int] = mapped_column(Integer)
    icu_total: Mapped[int] = mapped_column(Integer)
    icu_available: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Doctor(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "doctors"

    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id"), index=True)
    name_en: Mapped[str] = mapped_column(String(150))
    name_bn: Mapped[str] = mapped_column(String(150))
    specialty_en: Mapped[str] = mapped_column(String(150))
    specialty_bn: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str] = mapped_column(String(32))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class DoctorSchedule(Base, UUIDPkMixin):
    __tablename__ = "doctor_schedules"
    __table_args__ = (
        CheckConstraint(
            "weekday >= 0 AND weekday <= 6", name="ck_doctor_schedule_weekday_range"
        ),
    )

    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)


class Slot(Base, UUIDPkMixin):
    __tablename__ = "slots"
    __table_args__ = (
        CheckConstraint(
            "booked_count >= 0 AND booked_count <= capacity", name="ck_slot_booked_count_bounds"
        ),
    )

    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), index=True)
    hospital_id: Mapped[str] = mapped_column(String(36), ForeignKey("hospitals.id"), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    booked_count: Mapped[int] = mapped_column(Integer, default=0)


class Appointment(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("user_id", "slot_id", name="uq_appointment_user_slot"),
    )

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    slot_id: Mapped[str] = mapped_column(String(36), ForeignKey("slots.id"), index=True)
    patient_name: Mapped[str] = mapped_column(String(150))
    serial_no: Mapped[int] = mapped_column(Integer)
    status: Mapped[AppointmentStatus] = mapped_column(
        enum_column(AppointmentStatus), default=AppointmentStatus.booked
    )
