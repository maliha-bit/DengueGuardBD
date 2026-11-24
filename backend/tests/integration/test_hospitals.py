from datetime import UTC, datetime, timedelta

from app.models.enums import HospitalType
from app.models.geo import District, Division
from app.models.hospital import BedAvailability, Doctor, Hospital, Slot


async def _make_division(db_session, division_id="t-dhaka") -> Division:
    division = Division(
        id=division_id,
        name_en=division_id.title(),
        name_bn=division_id,
        center_lat=23.8,
        center_lng=90.4,
    )
    db_session.add(division)
    await db_session.flush()
    return division


async def _make_district(db_session, district_id, division_id) -> District:
    district = District(
        id=district_id,
        division_id=division_id,
        name_en=district_id.title(),
        name_bn=district_id,
        center_lat=23.8,
        center_lng=90.4,
    )
    db_session.add(district)
    await db_session.flush()
    return district


async def _make_hospital(
    db_session,
    hospital_id,
    district_id,
    division_id,
    name_en="Test Hospital",
    general_total=100,
    general_available=10,
    icu_total=10,
    icu_available=2,
    updated_at=None,
    active=True,
) -> Hospital:
    hospital = Hospital(
        id=hospital_id,
        name_en=name_en,
        name_bn=name_en,
        type=HospitalType.government,
        division_id=division_id,
        district_id=district_id,
        address_en="Addr",
        address_bn="Addr",
        phone="+8801700000000",
        lat=23.8,
        lng=90.4,
        has_emergency=True,
        active=active,
    )
    db_session.add(hospital)
    await db_session.flush()
    db_session.add(
        BedAvailability(
            hospital_id=hospital_id,
            general_total=general_total,
            general_available=general_available,
            icu_total=icu_total,
            icu_available=icu_available,
            updated_at=updated_at or datetime.now(UTC),
        )
    )
    await db_session.flush()
    return hospital


async def _make_doctor(db_session, doctor_id, hospital_id, name_en="Dr. A", active=True) -> Doctor:
    doctor = Doctor(
        id=doctor_id,
        hospital_id=hospital_id,
        name_en=name_en,
        name_bn=name_en,
        specialty_en="Internal Medicine",
        specialty_bn="মেডিসিন",
        phone="+8801700000001",
        active=active,
    )
    db_session.add(doctor)
    await db_session.flush()
    return doctor


