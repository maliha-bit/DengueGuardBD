from datetime import datetime, time
from typing import Any

from pydantic import model_validator

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


class DoctorScheduleRead(CamelModel):
    doctor_id: str
    weekday: int
    start_time: time
    end_time: time


class SlotRead(CamelModel):
    slot_id: str
    doctor_id: str
    hospital_id: str
    start: datetime
    capacity: int
    booked: int

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
            }
        return obj


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
