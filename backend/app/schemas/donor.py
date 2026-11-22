from datetime import date, datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import BloodGroup, DonationType, DonorRequestStatus
from app.schemas.common import CamelModel, LocalizedText, loc


def mask_phone(phone: str) -> str:
    return f"{phone[:2]}XXX-XXX-{phone[-3:]}"


class DonorListing(CamelModel):
    """The public donor card — never the donor's real phone or user id;
    CLAUDE.md: never expose donor contact until the donor accepts."""

    donor_id: str
    name: LocalizedText
    blood_group: BloodGroup | str
    donation_type: DonationType | str
    division_id: str
    district_id: str
    last_donation_date: date | str | None
    masked_phone: str
    available: bool
    last_active_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "blood_group") and not isinstance(obj, dict):
            return {
                "donor_id": obj.id,
                "name": loc(obj, "name"),
                "blood_group": obj.blood_group,
                "donation_type": obj.donation_type,
                "division_id": obj.division_id,
                "district_id": obj.district_id,
                "last_donation_date": obj.last_donation_date,
                "masked_phone": mask_phone(obj.phone),
                "available": obj.available,
                "last_active_at": obj.last_active_at,
            }
        return obj


class DonorRequestRead(CamelModel):
    request_id: str
    patient_blood_group: BloodGroup | str
    hospital_id: str
    units_needed: int
    needed_by: datetime | str
    note: str
    status: DonorRequestStatus | str
    created_at: datetime | str
    responded_at: datetime | str | None
    closed_at: datetime | str | None
    donor_phone: str | None
    contact_phone: str | None

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "units_needed") and not isinstance(obj, dict):
            accepted = obj.status == "accepted"
            return {
                "request_id": obj.id,
                "patient_blood_group": obj.patient_blood_group,
                "hospital_id": obj.hospital_id,
                "units_needed": obj.units_needed,
                "needed_by": obj.needed_by,
                "note": obj.note,
                "status": obj.status,
                "created_at": obj.created_at,
                "responded_at": obj.responded_at,
                "closed_at": obj.closed_at,
                "donor_phone": obj.donor_phone if accepted else None,
                "contact_phone": obj.contact_phone if accepted else None,
            }
        return obj
