import httpx
import pytest

from app.config import Settings
from app.services.hexa_api_service import HexaApiService, sanitize_context


def make_settings(**overrides):
    values = {
        "GEMINI_API_KEY": "test-key",
        "CLIENT_URL": "http://localhost:5173",
        "HEXA_API_URL": "http://localhost:4000",
        "HEXA_ACCOUNT_CONTEXT_PATH": "/api/ai/context",
    }
    values.update(overrides)
    return Settings(**values)


def test_sanitize_context_removes_sensitive_fields_recursively():
    payload = {
        "walletBalance": 500,
        "password": "secret",
        "profile": {"name": "Masud", "pin": "1234", "status": "active"},
        "items": [
            {"product": "Netflix", "credentials": {"email": "x", "password": "y"}},
            {"product": "Canva", "expiresAt": "2026-09-01"},
        ],
        "accessToken": "jwt",
        "encryptedPayload": "cipher",
    }

    assert sanitize_context(payload) == {
        "walletBalance": 500,
        "profile": {"name": "Masud", "status": "active"},
        "items": [
            {"product": "Netflix"},
            {"product": "Canva", "expiresAt": "2026-09-01"},
        ],
    }


@pytest.mark.asyncio
async def test_fetch_account_context_forwards_bearer_header_to_configured_endpoint():
    seen = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["authorization"] = request.headers.get("authorization")
        return httpx.Response(200, json={"walletBalance": 250, "password": "hide"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = HexaApiService(make_settings(), client=client)

    result = await service.fetch_account_context("Bearer abc.def.ghi")
    await client.aclose()

    assert seen["url"] == "http://localhost:4000/api/ai/context"
    assert seen["authorization"] == "Bearer abc.def.ghi"
    assert result == {"walletBalance": 250}


@pytest.mark.asyncio
async def test_fetch_account_context_returns_none_when_path_not_configured():
    service = HexaApiService(make_settings(HEXA_ACCOUNT_CONTEXT_PATH=""))
    assert await service.fetch_account_context("Bearer token") is None


@pytest.mark.asyncio
async def test_fetch_account_context_returns_none_without_authorization():
    service = HexaApiService(make_settings())
    assert await service.fetch_account_context(None) is None


@pytest.mark.asyncio
async def test_fetch_account_context_returns_none_on_api_failure():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": "down"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = HexaApiService(make_settings(), client=client)

    result = await service.fetch_account_context("Bearer token")
    await client.aclose()

    assert result is None
