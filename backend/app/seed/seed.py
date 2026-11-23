"""Seed demo/dev data for DengueGuard BD.

Run with ``python -m app.seed`` (add ``--reset`` to wipe seeded tables first).
Safe to run twice: existing rows are matched by a natural key in memory (one
bulk SELECT per table, not one per row) and reused instead of duplicated.
All data here is simulated for development/demo use.
"""

import argparse
import asyncio
import random
import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_maker, engine
from app.models import (
    BedAvailability,
    BreedingReport,
    District,
    Division,
    Doctor,
    DoctorSchedule,
    DonorProfile,
    Hospital,
    Lab,
    LabTest,
    PreventionTask,
    ReportStatusHistory,
    Slot,
    User,
)
from app.models.enums import (
    ApprovalStatus,
    BloodGroup,
    BreedingReportStatus,
    BreedingSiteType,
    DonationType,
    HospitalType,
    LabTestCode,
    Language,
    PreventionTaskStatus,
    Role,
)
from app.seed.data import (
    DISTRICTS,
    DIVISION_CAPITAL_DISTRICT,
    DIVISIONS,
    DOCTOR_FIRST_NAMES,
    DOCTOR_LAST_NAMES,
    DONOR_FIRST_NAMES,
    SPECIALTIES,
)
from app.services.security import hash_password

DEMO_PASSWORD = "Demo@1234"

DEMO_USERS = [
    {
        "role": Role.citizen,
        "email": "citizen@dengueguard.bd",
        "name_en": "Demo Citizen",
        "name_bn": "ডেমো নাগরিক",
    },
    {
        "role": Role.donor,
        "email": "donor@dengueguard.bd",
        "name_en": "Demo Donor",
        "name_bn": "ডেমো ডোনার",
    },
    {
        "role": Role.hospital_staff,
        "email": "hospital.staff@dengueguard.bd",
        "name_en": "Demo Hospital Staff",
        "name_bn": "ডেমো হাসপাতাল স্টাফ",
    },
    {
        "role": Role.lab_staff,
        "email": "lab.staff@dengueguard.bd",
        "name_en": "Demo Lab Staff",
        "name_bn": "ডেমো ল্যাব স্টাফ",
    },
    {
        "role": Role.authority,
        "email": "authority@dengueguard.bd",
        "name_en": "Demo Health Authority",
        "name_bn": "ডেমো স্বাস্থ্য কর্তৃপক্ষ",
    },
    {
        "role": Role.admin,
        "email": "admin@dengueguard.bd",
        "name_en": "Demo Admin",
        "name_bn": "ডেমো অ্যাডমিন",
    },
]

HOSPITAL_TEMPLATES = [
    ("General Hospital", HospitalType.government, True),
    ("Medical College Hospital", HospitalType.government, True),
    ("City Hospital", HospitalType.private, False),
]

LAB_EXTRA_DISTRICTS = [
    "dhaka-gazipur",
    "dhaka-narayanganj",
    "ctg-coxsbazar",
    "raj-bogura",
    "khl-jessore",
    "bar-patuakhali",
    "syl-moulvibazar",
]

RESET_TABLES_IN_ORDER = [
    "report_status_history",
    "prevention_tasks",
    "breeding_reports",
    "slots",
    "doctor_schedules",
    "doctors",
    "bed_availability",
    "hospitals",
    "lab_tests",
    "labs",
    "donor_profiles",
    "users",
    "districts",
    "divisions",
]


def new_id() -> str:
    return str(uuid.uuid4())


async def fetch_all(session: AsyncSession, model) -> list:
    """Fetch every row of ``model``, sorted by primary key. Plain ``SELECT *``
    gives no row-order guarantee, and several seeders pick entries from these
    lists by index with a deterministic RNG — a stable order keeps those
    choices reproducible across reruns."""
    rows = (await session.execute(select(model))).scalars().all()
    pk_columns = [c.key for c in inspect(model).primary_key]
    return sorted(rows, key=lambda r: tuple(getattr(r, c) for c in pk_columns))


async def reset(session: AsyncSession) -> None:
    for table in RESET_TABLES_IN_ORDER:
        await session.execute(text(f"DELETE FROM {table}"))
    await session.commit()


