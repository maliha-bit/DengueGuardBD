import pytest

from app.services.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    reset_rate_limits()
    yield
    reset_rate_limits()


async def _register_and_login(client, email: str) -> dict:
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": email, "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password1"})
    return resp.json()


async def test_get_me_requires_auth(client):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_get_me_returns_profile(client):
    tokens = await _register_and_login(client, "profile1@example.com")
    resp = await client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {tokens['accessToken']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"]["en"] == "A"


async def test_patch_me_updates_allowed_fields(client):
    tokens = await _register_and_login(client, "profile2@example.com")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    resp = await client.patch(
        "/api/v1/users/me",
        json={"phone": "+8801700000001", "alertDivisions": ["dhaka"]},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["alertDivisions"] == ["dhaka"]


async def test_patch_me_ignores_unset_fields(client):
    tokens = await _register_and_login(client, "profile3@example.com")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    await client.patch("/api/v1/users/me", json={"phone": "+8801700000002"}, headers=headers)
    resp = await client.patch("/api/v1/users/me", json={"nameBn": "নতুন নাম"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"]["bn"] == "নতুন নাম"


async def test_patch_me_rejects_null_name_en(client):
    tokens = await _register_and_login(client, "profile4@example.com")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    resp = await client.patch("/api/v1/users/me", json={"nameEn": None}, headers=headers)
    assert resp.status_code == 422


async def test_patch_me_invalid_division_id_returns_422(client):
    tokens = await _register_and_login(client, "profile5@example.com")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    resp = await client.patch(
        "/api/v1/users/me", json={"divisionId": "atlantis"}, headers=headers
    )
    assert resp.status_code == 422