async def test_list_hospitals_returns_beds_and_is_stale_false_when_recent(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka")
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["hospitalId"] == "h1"
    assert item["beds"]["generalAvailable"] == 10
    assert item["isStale"] is False


async def test_list_hospitals_is_stale_true_when_beds_updated_over_6h_ago(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(
        db_session,
        "h1",
        "t-dhaka-dhaka",
        "t-dhaka",
        updated_at=datetime.now(UTC) - timedelta(hours=7),
    )
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka"})
    assert resp.json()["items"][0]["isStale"] is True


async def test_list_hospitals_filters_by_division_and_district(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_division(db_session, "t-khulna")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_district(db_session, "t-khl-khulna", "t-khulna")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h2", "t-khl-khulna", "t-khulna")
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-khulna"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["h2"]


async def test_list_hospitals_has_icu_filter(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka", icu_total=0, icu_available=0)
    await _make_hospital(db_session, "h2", "t-dhaka-dhaka", "t-dhaka", icu_total=5, icu_available=1)
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka", "hasIcu": "true"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["h2"]


async def test_list_hospitals_search_filter(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(
        db_session, "h1", "t-dhaka-dhaka", "t-dhaka", name_en="Zzyxq Regional Clinic"
    )
    await _make_hospital(db_session, "h2", "t-dhaka-dhaka", "t-dhaka", name_en="City General")
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka", "search": "zzyxq"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["h1"]


async def test_list_hospitals_sort_by_beds(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(
        db_session, "low", "t-dhaka-dhaka", "t-dhaka", general_available=1, icu_available=0
    )
    await _make_hospital(
        db_session, "high", "t-dhaka-dhaka", "t-dhaka", general_available=50, icu_available=5
    )
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka", "sort": "beds"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["high", "low"]


async def test_list_hospitals_pagination(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    for i in range(3):
        await _make_hospital(db_session, f"h{i}", "t-dhaka-dhaka", "t-dhaka")
    await db_session.commit()

    resp = await client.get(
        "/api/v1/hospitals", params={"division": "t-dhaka", "page": 1, "pageSize": 2}
    )
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2

    resp2 = await client.get(
        "/api/v1/hospitals", params={"division": "t-dhaka", "page": 2, "pageSize": 2}
    )
    assert len(resp2.json()["items"]) == 1


async def test_list_hospitals_nearby_district_fallback_when_no_free_beds(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_district(db_session, "t-dhaka-gazipur", "t-dhaka")
    await _make_hospital(
        db_session, "empty", "t-dhaka-dhaka", "t-dhaka", general_available=0, icu_available=0
    )
    await _make_hospital(
        db_session, "nearby", "t-dhaka-gazipur", "t-dhaka", general_available=5, icu_available=1
    )
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"district": "t-dhaka-dhaka"})
    body = resp.json()
    assert body["total"] == 1
    by_id = {item["hospitalId"]: item for item in body["items"]}
    assert by_id["empty"]["nearbyDistrict"] is False
    assert by_id["nearby"]["nearbyDistrict"] is True


async def test_list_hospitals_no_fallback_when_beds_available(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_district(db_session, "t-dhaka-gazipur", "t-dhaka")
    await _make_hospital(
        db_session, "has-beds", "t-dhaka-dhaka", "t-dhaka", general_available=5, icu_available=0
    )
    await _make_hospital(
        db_session, "nearby", "t-dhaka-gazipur", "t-dhaka", general_available=5, icu_available=1
    )
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"district": "t-dhaka-dhaka"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["has-beds"]


async def test_list_hospitals_excludes_inactive(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "active", "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "inactive", "t-dhaka-dhaka", "t-dhaka", active=False)
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals", params={"division": "t-dhaka"})
    ids = [item["hospitalId"] for item in resp.json()["items"]]
    assert ids == ["active"]


async def test_get_hospital_detail_returns_item(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka")
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals/h1")
    assert resp.status_code == 200
    assert resp.json()["hospitalId"] == "h1"


async def test_get_hospital_detail_404_for_unknown_id(client, db_session):
    resp = await client.get("/api/v1/hospitals/does-not-exist")
    assert resp.status_code == 404


async def test_get_hospital_detail_404_for_inactive(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka", active=False)
    await db_session.commit()

    resp = await client.get("/api/v1/hospitals/h1")
    assert resp.status_code == 404


async def test_doctor_slots_returns_slots_for_given_date_with_remaining(client, db_session):
    await _make_division(db_session, "t-dhaka")
    await _make_district(db_session, "t-dhaka-dhaka", "t-dhaka")
    await _make_hospital(db_session, "h1", "t-dhaka-dhaka", "t-dhaka")
    await _make_doctor(db_session, "d1", "h1")
    target_day = datetime(2026, 12, 1, 9, 0, tzinfo=UTC)
    db_session.add(
        Slot(
            id="s1",
            doctor_id="d1",
            hospital_id="h1",
            start_at=target_day,
            end_at=target_day + timedelta(hours=1),
            capacity=10,
            booked_count=3,
        )
    )
    db_session.add(
        Slot(
            id="s2",
            doctor_id="d1",
            hospital_id="h1",
            start_at=target_day + timedelta(days=1),
            end_at=target_day + timedelta(days=1, hours=1),
            capacity=5,
            booked_count=0,
        )
    )
    await db_session.commit()

    resp = await client.get("/api/v1/doctors/d1/slots", params={"date": "2026-12-01"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["slotId"] == "s1"
    assert body[0]["remaining"] == 7


async def test_doctor_slots_404_for_unknown_doctor(client, db_session):
    resp = await client.get("/api/v1/doctors/does-not-exist/slots", params={"date": "2026-12-01"})
    assert resp.status_code == 404