async def build_geo(
    session: AsyncSession, new_objects: list
) -> tuple[dict[str, Division], dict[str, District]]:
    divisions = {d.id: d for d in await fetch_all(session, Division)}
    for d in DIVISIONS:
        if d["id"] in divisions:
            continue
        division = Division(
            id=d["id"],
            name_en=d["name_en"],
            name_bn=d["name_bn"],
            center_lat=d["center"][0],
            center_lng=d["center"][1],
        )
        divisions[d["id"]] = division
        new_objects.append(division)

    districts = {d.id: d for d in await fetch_all(session, District)}
    for d in DISTRICTS:
        if d["id"] in districts:
            continue
        district = District(
            id=d["id"],
            division_id=d["division_id"],
            name_en=d["name_en"],
            name_bn=d["name_bn"],
            center_lat=d["center"][0],
            center_lng=d["center"][1],
        )
        districts[d["id"]] = district
        new_objects.append(district)

    return divisions, districts


async def build_demo_users(session: AsyncSession, new_objects: list) -> dict[Role, User]:
    password_hash = hash_password(DEMO_PASSWORD)
    existing = {u.email: u for u in await fetch_all(session, User)}
    users: dict[Role, User] = {}
    for u in DEMO_USERS:
        user = existing.get(u["email"])
        if user is None:
            user = User(
                id=new_id(),
                name_en=u["name_en"],
                name_bn=u["name_bn"],
                email=u["email"],
                password_hash=password_hash,
                role=u["role"],
                approval_status=ApprovalStatus.approved,
                division_id="dhaka",
                district_id="dhaka-dhaka",
                language=Language.en,
                alert_divisions=["dhaka"],
            )
            existing[u["email"]] = user
            new_objects.append(user)
        users[u["role"]] = user
    return users


async def build_hospitals(
    session: AsyncSession, districts: dict[str, District], rng: random.Random, new_objects: list
) -> list[Hospital]:
    existing = {(h.name_en, h.district_id): h for h in await fetch_all(session, Hospital)}
    hospitals: list[Hospital] = []

    def add_hospital(
        name_en: str,
        name_bn: str,
        htype: HospitalType,
        division_id: str,
        district_id: str,
        emergency: bool,
    ) -> None:
        key = (name_en, district_id)
        hospital = existing.get(key)
        if hospital is None:
            district = districts[district_id]
            hospital = Hospital(
                id=new_id(),
                name_en=name_en,
                name_bn=name_bn,
                type=htype,
                division_id=division_id,
                district_id=district_id,
                address_en=f"{district.name_en} Sadar, {district.name_en}",
                address_bn=f"{district.name_bn} সদর",
                phone=f"+8802{rng.randint(1000000, 9999999)}",
                lat=district.center_lat + rng.uniform(-0.02, 0.02),
                lng=district.center_lng + rng.uniform(-0.02, 0.02),
                has_emergency=emergency,
                active=True,
            )
            existing[key] = hospital
            new_objects.append(hospital)
        hospitals.append(hospital)

    for division_id, district_id in DIVISION_CAPITAL_DISTRICT.items():
        district = districts[district_id]
        for suffix, htype, emergency in HOSPITAL_TEMPLATES:
            kind_bn = "সরকারি" if htype == HospitalType.government else "প্রাইভেট"
            add_hospital(
                f"{district.name_en} {suffix}",
                f"{district.name_bn} {kind_bn} হাসপাতাল",
                htype,
                division_id,
                district_id,
                emergency,
            )

    add_hospital(
        "Dhaka Dengue Treatment Center",
        "ঢাকা ডেঙ্গু চিকিৎসা কেন্দ্র",
        HospitalType.government,
        "dhaka",
        "dhaka-dhaka",
        True,
    )

    return hospitals


async def build_bed_availability(
    session: AsyncSession, hospitals: list[Hospital], rng: random.Random, new_objects: list
) -> None:
    existing = {b.hospital_id for b in await fetch_all(session, BedAvailability)}
    for hospital in hospitals:
        if hospital.id in existing:
            continue
        general_total = rng.randint(40, 150)
        icu_total = rng.randint(4, 20)
        new_objects.append(
            BedAvailability(
                hospital_id=hospital.id,
                general_total=general_total,
                general_available=rng.randint(0, general_total),
                icu_total=icu_total,
                icu_available=rng.randint(0, icu_total),
                updated_at=datetime.now(UTC),
            )
        )


