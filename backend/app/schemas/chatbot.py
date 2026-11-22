from datetime import date, datetime
from typing import Any

from pydantic import model_validator

from app.models.enums import ChatFeedback, ChatMessageRole, Language
from app.schemas.common import CamelModel


class KnowledgeSourceRead(CamelModel):
    source_id: str
    title: str
    publisher: str
    url: str
    reviewed_on: date | str

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "publisher") and not isinstance(obj, dict):
            return {
                "source_id": obj.id,
                "title": obj.title,
                "publisher": obj.publisher,
                "url": obj.url,
                "reviewed_on": obj.reviewed_on,
            }
        return obj


class ChatMessageRead(CamelModel):
    message_id: str
    role: ChatMessageRole | str
    created_at: datetime | str
    lang: Language | str
    content: dict
    feedback: ChatFeedback | str | None = None

    @model_validator(mode="before")
    @classmethod
    def _assemble(cls, obj: Any) -> Any:
        if hasattr(obj, "content") and not isinstance(obj, dict):
            return {
                "message_id": obj.id,
                "role": obj.role,
                "created_at": obj.created_at,
                "lang": obj.lang,
                "content": obj.content,
                "feedback": obj.feedback,
            }
        return obj
