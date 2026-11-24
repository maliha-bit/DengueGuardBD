from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.models.audit import AuditLog
from app.models.enums import ApprovalStatus, AuditAction, HospitalType, Role
from app.models.geo import District, Division
from app.models.hospital import BedAvailability, Doctor, DoctorSchedule, Hospital, Slot
from app.models.user import User
from app.services.rate_limit import reset_rate_limits
from app.services.security import hash_password


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    reset_rate_limits()
    yield
    reset_rate_limits()


async def _make_hospital(db_session, hospital_id="h1") -> Hospital:
    db_session.add(
        Division(id="t-dhaka", name_en="Dhaka", name_bn="ঢাকা", center_lat=23.8, center_lng=90.4)
    )
    await db_session.flush()
    db_session.add(
        District(
            id="t-dhaka-dhaka",
            division_id="t-dhaka",
            name_en="Dhaka",
            name_bn="ঢাকা",
            center_lat=23.8,
            center_lng=90.4,
        )
    )
    await db_session.flush()
    hospital = Hospital(
        id=hospital_id,
        name_en="Test Hospital",
        name_bn="টেস্ট হাসপাতাল",
        type=HospitalType.government,
        division_id="t-dhaka",
        district_id="t-dhaka-dhaka",
        address_en="Addr",
        address_bn="Addr",
        phone="+8801700000000",
        lat=23.8,
        lng=90.4,
        has_emergency=True,
        active=True,
    )
    db_session.add(hospital)
    await db_session.flush()
    db_session.add(
        BedAvailability(
            hospital_id=hospital_id,
            general_total=100,
            general_available=20,
            icu_total=10,
            icu_available=2,
            updated_at=datetime.now(UTC),
        )
    )
    await db_session.flush()
    return hospital


