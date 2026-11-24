import pytest
from sqlalchemy import select

from app.models.audit import AuditLog
from app.models.enums import ApprovalStatus, AuditAction, Role
from app.models.user import User
from app.services.rate_limit import reset_rate_limits
from app.services.security import hash_password


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    reset_rate_limits()
    yield
    reset_rate_limits()


async def _make(db_session, role, approval_status, email) -> User:
    user = User(
        id=f"id-{email}", name_en="Staffer", name_bn="স্টাফ", email=email,
        password_hash=hash_password("x"), role=role, approval_status=approval_status,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login_headers(client, email: str, password: str = "password1") -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['accessToken']}"}


async def test_list_pending_staff_returns_only_pending(client, db_session):
    await _make(db_session, Role.hospital_staff, ApprovalStatus.pending, "pending1@example.com")
    await _make(db_session, Role.donor, ApprovalStatus.approved, "donor1@example.com")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin1@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin1@example.com")
    resp = await client.get("/api/v1/admin/staff/pending", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_non_admin_cannot_list_pending_staff(client, db_session):
    citizen = await _make(db_session, Role.citizen, ApprovalStatus.approved, "citizen1@example.com")
    citizen.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "citizen1@example.com")
    resp = await client.get("/api/v1/admin/staff/pending", headers=headers)
    assert resp.status_code == 403


async def test_approve_staff_sets_approved_and_creates_audit_row(client, db_session):
    staff = await _make(
        db_session, Role.hospital_staff, ApprovalStatus.pending, "staff1@example.com"
    )
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin2@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin2@example.com")
    resp = await client.post(f"/api/v1/admin/staff/{staff.id}/approve", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["approvalStatus"] == "approved"

    row = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == AuditAction.signup_approve)
    )).scalar_one()
    assert row.actor_id == admin.id


async def test_approve_nonexistent_user_is_404(client, db_session):
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin3@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin3@example.com")
    resp = await client.post("/api/v1/admin/staff/does-not-exist/approve", headers=headers)
    assert resp.status_code == 404


async def test_reject_staff_sets_rejected_with_reason_and_audit_row(client, db_session):
    staff = await _make(db_session, Role.lab_staff, ApprovalStatus.pending, "staff2@example.com")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin4@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin4@example.com")
    resp = await client.post(
        f"/api/v1/admin/staff/{staff.id}/reject",
        json={"reason": "no license on file"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["approvalStatus"] == "rejected"

    row = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == AuditAction.signup_reject)
    )).scalar_one()
    assert "no license on file" in row.target_en


async def test_reject_non_staff_user_is_409(client, db_session):
    citizen = await _make(db_session, Role.citizen, ApprovalStatus.approved, "citizen2@example.com")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin5@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin5@example.com")
    resp = await client.post(
        f"/api/v1/admin/staff/{citizen.id}/reject", json={"reason": "not staff"}, headers=headers
    )
    assert resp.status_code == 409


async def test_approve_already_approved_staff_is_409(client, db_session):
    staff = await _make(db_session, Role.hospital_staff, ApprovalStatus.approved, "staff3@example.com")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin6@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin6@example.com")
    resp = await client.post(f"/api/v1/admin/staff/{staff.id}/approve", headers=headers)
    assert resp.status_code == 409


async def test_reject_with_long_reason_does_not_crash(client, db_session):
    staff = await _make(db_session, Role.lab_staff, ApprovalStatus.pending, "staff4@example.com")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin8@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin8@example.com")
    resp = await client.post(
        f"/api/v1/admin/staff/{staff.id}/reject",
        json={"reason": "x" * 500},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["approvalStatus"] == "rejected"


async def test_admin_cannot_reject_own_account(client, db_session):
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin7@example.com")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin7@example.com")
    resp = await client.post(f"/api/v1/admin/staff/{admin.id}/reject", json={"reason": "x"}, headers=headers)
    assert resp.status_code == 409
