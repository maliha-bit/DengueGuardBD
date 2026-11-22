from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import ChatFeedback, ChatMessageRole, Language
from app.models.mixins import TimestampMixin, UUIDPkMixin, enum_column


class KnowledgeSource(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "knowledge_sources"

    title: Mapped[str] = mapped_column(String(300))
    publisher: Mapped[str] = mapped_column(String(150))
    url: Mapped[str] = mapped_column(String(500))
    reviewed_on: Mapped[date] = mapped_column(Date)


class ChatSession(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "chat_sessions"

    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    division_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("divisions.id"))
    lang: Mapped[Language] = mapped_column(enum_column(Language), default=Language.en)


class ChatMessage(Base, UUIDPkMixin):
    __tablename__ = "chat_messages"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_sessions.id"), index=True
    )
    role: Mapped[ChatMessageRole] = mapped_column(enum_column(ChatMessageRole))
    lang: Mapped[Language] = mapped_column(enum_column(Language))
    content: Mapped[dict] = mapped_column(JSON)
    feedback: Mapped[ChatFeedback | None] = mapped_column(enum_column(ChatFeedback))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
