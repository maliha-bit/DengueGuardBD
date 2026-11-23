from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_role
from app.models.enums import ApprovalStatus, AuditAction, Role
from app.models.user import User
from app.schemas.auth import RejectRequest
from app.schemas.user import UserRead
from app.services import audit

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/staff/pending", response_model=list[UserRead])
async def list_pending_staff(
    current_user: User = Depends(require_role(Role.admin)), db: AsyncSession = Depends(get_db)
) -> list[User]:
    result = await db.execute(select(User).where(User.approval_status == ApprovalStatus.pending))
    return list(result.scalars().all())


@router.post("/staff/{user_id}/approve", response_model=UserRead)
async def approve_staff(
    user_id: str,
    current_user: User = Depends(require_role(Role.admin)),
    db: AsyncSession = Depends(get_db),
) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(404, detail="User not found")

    target.approval_status = ApprovalStatus.approved
    await audit.log(
        db,
        current_user,
        AuditAction.signup_approve,
        f"Approved {target.name_en}",
        f"{target.name_bn} অনুমোদন করা হয়েছে",
    )
    await db.commit()
    return target


@router.post("/staff/{user_id}/reject", response_model=UserRead)
async def reject_staff(
    user_id: str,
    payload: RejectRequest,
    current_user: User = Depends(require_role(Role.admin)),
    db: AsyncSession = Depends(get_db),
) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(404, detail="User not found")

    target.approval_status = ApprovalStatus.rejected
    await audit.log(
        db,
        current_user,
        AuditAction.signup_reject,
        f"Rejected {target.name_en}",
        f"{target.name_bn} প্রত্যাখ্যান করা হয়েছে",
        details=payload.reason,
    )
    await db.commit()
    return target
