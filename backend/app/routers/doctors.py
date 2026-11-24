from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.hospital import Doctor, Slot
from app.schemas.hospital import SlotRead

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("/{doctor_id}/slots", response_model=list[SlotRead])
async def list_doctor_slots(
    doctor_id: str,
    date_: date = Query(alias="date"),
    db: AsyncSession = Depends(get_db),
) -> list[Slot]:
    doctor = await db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(404, detail="Doctor not found")

    day_start = datetime.combine(date_, datetime.min.time(), tzinfo=UTC)
    day_end = day_start + timedelta(days=1)
    result = await db.execute(
        select(Slot)
        .where(Slot.doctor_id == doctor_id, Slot.start_at >= day_start, Slot.start_at < day_end)
        .order_by(Slot.start_at)
    )
    return list(result.scalars().all())
