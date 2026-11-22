from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import HospitalType, LabTestCode
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class Lab(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "labs"

    name_en: Mapped[str] = mapped_column(String(150))
    name_bn: Mapped[str] = mapped_column(String(150))
    type: Mapped[HospitalType] = mapped_column(enum_column(HospitalType))
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"))
    district_id: Mapped[str] = mapped_column(String(32), ForeignKey("districts.id"))
    address_en: Mapped[str] = mapped_column(String(255))
    address_bn: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(32))
    lat: Mapped[float] = mapped_column()
    lng: Mapped[float] = mapped_column()
    home_collection: Mapped[bool] = mapped_column(Boolean, default=False)
    weekly_hours: Mapped[list | None] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class LabTest(Base, UUIDPkMixin):
    __tablename__ = "lab_tests"
    __table_args__ = (UniqueConstraint("lab_id", "code", name="uq_lab_test_lab_code"),)

    lab_id: Mapped[str] = mapped_column(String(36), ForeignKey("labs.id"), index=True)
    code: Mapped[LabTestCode] = mapped_column(enum_column(LabTestCode))
    price_bdt: Mapped[int] = mapped_column(Integer)
    price_max_bdt: Mapped[int] = mapped_column(Integer)
    turnaround_hours: Mapped[int] = mapped_column(Integer)
