import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_client_fixture_can_call_health(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
