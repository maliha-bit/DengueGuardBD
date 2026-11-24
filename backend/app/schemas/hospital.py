from datetime import date, datetime, time
from typing import Any

from pydantic import Field, model_validator

from app.models.enums import AppointmentStatus, HospitalType
from app.schemas.common import CamelModel, LocalizedText, loc


class HospitalRead(CamelModel):
    hospital_id: str
    name: LocalizedText
    type: HospitalType
    division_id: str
    district_id: str
    address: LocalizedText
    phone: str
    location: list[float]
    has_emergency: bool

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "hospital_id": obj.id,
                "name": loc(obj, "name"),
                "type": obj.type,
                "division_id": obj.division_id,
                "district_id": obj.district_id,
                "address": loc(obj, "address"),
                "phone": obj.phone,
                "location": [obj.lat, obj.lng],
                "has_emergency": obj.has_emergency,
            }
        return obj


class BedAvailabilityRead(CamelModel):
    hospital_id: str
    general_total: int
    general_available: int
    icu_total: int
    icu_available: int
    updated_at: datetime | str


class HospitalListItem(CamelModel):
    """A hospital plus its bed snapshot, used for both the list and detail
    endpoints. `nearby_district` marks a result added as a fallback because
    the requested district had no free beds."""

    hospital_id: str
    name: LocalizedText
    type: HospitalType
    division_id: str
    district_id: str
    address: LocalizedText
    phone: str
    location: list[float]
    has_emergency: bool
    beds: BedAvailabilityRead | None
    is_stale: bool
    nearby_district: bool = False


class HospitalListResponse(CamelModel):
    items: list[HospitalListItem]
    total: int
    page: int
    page_size: int


class BedsUpdate(CamelModel):
    general_total: int | None = Field(default=None, ge=0)
    general_available: int | None = Field(default=None, ge=0)
    icu_total: int | None = Field(default=None, ge=0)
    icu_available: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _require_a_field(self) -> "BedsUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        return self


class DoctorRead(CamelModel):
    doctor_id: str
    hospital_id: str
    name: LocalizedText
    specialty: LocalizedText

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "name_en"):
            return {
                "doctor_id": obj.id,
                "hospital_id": obj.hospital_id,
                "name": loc(obj, "name"),
                "specialty": loc(obj, "specialty"),
            }
        return obj


class DoctorCreate(CamelModel):
    name_en: str = Field(max_length=150)
    name_bn: str = Field(max_length=150)
    specialty_en: str = Field(max_length=150)
    specialty_bn: str = Field(max_length=150)
    phone: str = Field(max_length=32)


class DoctorUpdate(CamelModel):
    name_en: str | None = Field(default=None, max_length=150)
    name_bn: str | None = Field(default=None, max_length=150)
    specialty_en: str | None = Field(default=None, max_length=150)
    specialty_bn: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=32)


class DoctorScheduleRead(CamelModel):
    doctor_id: str
    weekday: int
    start_time: time
    end_time: time


class DoctorScheduleEntry(CamelModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def _start_before_end(self) -> "DoctorScheduleEntry":
        if self.start_time >= self.end_time:
            raise ValueError("startTime must be before endTime")
        return self


class DoctorScheduleReplace(CamelModel):
    entries: list[DoctorScheduleEntry]

    @model_validator(mode="after")
    def _no_overlaps(self) -> "DoctorScheduleReplace":
        by_weekday: dict[int, list[DoctorScheduleEntry]] = {}
        for entry in self.entries:
            by_weekday.setdefault(entry.weekday, []).append(entry)
        for day_entries in by_weekday.values():
            ordered = sorted(day_entries, key=lambda e: e.start_time)
            for prev, curr in zip(ordered, ordered[1:], strict=False):
                if curr.start_time < prev.end_time:
                    raise ValueError("Schedule entries on the same weekday cannot overlap")
        return self


class SlotRead(CamelModel):
    slot_id: str
    doctor_id: str
    hospital_id: str
    start: datetime
    capacity: int
    booked: int
    remaining: int

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "start_at"):
            return {
                "slot_id": obj.id,
                "doctor_id": obj.doctor_id,
                "hospital_id": obj.hospital_id,
                "start": obj.start_at,
                "capacity": obj.capacity,
                "booked": obj.booked_count,
                "remaining": obj.capacity - obj.booked_count,
            }
        return obj


class SlotGenerateRequest(CamelModel):
    doctor_id: str
    start_date: date
    end_date: date
    slot_duration_minutes: int = Field(default=30, ge=5, le=240)
    capacity: int = Field(default=1, ge=1, le=100)

    @model_validator(mode="after")
    def _valid_range(self) -> "SlotGenerateRequest":
        if self.end_date < self.start_date:
            raise ValueError("endDate must not be before startDate")
        if (self.end_date - self.start_date).days > 60:
            raise ValueError("Date range cannot exceed 60 days")
        return self


class SlotGenerateResponse(CamelModel):
    created: int
    slots: list[SlotRead]


class AppointmentRead(CamelModel):
    appointment_id: str
    user_id: str
    status: AppointmentStatus
    serial_no: int
    patient_name: str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "patient_name"):
            return {
                "appointment_id": obj.id,
                "user_id": obj.user_id,
                "status": obj.status,
                "serial_no": obj.serial_no,
                "patient_name": obj.patient_name,
            }
        return obj
