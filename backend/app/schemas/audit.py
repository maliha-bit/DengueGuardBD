from datetime import datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import AuditAction, Role
from app.schemas.common import CamelModel, LocalizedText, loc


class AuditEntryRead(CamelModel):
    audit_id: str
    actor_name: LocalizedText
    actor_role: Role | str
    action: AuditAction | str
    target: LocalizedText
    created_at: datetime | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "actor_role") and not isinstance(obj, dict):
            return {
                "audit_id": obj.id,
                "actor_name": loc(obj, "actor_name"),
                "actor_role": obj.actor_role,
                "action": obj.action,
                "target": loc(obj, "target"),
                "created_at": obj.created_at,
            }
        return obj
