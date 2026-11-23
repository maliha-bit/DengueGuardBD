from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.enums import AuditAction
from app.models.user import User


async def log(
    db: AsyncSession,
    actor: User,
    action: AuditAction,
    target_en: str,
    target_bn: str,
    details: str | None = None,
) -> AuditLog:
    if details:
        target_en = f"{target_en} — {details}"
        target_bn = f"{target_bn} — {details}"

    entry = AuditLog(
        actor_id=actor.id,
        actor_role=actor.role,
        action=action,
        target_en=target_en,
        target_bn=target_bn,
        created_at=datetime.now(UTC),
    )
    db.add(entry)
    return entry