async def build_doctor_rows(
    session: AsyncSession, hospitals: list[Hospital], rng: random.Random, new_objects: list
) -> list[Doctor]:
    """Create doctor rows only (no schedule/slot rows yet: those reference the
    doctor's id, which must exist in the database first)."""
    # Grouped by (hospital, slot index) rather than the generated name: a
    # shared sequential rng draws a different number of values each run
    # (fewer when rows already exist to skip), so a name-based key would
    # drift and create duplicates instead of being recognised as existing.
    existing_by_hospital: dict[str, list[Doctor]] = {}
    for d in await fetch_all(session, Doctor):
        existing_by_hospital.setdefault(d.hospital_id, []).append(d)
    doctors: list[Doctor] = []

    for hospital in hospitals:
        existing_for_hospital = existing_by_hospital.setdefault(hospital.id, [])
        for idx in range(2):
            doctor = existing_for_hospital[idx] if idx < len(existing_for_hospital) else None
            if doctor is None:
                local_rng = random.Random(f"{hospital.id}:doctor:{idx}")
                first = local_rng.choice(DOCTOR_FIRST_NAMES)
                last = local_rng.choice(DOCTOR_LAST_NAMES)
                name_en = f"Dr. {first} {last}"
                specialty_en, specialty_bn = local_rng.choice(SPECIALTIES)
                doctor = Doctor(
                    id=new_id(),
                    hospital_id=hospital.id,
                    name_en=name_en,
                    name_bn=f"ডা. {first} {last}",
                    specialty_en=specialty_en,
                    specialty_bn=specialty_bn,
                    phone=f"+8801{rng.randint(100000000, 999999999)}",
                    active=True,
                )
                existing_for_hospital.append(doctor)
                new_objects.append(doctor)
            doctors.append(doctor)

    return doctors


async def build_doctor_schedules_and_slots(
    session: AsyncSession, doctors: list[Doctor], rng: random.Random, new_objects: list
) -> None:
    existing_schedules = {
        (s.doctor_id, s.weekday) for s in await fetch_all(session, DoctorSchedule)
    }
    existing_slots = {(s.doctor_id, s.start_at) for s in await fetch_all(session, Slot)}
    today = date.today()

    for doctor in doctors:
        for weekday in (0, 2, 4):
            skey = (doctor.id, weekday)
            if skey in existing_schedules:
                continue
            existing_schedules.add(skey)
            new_objects.append(
                DoctorSchedule(
                    id=new_id(),
                    doctor_id=doctor.id,
                    weekday=weekday,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                )
            )

        for day_offset in range(7):
            day = today + timedelta(days=day_offset)
            start_at = datetime.combine(day, time(9, 0), tzinfo=UTC)
            lkey = (doctor.id, start_at)
            if lkey in existing_slots:
                continue
            existing_slots.add(lkey)
            capacity = 10
            new_objects.append(
                Slot(
                    id=new_id(),
                    doctor_id=doctor.id,
                    hospital_id=doctor.hospital_id,
                    start_at=start_at,
                    end_at=datetime.combine(day, time(13, 0), tzinfo=UTC),
                    capacity=capacity,
                    booked_count=rng.randint(0, capacity),
                )
            )


async def build_labs(
    session: AsyncSession, districts: dict[str, District], rng: random.Random, new_objects: list
) -> list[Lab]:
    existing_labs = {(lb.name_en, lb.district_id): lb for lb in await fetch_all(session, Lab)}
    lab_district_ids = list(DIVISION_CAPITAL_DISTRICT.values()) + LAB_EXTRA_DISTRICTS
    labs: list[Lab] = []

    for district_id in lab_district_ids:
        district = districts[district_id]
        name_en = f"{district.name_en} Diagnostic Lab"
        key = (name_en, district_id)
        lab = existing_labs.get(key)
        if lab is None:
            lab = Lab(
                id=new_id(),
                name_en=name_en,
                name_bn=f"{district.name_bn} ডায়াগনস্টিক ল্যাব",
                type=rng.choice([HospitalType.government, HospitalType.private]),
                division_id=district.division_id,
                district_id=district_id,
                address_en=f"{district.name_en} Sadar, {district.name_en}",
                address_bn=f"{district.name_bn} সদর",
                phone=f"+8802{rng.randint(1000000, 9999999)}",
                lat=district.center_lat + rng.uniform(-0.02, 0.02),
                lng=district.center_lng + rng.uniform(-0.02, 0.02),
                home_collection=rng.choice([True, False]),
                weekly_hours={"sat_thu": "08:00-20:00", "fri": "closed"},
                active=True,
            )
            existing_labs[key] = lab
            new_objects.append(lab)
        labs.append(lab)

    return labs


