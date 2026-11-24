from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.geo import District
from app.models.hospital import BedAvailability, Hospital
from app.schemas.common import loc
from app.schemas.hospital import BedAvailabilityRead, HospitalListItem, HospitalListResponse

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

_STALE_AFTER = timedelta(hours=6)
_NEARBY_FALLBACK_LIMIT = 5


def _available_beds(beds: BedAvailability | None) -> int:
    if beds is None:
        return 0
    return beds.general_available + beds.icu_available


def _to_item(
    hospital: Hospital, beds: BedAvailability | None, nearby_district: bool
) -> HospitalListItem:
    is_stale = beds is None or (datetime.now(UTC) - beds.updated_at) > _STALE_AFTER
    return HospitalListItem(
        hospital_id=hospital.id,
        name=loc(hospital, "name"),
        type=hospital.type,
        division_id=hospital.division_id,
        district_id=hospital.district_id,
        address=loc(hospital, "address"),
        phone=hospital.phone,
        location=[hospital.lat, hospital.lng],
        has_emergency=hospital.has_emergency,
        beds=BedAvailabilityRead.model_validate(beds) if beds is not None else None,
        is_stale=is_stale,
        nearby_district=nearby_district,
    )


def _apply_filters(
    stmt,
    *,
    division: str | None,
    district: str | None,
    has_icu: bool | None,
    search: str | None,
):
    stmt = stmt.where(Hospital.active.is_(True))
    if division:
        stmt = stmt.where(Hospital.division_id == division)
    if district:
        stmt = stmt.where(Hospital.district_id == district)
    if has_icu is not None:
        if has_icu:
            stmt = stmt.where(BedAvailability.icu_total > 0)
        else:
            stmt = stmt.where(
                or_(BedAvailability.icu_total.is_(None), BedAvailability.icu_total == 0)
            )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(Hospital.name_en.ilike(pattern), Hospital.name_bn.ilike(pattern)))
    return stmt


@router.get("", response_model=HospitalListResponse)
async def list_hospitals(
    division: str | None = Query(default=None),
    district: str | None = Query(default=None),
    has_icu: bool | None = Query(default=None, alias="hasIcu"),
    search: str | None = Query(default=None),
    sort: Literal["beds", "updated"] = Query(default="updated"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
) -> HospitalListResponse:
    base = select(Hospital, BedAvailability).outerjoin(
        BedAvailability, Hospital.id == BedAvailability.hospital_id
    )
    base = _apply_filters(
        base, division=division, district=district, has_icu=has_icu, search=search
    )

    total = (
        await db.execute(
            select(func.count()).select_from(base.with_only_columns(Hospital.id).subquery())
        )
    ).scalar_one()

    if sort == "beds":
        order = (
            func.coalesce(BedAvailability.general_available, 0)
            + func.coalesce(BedAvailability.icu_available, 0)
        ).desc()
    else:
        order = BedAvailability.updated_at.desc().nullslast()
    page_stmt = base.order_by(order).offset((page - 1) * page_size).limit(page_size)

    rows = (await db.execute(page_stmt)).all()
    items = [_to_item(hospital, beds, nearby_district=False) for hospital, beds in rows]

    if district and page == 1:
        district_row = await db.get(District, district)
        if district_row is not None:
            # Re-run the (unpaginated) filtered query to check beds across
            # *every* matching hospital in the district, not just this page.
            all_matching_rows = (await db.execute(base)).all()
            if sum(_available_beds(beds) for _, beds in all_matching_rows) == 0:
                fallback_stmt = _apply_filters(
                    select(Hospital, BedAvailability).outerjoin(
                        BedAvailability, Hospital.id == BedAvailability.hospital_id
                    ),
                    division=district_row.division_id,
                    district=None,
                    has_icu=has_icu,
                    search=search,
                ).where(Hospital.district_id != district)
                fallback_stmt = fallback_stmt.order_by(
                    (
                        func.coalesce(BedAvailability.general_available, 0)
                        + func.coalesce(BedAvailability.icu_available, 0)
                    ).desc()
                ).limit(_NEARBY_FALLBACK_LIMIT)
                fallback_rows = (await db.execute(fallback_stmt)).all()
                items.extend(
                    _to_item(hospital, beds, nearby_district=True)
                    for hospital, beds in fallback_rows
                )

    return HospitalListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{hospital_id}", response_model=HospitalListItem)
async def get_hospital(hospital_id: str, db: AsyncSession = Depends(get_db)) -> HospitalListItem:
    hospital = await db.get(Hospital, hospital_id)
    if hospital is None or not hospital.active:
        raise HTTPException(404, detail="Hospital not found")
    beds = await db.get(BedAvailability, hospital_id)
    return _to_item(hospital, beds, nearby_district=False)
