import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_role
from app.models.enums import AuditAction, Role
from app.models.hospital import BedAvailability, Doctor, DoctorSchedule, Hospital, Slot
from app.models.user import User
from app.schemas.hospital import (
    BedAvailabilityRead,
    BedsUpdate,
    DoctorCreate,
    DoctorRead,
    DoctorScheduleRead,
    DoctorScheduleReplace,
    DoctorUpdate,
    SlotGenerateRequest,
    SlotGenerateResponse,
    SlotRead,
)
from app.services import audit

router = APIRouter(prefix="/staff/hospital", tags=["hospital-staff"])

_require_hospital_staff = require_role(Role.hospital_staff)


async def _own_hospital(current_user: User, db: AsyncSession) -> Hospital:
    hospital = (
        await db.get(Hospital, current_user.organisation_id)
        if current_user.organisation_id
        else None
    )
    if hospital is None:
        raise HTTPException(404, detail="No hospital is linked to this staff account")
    return hospital


async def _own_doctor(hospital: Hospital, doctor_id: str, db: AsyncSession) -> Doctor:
    doctor = await db.get(Doctor, doctor_id)
    if doctor is None or doctor.hospital_id != hospital.id:
        raise HTTPException(404, detail="Doctor not found")
    return doctor


@router.patch("/beds", response_model=BedAvailabilityRead)
async def update_beds(
    payload: BedsUpdate,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> BedAvailability:
    hospital = await _own_hospital(current_user, db)
    beds = await db.get(BedAvailability, hospital.id)
    if beds is None:
        raise HTTPException(404, detail="Bed availability record not found")

    general_total = (
        payload.general_total if payload.general_total is not None else beds.general_total
    )
    icu_total = payload.icu_total if payload.icu_total is not None else beds.icu_total
    general_available = (
        payload.general_available
        if payload.general_available is not None
        else beds.general_available
    )
    icu_available = (
        payload.icu_available if payload.icu_available is not None else beds.icu_available
    )

    if not (0 <= general_available <= general_total):
        raise HTTPException(422, detail="generalAvailable must be between 0 and generalTotal")
    if not (0 <= icu_available <= icu_total):
        raise HTTPException(422, detail="icuAvailable must be between 0 and icuTotal")

    beds.general_total = general_total
    beds.icu_total = icu_total
    beds.general_available = general_available
    beds.icu_available = icu_available
    beds.updated_at = datetime.now(UTC)

    await audit.log(
        db,
        current_user,
        AuditAction.beds_update,
        f"Updated bed availability for {hospital.name_en}",
        f"{hospital.name_bn} এর শয্যার তথ্য হালনাগাদ করা হয়েছে",
        details=f"general {general_available}/{general_total}, icu {icu_available}/{icu_total}",
    )
    await db.commit()
    return beds


@router.get("/doctors", response_model=list[DoctorRead])
async def list_doctors(
    current_user: User = Depends(_require_hospital_staff), db: AsyncSession = Depends(get_db)
) -> list[Doctor]:
    hospital = await _own_hospital(current_user, db)
    result = await db.execute(select(Doctor).where(Doctor.hospital_id == hospital.id))
    return list(result.scalars().all())


@router.post("/doctors", status_code=201, response_model=DoctorRead)
async def create_doctor(
    payload: DoctorCreate,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> Doctor:
    hospital = await _own_hospital(current_user, db)
    doctor = Doctor(
        id=str(uuid.uuid4()), hospital_id=hospital.id, active=True, **payload.model_dump()
    )
    db.add(doctor)
    await audit.log(
        db,
        current_user,
        AuditAction.doctor_create,
        f"Added doctor {doctor.name_en}",
        f"ডাক্তার {doctor.name_bn} যোগ করা হয়েছে",
    )
    await db.commit()
    return doctor


@router.patch("/doctors/{doctor_id}", response_model=DoctorRead)
async def update_doctor(
    doctor_id: str,
    payload: DoctorUpdate,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> Doctor:
    hospital = await _own_hospital(current_user, db)
    doctor = await _own_doctor(hospital, doctor_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    await audit.log(
        db,
        current_user,
        AuditAction.doctor_update,
        f"Updated doctor {doctor.name_en}",
        f"ডাক্তার {doctor.name_bn} হালনাগাদ করা হয়েছে",
    )
    await db.commit()
    return doctor


@router.post("/doctors/{doctor_id}/deactivate", response_model=DoctorRead)
async def deactivate_doctor(
    doctor_id: str,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> Doctor:
    hospital = await _own_hospital(current_user, db)
    doctor = await _own_doctor(hospital, doctor_id, db)
    if not doctor.active:
        raise HTTPException(409, detail="Doctor is already inactive")
    doctor.active = False
    await audit.log(
        db,
        current_user,
        AuditAction.doctor_deactivate,
        f"Deactivated doctor {doctor.name_en}",
        f"ডাক্তার {doctor.name_bn} নিষ্ক্রিয় করা হয়েছে",
    )
    await db.commit()
    return doctor


@router.post("/doctors/{doctor_id}/activate", response_model=DoctorRead)
async def activate_doctor(
    doctor_id: str,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> Doctor:
    hospital = await _own_hospital(current_user, db)
    doctor = await _own_doctor(hospital, doctor_id, db)
    if doctor.active:
        raise HTTPException(409, detail="Doctor is already active")
    doctor.active = True
    await audit.log(
        db,
        current_user,
        AuditAction.doctor_activate,
        f"Activated doctor {doctor.name_en}",
        f"ডাক্তার {doctor.name_bn} সক্রিয় করা হয়েছে",
    )
    await db.commit()
    return doctor


@router.get("/doctors/{doctor_id}/schedule", response_model=list[DoctorScheduleRead])
async def get_schedule(
    doctor_id: str,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> list[DoctorSchedule]:
    hospital = await _own_hospital(current_user, db)
    await _own_doctor(hospital, doctor_id, db)
    result = await db.execute(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id == doctor_id)
        .order_by(DoctorSchedule.weekday, DoctorSchedule.start_time)
    )
    return list(result.scalars().all())


@router.put("/doctors/{doctor_id}/schedule", response_model=list[DoctorScheduleRead])
async def replace_schedule(
    doctor_id: str,
    payload: DoctorScheduleReplace,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> list[DoctorSchedule]:
    hospital = await _own_hospital(current_user, db)
    doctor = await _own_doctor(hospital, doctor_id, db)

    existing = await db.execute(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id))
    for row in existing.scalars().all():
        await db.delete(row)
    await db.flush()

    rows = [
        DoctorSchedule(
            id=str(uuid.uuid4()),
            doctor_id=doctor_id,
            weekday=entry.weekday,
            start_time=entry.start_time,
            end_time=entry.end_time,
        )
        for entry in payload.entries
    ]
    db.add_all(rows)
    await audit.log(
        db,
        current_user,
        AuditAction.schedule_update,
        f"Updated weekly schedule for {doctor.name_en}",
        f"{doctor.name_bn} এর সাপ্তাহিক সময়সূচি হালনাগাদ করা হয়েছে",
        details=f"{len(rows)} entries",
    )
    await db.commit()
    rows.sort(key=lambda r: (r.weekday, r.start_time))
    return rows


@router.post("/slots/generate", response_model=SlotGenerateResponse)
async def generate_slots(
    payload: SlotGenerateRequest,
    current_user: User = Depends(_require_hospital_staff),
    db: AsyncSession = Depends(get_db),
) -> SlotGenerateResponse:
    hospital = await _own_hospital(current_user, db)
    doctor = await _own_doctor(hospital, payload.doctor_id, db)

    schedule_rows = (
        (await db.execute(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor.id)))
        .scalars()
        .all()
    )
    by_weekday: dict[int, list[DoctorSchedule]] = {}
    for row in schedule_rows:
        by_weekday.setdefault(row.weekday, []).append(row)

    existing_starts = {
        s.start_at
        for s in (await db.execute(select(Slot).where(Slot.doctor_id == doctor.id))).scalars().all()
    }

    duration = timedelta(minutes=payload.slot_duration_minutes)
    created: list[Slot] = []
    day = payload.start_date
    while day <= payload.end_date:
        for entry in by_weekday.get(day.weekday(), []):
            slot_start = datetime.combine(day, entry.start_time, tzinfo=UTC)
            shift_end = datetime.combine(day, entry.end_time, tzinfo=UTC)
            while slot_start + duration <= shift_end:
                if slot_start not in existing_starts:
                    existing_starts.add(slot_start)
                    created.append(
                        Slot(
                            id=str(uuid.uuid4()),
                            doctor_id=doctor.id,
                            hospital_id=hospital.id,
                            start_at=slot_start,
                            end_at=slot_start + duration,
                            capacity=payload.capacity,
                            booked_count=0,
                        )
                    )
                slot_start += duration
        day += timedelta(days=1)

    db.add_all(created)
    await audit.log(
        db,
        current_user,
        AuditAction.slots_publish,
        f"Published {len(created)} slots for {doctor.name_en}",
        f"{doctor.name_bn} এর জন্য {len(created)}টি স্লট প্রকাশ করা হয়েছে",
        details=f"{payload.start_date}–{payload.end_date}",
    )
    await db.commit()
    return SlotGenerateResponse(
        created=len(created), slots=[SlotRead.model_validate(s) for s in created]
    )