async def _make_staff(db_session, email, hospital_id, role=Role.hospital_staff) -> User:
    user = User(
        id=f"id-{email}",
        name_en="Staffer",
        name_bn="স্টাফ",
        email=email,
        password_hash=hash_password("password1"),
        role=role,
        approval_status=ApprovalStatus.approved,
        organisation_id=hospital_id,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login_headers(client, email: str) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password1"})
    return {"Authorization": f"Bearer {resp.json()['accessToken']}"}


async def test_update_beds_requires_hospital_staff_role(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "citizen@example.com", hospital.id, role=Role.citizen)
    await db_session.commit()

    headers = await _login_headers(client, "citizen@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/beds", json={"generalAvailable": 15}, headers=headers
    )
    assert resp.status_code == 403


async def test_update_beds_success_updates_and_audits(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff1@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff1@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/beds",
        json={"generalAvailable": 15, "icuAvailable": 3},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["generalAvailable"] == 15
    assert body["icuAvailable"] == 3

    row = (
        await db_session.execute(select(AuditLog).where(AuditLog.action == AuditAction.beds_update))
    ).scalar_one()
    assert row.actor_id == "id-staff1@example.com"


async def test_update_beds_rejects_out_of_range_available(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff2@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff2@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/beds", json={"generalAvailable": 999}, headers=headers
    )
    assert resp.status_code == 422


async def test_update_beds_requires_at_least_one_field(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff3@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff3@example.com")
    resp = await client.patch("/api/v1/staff/hospital/beds", json={}, headers=headers)
    assert resp.status_code == 422


async def test_update_beds_404_when_no_hospital_linked(client, db_session):
    await _make_staff(db_session, "staff4@example.com", hospital_id=None)
    await db_session.commit()

    headers = await _login_headers(client, "staff4@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/beds", json={"generalAvailable": 1}, headers=headers
    )
    assert resp.status_code == 404


async def test_create_doctor_success_and_audit(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff5@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff5@example.com")
    resp = await client.post(
        "/api/v1/staff/hospital/doctors",
        json={
            "nameEn": "Dr. Rahim",
            "nameBn": "ডা. রহিম",
            "specialtyEn": "Pediatrics",
            "specialtyBn": "শিশুরোগ",
            "phone": "+8801700000005",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["hospitalId"] == hospital.id

    row = (
        await db_session.execute(
            select(AuditLog).where(AuditLog.action == AuditAction.doctor_create)
        )
    ).scalar_one()
    assert "Rahim" in row.target_en


async def test_update_doctor_partial_update(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff6@example.com", hospital.id)
    doctor = Doctor(
        id="doc1",
        hospital_id=hospital.id,
        name_en="Dr. A",
        name_bn="ডা. এ",
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000006",
        active=True,
    )
    db_session.add(doctor)
    await db_session.commit()

    headers = await _login_headers(client, "staff6@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/doctors/doc1", json={"phone": "+8801700009999"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["name"]["en"] == "Dr. A"


async def test_update_doctor_404_for_doctor_of_other_hospital(client, db_session):
    hospital = await _make_hospital(db_session, "h1")
    other_hospital = Hospital(
        id="h2",
        name_en="Other",
        name_bn="অন্য",
        type=HospitalType.private,
        division_id="t-dhaka",
        district_id="t-dhaka-dhaka",
        address_en="A",
        address_bn="A",
        phone="+8801700000007",
        lat=23.8,
        lng=90.4,
        has_emergency=False,
        active=True,
    )
    db_session.add(other_hospital)
    await db_session.flush()
    other_doctor = Doctor(
        id="doc-other",
        hospital_id="h2",
        name_en="Dr. B",
        name_bn="ডা. বি",
        specialty_en="Emergency Medicine",
        specialty_bn="জরুরি চিকিৎসা",
        phone="+8801700000008",
        active=True,
    )
    db_session.add(other_doctor)
    await _make_staff(db_session, "staff7@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff7@example.com")
    resp = await client.patch(
        "/api/v1/staff/hospital/doctors/doc-other",
        json={"phone": "+8801700000009"},
        headers=headers,
    )
    assert resp.status_code == 404


async def test_deactivate_then_activate_doctor(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff8@example.com", hospital.id)
    doctor = Doctor(
        id="doc2",
        hospital_id=hospital.id,
        name_en="Dr. C",
        name_bn="ডা. সি",
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000010",
        active=True,
    )
    db_session.add(doctor)
    await db_session.commit()

    headers = await _login_headers(client, "staff8@example.com")
    resp = await client.post("/api/v1/staff/hospital/doctors/doc2/deactivate", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["doctorId"] == "doc2"

    resp2 = await client.post("/api/v1/staff/hospital/doctors/doc2/deactivate", headers=headers)
    assert resp2.status_code == 409

    resp3 = await client.post("/api/v1/staff/hospital/doctors/doc2/activate", headers=headers)
    assert resp3.status_code == 200


async def test_replace_schedule_success(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff9@example.com", hospital.id)
    doctor = Doctor(
        id="doc3",
        hospital_id=hospital.id,
        name_en="Dr. D",
        name_bn="ডা. ডি",
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000011",
        active=True,
    )
    db_session.add(doctor)
    await db_session.commit()

    headers = await _login_headers(client, "staff9@example.com")
    resp = await client.put(
        "/api/v1/staff/hospital/doctors/doc3/schedule",
        json={
            "entries": [
                {"weekday": 0, "startTime": "09:00:00", "endTime": "17:00:00"},
                {"weekday": 2, "startTime": "09:00:00", "endTime": "13:00:00"},
            ]
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    row = (
        await db_session.execute(
            select(AuditLog).where(AuditLog.action == AuditAction.schedule_update)
        )
    ).scalar_one()
    assert "2 entries" in row.target_en


async def test_generate_slots_creates_expected_count_and_skips_existing(client, db_session):
    hospital = await _make_hospital(db_session)
    await _make_staff(db_session, "staff10@example.com", hospital.id)
    doctor = Doctor(
        id="doc4",
        hospital_id=hospital.id,
        name_en="Dr. E",
        name_bn="ডা. ই",
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000012",
        active=True,
    )
    db_session.add(doctor)
    await db_session.flush()
    db_session.add(
        DoctorSchedule(
            id="sched1",
            doctor_id="doc4",
            weekday=1,  # Tuesday
            start_time=datetime(2026, 12, 1, 9, 0).time(),
            end_time=datetime(2026, 12, 1, 10, 0).time(),
        )
    )
    # 2026-12-01 is a Tuesday; pre-create one slot so it is skipped.
    db_session.add(
        Slot(
            id="pre-existing",
            doctor_id="doc4",
            hospital_id=hospital.id,
            start_at=datetime(2026, 12, 1, 9, 0, tzinfo=UTC),
            end_at=datetime(2026, 12, 1, 9, 30, tzinfo=UTC),
            capacity=5,
            booked_count=0,
        )
    )
    await db_session.commit()

    headers = await _login_headers(client, "staff10@example.com")
    resp = await client.post(
        "/api/v1/staff/hospital/slots/generate",
        json={
            "doctorId": "doc4",
            "startDate": "2026-12-01",
            "endDate": "2026-12-01",
            "slotDurationMinutes": 30,
            "capacity": 4,
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["created"] == 1
    assert body["slots"][0]["start"].startswith("2026-12-01T09:30")


async def test_generate_slots_404_for_doctor_of_other_hospital(client, db_session):
    hospital = await _make_hospital(db_session, "h1")
    other_hospital = Hospital(
        id="h2",
        name_en="Other",
        name_bn="অন্য",
        type=HospitalType.private,
        division_id="t-dhaka",
        district_id="t-dhaka-dhaka",
        address_en="A",
        address_bn="A",
        phone="+8801700000013",
        lat=23.8,
        lng=90.4,
        has_emergency=False,
        active=True,
    )
    db_session.add(other_hospital)
    await db_session.flush()
    other_doctor = Doctor(
        id="doc-other2",
        hospital_id="h2",
        name_en="Dr. F",
        name_bn="ডা. এফ",
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000014",
        active=True,
    )
    db_session.add(other_doctor)
    await _make_staff(db_session, "staff11@example.com", hospital.id)
    await db_session.commit()

    headers = await _login_headers(client, "staff11@example.com")
    resp = await client.post(
        "/api/v1/staff/hospital/slots/generate",
        json={"doctorId": "doc-other2", "startDate": "2026-12-01", "endDate": "2026-12-01"},
        headers=headers,
    )
    assert resp.status_code == 404
