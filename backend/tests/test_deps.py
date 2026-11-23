from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.db import get_db
from app.deps import get_current_user, optional_user, require_role
from app.models.enums import ApprovalStatus, Role
from app.models.user import User
from app.services.security import create_access_token, hash_password


def make_test_app(db_session):
    app = FastAPI()

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db

    @app.get("/whoami")
    async def whoami(user: User = Depends(get_current_user)):
        return {"id": user.id}

    @app.get("/maybe")
    async def maybe(user: User | None = Depends(optional_user)):
        return {"id": user.id if user else None}

    @app.get("/admin-only")
    async def admin_only(user: User = Depends(require_role(Role.admin))):
        return {"id": user.id}

    @app.get("/staff-only")
    async def staff_only(user: User = Depends(require_role(Role.hospital_staff))):
        return {"id": user.id}

    return app


async def make_user(db_session, role, approval_status=ApprovalStatus.approved):
    user = User(
        id=f"user-{role.value}-{approval_status.value}",
        name_en="T",
        name_bn="T",
        email=f"{role.value}-{approval_status.value}@test.local",
        password_hash=hash_password("x"),
        role=role,
        approval_status=approval_status,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def test_get_current_user_rejects_missing_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami")
    assert resp.status_code == 401


async def test_get_current_user_rejects_garbage_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


async def test_get_current_user_rejects_unknown_user(db_session):
    app = make_test_app(db_session)
    token = create_access_token("does-not-exist", "citizen")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_get_current_user_accepts_valid_token(db_session):
    user = await make_user(db_session, Role.citizen)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == user.id


async def test_optional_user_returns_null_without_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/maybe")
    assert resp.status_code == 200
    assert resp.json()["id"] is None


async def test_require_role_blocks_wrong_role(db_session):
    user = await make_user(db_session, Role.citizen)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


async def test_require_role_blocks_pending_staff(db_session):
    user = await make_user(db_session, Role.hospital_staff, ApprovalStatus.pending)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/staff-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "approval_pending"


async def test_require_role_allows_approved_staff(db_session):
    user = await make_user(db_session, Role.hospital_staff, ApprovalStatus.approved)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/staff-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
