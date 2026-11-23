import pytest
from sqlalchemy import select

from app.models.user import User
from app.services.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    reset_rate_limits()
    yield
    reset_rate_limits()


async def test_register_citizen_is_approved(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "jane@example.com", "password": "password1",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["role"] == "citizen"
    assert body["approvalStatus"] == "approved"


async def test_register_staff_without_organisation_is_422(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "staff@example.com", "password": "password1",
        "role": "hospital_staff",
    })
    assert resp.status_code == 422


async def test_register_staff_with_organisation_is_pending(client, db_session):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "staff2@example.com", "password": "password1",
        "role": "hospital_staff", "organisationId": "City Hospital",
    })
    assert resp.status_code == 201
    assert resp.json()["approvalStatus"] == "pending"
    row = (await db_session.execute(
        select(User).where(User.email == "staff2@example.com")
    )).scalar_one()
    assert row.organisation_id == "City Hospital"


async def test_register_admin_role_is_rejected(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "wannabe-admin@example.com",
        "password": "password1", "role": "admin",
    })
    assert resp.status_code == 400


async def test_register_duplicate_email_is_409(client):
    payload = {"nameEn": "A", "nameBn": "আ", "email": "dup@example.com", "password": "password1"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success_returns_tokens(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "login1@example.com", "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login1@example.com", "password": "password1",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["accessToken"] and body["refreshToken"]


async def test_login_wrong_password_is_401(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "login2@example.com", "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login2@example.com", "password": "wrong-password",
    })
    assert resp.status_code == 401


async def test_login_unknown_email_is_401(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com", "password": "password1",
    })
    assert resp.status_code == 401


async def test_login_rate_limited_after_five_attempts(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "rl@example.com", "password": "password1",
    })
    for _ in range(5):
        await client.post("/api/v1/auth/login", json={
            "email": "rl@example.com", "password": "wrong",
        })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "rl@example.com", "password": "wrong",
    })
    assert resp.status_code == 429