async def build_lab_tests(session: AsyncSession, labs: list[Lab], new_objects: list) -> None:
    existing_tests = {(t.lab_id, t.code) for t in await fetch_all(session, LabTest)}

    for lab in labs:
        for code, price, price_max, hours in (
            (LabTestCode.ns1, 500, 800, 24),
            (LabTestCode.igm_igg, 800, 1200, 24),
            (LabTestCode.cbc, 300, 500, 6),
        ):
            tkey = (lab.id, code)
            if tkey in existing_tests:
                continue
            existing_tests.add(tkey)
            new_objects.append(
                LabTest(
                    id=new_id(),
                    lab_id=lab.id,
                    code=code,
                    price_bdt=price,
                    price_max_bdt=price_max,
                    turnaround_hours=hours,
                )
            )


async def build_donor_users(
    session: AsyncSession,
    districts: dict[str, District],
    rng: random.Random,
    new_objects: list,
) -> list[User]:
    """Create the 40 extra donor user accounts only (no donor profile rows
    yet: those reference the user's id, which must exist in the database
    first)."""
    existing_users = {u.email: u for u in await fetch_all(session, User)}
    users: list[User] = []
    district_ids = list(districts.keys())

    for i in range(1, 41):
        email = f"donor{i}@dengueguard.bd"
        district = districts[rng.choice(district_ids)]
        first = rng.choice(DONOR_FIRST_NAMES)
        user = existing_users.get(email)
        if user is None:
            user = User(
                id=new_id(),
                name_en=f"{first} Donor {i}",
                name_bn=f"{first} ডোনার {i}",
                email=email,
                phone=f"+8801{rng.randint(100000000, 999999999)}",
                password_hash=hash_password(DEMO_PASSWORD),
                role=Role.donor,
                approval_status=ApprovalStatus.approved,
                division_id=district.division_id,
                district_id=district.id,
                language=rng.choice([Language.en, Language.bn]),
                alert_divisions=[district.division_id],
            )
            existing_users[email] = user
            new_objects.append(user)
        users.append(user)

    return users


async def build_donor_profiles(
    session: AsyncSession,
    demo_donor_user: User,
    donor_users: list[User],
    districts: dict[str, District],
    rng: random.Random,
    new_objects: list,
) -> None:
    existing_profiles = {dp.user_id for dp in await fetch_all(session, DonorProfile)}

    if demo_donor_user.id not in existing_profiles:
        new_objects.append(
            DonorProfile(
                id=new_id(),
                user_id=demo_donor_user.id,
                blood_group=BloodGroup.o_pos,
                donation_type=DonationType.both,
                division_id="dhaka",
                district_id="dhaka-dhaka",
                phone="+8801700000000",
                share_after_accept=True,
                available=True,
                last_active_at=datetime.now(UTC),
            )
        )

    blood_groups = list(BloodGroup)
    donation_types = list(DonationType)

    for user in donor_users:
        if user.id in existing_profiles:
            continue
        existing_profiles.add(user.id)
        district = districts[user.district_id]
        last_donation = (
            date.today() - timedelta(days=rng.randint(30, 400)) if rng.random() > 0.3 else None
        )
        new_objects.append(
            DonorProfile(
                id=new_id(),
                user_id=user.id,
                blood_group=rng.choice(blood_groups),
                donation_type=rng.choice(donation_types),
                division_id=district.division_id,
                district_id=district.id,
                last_donation_date=last_donation,
                phone=user.phone,
                share_after_accept=True,
                available=rng.random() > 0.2,
                last_active_at=datetime.now(UTC) - timedelta(days=rng.randint(0, 30)),
            )
        )


async def build_breeding_reports(
    session: AsyncSession,
    citizen_user: User,
    districts: dict[str, District],
    rng: random.Random,
    new_objects: list,
) -> list[BreedingReport]:
    existing = {r.reference: r for r in await fetch_all(session, BreedingReport)}
    site_types = list(BreedingSiteType)
    statuses = list(BreedingReportStatus)
    district_ids = list(districts.keys())
    reports: list[BreedingReport] = []

    for i in range(1, 16):
        reference = f"BR-{i:04d}"
        report = existing.get(reference)
        if report is None:
            district = districts[rng.choice(district_ids)]
            report = BreedingReport(
                id=new_id(),
                reference=reference,
                user_id=citizen_user.id,
                lat=district.center_lat + rng.uniform(-0.03, 0.03),
                lng=district.center_lng + rng.uniform(-0.03, 0.03),
                area_name=f"{district.name_en} Ward {rng.randint(1, 20)}",
                site_type=rng.choice(site_types),
                note="Standing water observed near residential area (simulated report).",
                status=rng.choice(statuses),
                division_id=district.division_id,
                district_id=district.id,
            )
            existing[reference] = report
            new_objects.append(report)
        reports.append(report)

    return reports


