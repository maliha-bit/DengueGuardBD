import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.enums import ApprovalStatus, Role
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.schemas.user import UserRead
from app.services.rate_limit import check_rate_limit
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

STAFF_ROLES = {Role.hospital_staff, Role.lab_staff, Role.authority}


@router.post("/register", status_code=201, response_model=UserRead)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    if payload.role == Role.admin:
        raise HTTPException(400, detail="Cannot self-register as admin")

    existing = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(409, detail="Email already registered")

    approval_status = (
        ApprovalStatus.pending if payload.role in STAFF_ROLES else ApprovalStatus.approved
    )
    user = User(
        id=str(uuid.uuid4()),
        name_en=payload.name_en,
        name_bn=payload.name_bn,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
        approval_status=approval_status,
        organisation_id=payload.organisation_id,
        division_id=payload.division_id,
        district_id=payload.district_id,
        language=payload.language,
        alert_divisions=[],
    )
    db.add(user)
    await db.commit()
    return user


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> TokenPair:
    check_rate_limit(f"login:{request.client.host}")

    user = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail="Invalid email or password")

    access = create_access_token(user.id, user.role.value)
    raw_refresh = create_refresh_token(user.id)
    claims = decode_token(raw_refresh)

    db.add(
        RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC),
            revoked=False,
            created_at=datetime.now(UTC),
        )
    )
    await db.commit()

    return TokenPair(access_token=access, refresh_token=raw_refresh)
