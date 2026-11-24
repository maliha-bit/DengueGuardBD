import pytest

from app.models.enums import AuditAction, Role
from app.models.user import User
from app.services.audit import log
from app.services.security import hash_password


@pytest.fixture
async def actor(db_session):
    user = User(
        id="actor-1",
        name_en="Admin One",
        name_bn="অ্যাডমিন ১",
        email="admin1@test.local",
        password_hash=hash_password("x"),
        role=Role.admin,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def test_log_creates_audit_row(db_session, actor):
    entry = await log(db_session, actor, AuditAction.signup_approve, "Jane Doe", "জেন ডো")
    await db_session.flush()
    assert entry.actor_id == actor.id
    assert entry.actor_role == Role.admin
    assert entry.action == AuditAction.signup_approve
    assert entry.target_en == "Jane Doe"


async def test_log_appends_details_to_target_text(db_session, actor):
    entry = await log(
        db_session, actor, AuditAction.signup_reject, "Jane Doe", "জেন ডো",
        details="duplicate account",
    )
    assert "duplicate account" in entry.target_en


async def test_log_truncates_overlong_target_text(db_session, actor):
    long_details = "x" * 500
    entry = await log(
        db_session, actor, AuditAction.signup_reject, "Jane Doe", "জেন ডো",
        details=long_details,
    )
    await db_session.flush()
    assert len(entry.target_en) <= 200
    assert len(entry.target_bn) <= 200