async def build_report_status_history(
    session: AsyncSession,
    reports: list[BreedingReport],
    citizen_user: User,
    new_objects: list,
) -> None:
    existing_report_ids = {h.report_id for h in await fetch_all(session, ReportStatusHistory)}
    for report in reports:
        if report.id in existing_report_ids:
            continue
        existing_report_ids.add(report.id)
        new_objects.append(
            ReportStatusHistory(
                id=new_id(),
                report_id=report.id,
                status=BreedingReportStatus.submitted,
                note="Report submitted.",
                changed_by=citizen_user.id,
                created_at=datetime.now(UTC),
            )
        )


async def build_prevention_tasks(
    session: AsyncSession,
    divisions: dict[str, Division],
    reports: list[BreedingReport],
    new_objects: list,
) -> None:
    # Title alone is the natural key (it already encodes the loop index);
    # the division is only cosmetic, so it's drawn from a per-task seeded
    # rng rather than the shared one — stable across reruns regardless of
    # how many other rng draws earlier phases skipped.
    existing_titles = {t.title for t in await fetch_all(session, PreventionTask)}
    teams = ["Zone A Larviciding Team", "Zone B Cleanup Team", "Mobile Fogging Unit"]
    statuses = list(PreventionTaskStatus)
    division_ids = list(divisions.keys())

    for i in range(1, 11):
        title = f"Breeding site cleanup #{i}"
        if title in existing_titles:
            continue
        existing_titles.add(title)
        local_rng = random.Random(f"prevention-task:{i}")
        division = divisions[local_rng.choice(division_ids)]
        linked_report = reports[i - 1] if i <= len(reports) else None
        new_objects.append(
            PreventionTask(
                id=new_id(),
                title=title,
                area=f"{division.name_en} sample area {i}",
                division_id=division.id,
                assigned_team=local_rng.choice(teams),
                due_date=date.today() + timedelta(days=local_rng.randint(1, 14)),
                linked_report_id=linked_report.id if linked_report else None,
                status=local_rng.choice(statuses),
            )
        )


async def run(reset_first: bool) -> None:
    async with async_session_maker() as session:
        if reset_first:
            await reset(session)

        rng = random.Random(1234)

        # No ORM relationship() links these tables, so SQLAlchemy's flush
        # can't infer cross-table insert order on its own — each phase below
        # is flushed before the next one is built, so FK targets always
        # already exist in the database by the time they're referenced.

        # Phase 0: geo reference data, depended on by everything else.
        geo: list = []
        divisions, districts = await build_geo(session, geo)
        session.add_all(geo)
        await session.flush()

        # Phase A: rows that only depend on phase 0.
        phase_a: list = []
        users = await build_demo_users(session, phase_a)
        hospitals = await build_hospitals(session, districts, rng, phase_a)
        labs = await build_labs(session, districts, rng, phase_a)
        donor_users = await build_donor_users(session, districts, rng, phase_a)
        session.add_all(phase_a)
        await session.flush()

        # Phase B: rows that reference phase A rows.
        phase_b: list = []
        await build_bed_availability(session, hospitals, rng, phase_b)
        doctors = await build_doctor_rows(session, hospitals, rng, phase_b)
        await build_lab_tests(session, labs, phase_b)
        await build_donor_profiles(session, users[Role.donor], donor_users, districts, rng, phase_b)
        reports = await build_breeding_reports(
            session, users[Role.citizen], districts, rng, phase_b
        )
        session.add_all(phase_b)
        await session.flush()

        # Phase C: rows that reference phase B rows.
        phase_c: list = []
        await build_doctor_schedules_and_slots(session, doctors, rng, phase_c)
        await build_report_status_history(session, reports, users[Role.citizen], phase_c)
        await build_prevention_tasks(session, divisions, reports, phase_c)
        session.add_all(phase_c)

        await session.commit()

    await engine.dispose()

    print(f"\nSeed complete. Demo accounts (password: {DEMO_PASSWORD}):")
    for u in DEMO_USERS:
        print(f"  {u['role'].value:16s} {u['email']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed DengueGuard BD demo data.")
    parser.add_argument(
        "--reset", action="store_true", help="Delete all seeded rows before reseeding."
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.reset))
