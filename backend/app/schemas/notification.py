from datetime import datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import NotificationKind
from app.schemas.common import CamelModel, LocalizedText, loc


class NotificationRead(CamelModel):
    notification_id: str
    kind: NotificationKind | str
    title: LocalizedText
    body: LocalizedText
    created_at: datetime | str
    read: bool

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "kind") and not isinstance(obj, dict):
            return {
                "notification_id": obj.id,
                "kind": obj.kind,
                "title": loc(obj, "title"),
                "body": loc(obj, "body"),
                "created_at": obj.created_at,
                "read": obj.read,
            }
        return obj
