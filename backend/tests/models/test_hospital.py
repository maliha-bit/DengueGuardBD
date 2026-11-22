from sqlalchemy import CheckConstraint, UniqueConstraint

from app.models.hospital import (
    Appointment,
    BedAvailability,
    Doctor,
    DoctorSchedule,
    Hospital,
    Slot,
)


def test_hospital_division_and_district_fks():
    fk_targets = {fk.target_fullname for fk in Hospital.__table__.foreign_keys}
    assert "divisions.id" in fk_targets
    assert "districts.id" in fk_targets


def test_bed_availability_fk_and_check_constraints():
    fk_targets = {fk.target_fullname for fk in BedAvailability.__table__.foreign_keys}
    assert "hospitals.id" in fk_targets
    names = {
        c.name for c in BedAvailability.__table__.constraints if isinstance(c, CheckConstraint)
    }
    assert "ck_bed_availability_general_bounds" in names
    assert "ck_bed_availability_icu_bounds" in names


def test_doctor_hospital_fk():
    fk_targets = {fk.target_fullname for fk in Doctor.__table__.foreign_keys}
    assert "hospitals.id" in fk_targets


def test_doctor_schedule_weekday_check_constraint():
    names = {
        c.name for c in DoctorSchedule.__table__.constraints if isinstance(c, CheckConstraint)
    }
    assert "ck_doctor_schedule_weekday_range" in names


def test_slot_booked_count_check_constraint():
    names = {c.name for c in Slot.__table__.constraints if isinstance(c, CheckConstraint)}
    assert "ck_slot_booked_count_bounds" in names


def test_appointment_unique_user_slot_constraint():
    names = {
        c.name for c in Appointment.__table__.constraints if isinstance(c, UniqueConstraint)
    }
    assert "uq_appointment_user_slot" in names
