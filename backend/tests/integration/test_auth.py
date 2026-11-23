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


async def _register_and_login(client, email: str) -> dict:
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": email, "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password1"})
    return resp.json()


async def test_refresh_issues_new_access_token(client):
    tokens = await _register_and_login(client, "refresh1@example.com")
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert resp.status_code == 200
    assert resp.json()["accessToken"]


async def test_refresh_rejects_invalid_token(client):
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": "garbage"})
    assert resp.status_code == 401


async def test_me_requires_auth(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_current_user(client):
    tokens = await _register_and_login(client, "me1@example.com")
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['accessToken']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"]["en"] == "A"


async def test_logout_revokes_refresh_token(client):
    tokens = await _register_and_login(client, "logout1@example.com")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    logout_resp = await client.post(
        "/api/v1/auth/logout", json={"refreshToken": tokens["refreshToken"]}, headers=headers
    )
    assert logout_resp.status_code == 204
    refresh_resp = await client.post(
        "/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )
    assert refresh_resp.status_code == 401
