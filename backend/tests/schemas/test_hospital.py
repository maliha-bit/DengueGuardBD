from datetime import date, time
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.hospital import (
    BedAvailabilityRead,
    BedsUpdate,
    DoctorScheduleEntry,
    DoctorScheduleReplace,
    SlotGenerateRequest,
    SlotRead,
)


def test_bed_availability_read_dumps_expected_shape():
    row = SimpleNamespace(
        hospital_id="h-dhaka-1",
        general_total=100,
        general_available=20,
        icu_total=10,
        icu_available=2,
        updated_at="2026-11-22T10:00:00Z",
    )
    out = BedAvailabilityRead.model_validate(row).model_dump(by_alias=True)
    assert out == {
        "hospitalId": "h-dhaka-1",
        "generalTotal": 100,
        "generalAvailable": 20,
        "icuTotal": 10,
        "icuAvailable": 2,
        "updatedAt": "2026-11-22T10:00:00Z",
    }


def test_slot_read_computes_remaining_from_capacity_and_booked():
    row = SimpleNamespace(
        id="slot-1",
        doctor_id="doc-1",
        hospital_id="h-1",
        start_at="2026-11-22T10:00:00Z",
        capacity=10,
        booked_count=4,
    )
    out = SlotRead.model_validate(row)
    assert out.remaining == 6


def test_beds_update_rejects_empty_payload():
    with pytest.raises(ValidationError):
        BedsUpdate()


def test_beds_update_allows_single_field():
    update = BedsUpdate(generalAvailable=5)
    assert update.model_dump(exclude_unset=True) == {"general_available": 5}


def test_doctor_schedule_entry_rejects_start_after_end():
    with pytest.raises(ValidationError):
        DoctorScheduleEntry(weekday=0, startTime=time(17, 0), endTime=time(9, 0))


def test_doctor_schedule_entry_rejects_invalid_weekday():
    with pytest.raises(ValidationError):
        DoctorScheduleEntry(weekday=7, startTime=time(9, 0), endTime=time(17, 0))


def test_doctor_schedule_replace_rejects_overlapping_entries_same_weekday():
    with pytest.raises(ValidationError):
        DoctorScheduleReplace(
            entries=[
                {"weekday": 0, "startTime": "09:00", "endTime": "13:00"},
                {"weekday": 0, "startTime": "12:00", "endTime": "17:00"},
            ]
        )


def test_doctor_schedule_replace_allows_non_overlapping_entries_same_weekday():
    replace = DoctorScheduleReplace(
        entries=[
            {"weekday": 0, "startTime": "09:00", "endTime": "12:00"},
            {"weekday": 0, "startTime": "13:00", "endTime": "17:00"},
        ]
    )
    assert len(replace.entries) == 2


def test_slot_generate_request_rejects_end_before_start():
    with pytest.raises(ValidationError):
        SlotGenerateRequest(
            doctorId="doc-1", startDate=date(2026, 11, 22), endDate=date(2026, 11, 20)
        )


def test_slot_generate_request_rejects_range_over_60_days():
    with pytest.raises(ValidationError):
        SlotGenerateRequest(doctorId="doc-1", startDate=date(2026, 1, 1), endDate=date(2026, 6, 1))
