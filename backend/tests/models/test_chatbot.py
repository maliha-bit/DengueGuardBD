from app.models.chatbot import ChatMessage, ChatSession, KnowledgeSource


def test_chat_session_user_id_nullable():
    assert ChatSession.__table__.c.user_id.nullable is True


def test_chat_message_fk_to_chat_sessions():
    fk_targets = {fk.target_fullname for fk in ChatMessage.__table__.foreign_keys}
    assert "chat_sessions.id" in fk_targets


def test_knowledge_source_table_exists():
    assert KnowledgeSource.__tablename__ == "knowledge_sources"
