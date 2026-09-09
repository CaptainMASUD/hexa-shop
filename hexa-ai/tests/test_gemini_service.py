import pytest

from app.config import Settings
from app.schemas.chat import HistoryMessage
from app.services.gemini_service import (
    GeminiConfigurationError,
    GeminiProviderError,
    GeminiService,
)


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


class FakeClient:
    def __init__(self, response=None, error=None):
        self.models = FakeModels(response=response, error=error)


def make_settings(**overrides):
    values = {
        "GEMINI_API_KEY": "test-key",
        "GEMINI_MODEL": "gemini-test",
        "CLIENT_URL": "http://localhost:5173",
        "HEXA_API_URL": "http://localhost:4000",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.asyncio
async def test_generate_reply_returns_provider_text_and_maps_history_roles():
    client = FakeClient(response=FakeResponse("Open Wallet Credits."))
    service = GeminiService(make_settings(), client=client)

    result = await service.generate_reply(
        message="How do I buy credits?",
        history=[
            HistoryMessage(role="user", content="Hi"),
            HistoryMessage(role="assistant", content="Hello!"),
        ],
        runtime_context="Current page: /account/wallet/credits",
    )

    assert result == "Open Wallet Credits."
    call = client.models.calls[0]
    assert call["model"] == "gemini-test"
    assert [item["role"] for item in call["contents"]] == ["user", "model", "user"]
    assert "Current page: /account/wallet/credits" in call["contents"][-1]["parts"][0]["text"]


@pytest.mark.asyncio
async def test_missing_api_key_raises_configuration_error_without_calling_provider():
    service = GeminiService(make_settings(GEMINI_API_KEY=""), client=FakeClient())

    with pytest.raises(GeminiConfigurationError):
        await service.generate_reply("Hello", [], None)


@pytest.mark.asyncio
async def test_blank_provider_text_raises_provider_error():
    service = GeminiService(make_settings(), client=FakeClient(response=FakeResponse("   ")))

    with pytest.raises(GeminiProviderError):
        await service.generate_reply("Hello", [], None)


@pytest.mark.asyncio
async def test_provider_exception_is_wrapped():
    service = GeminiService(make_settings(), client=FakeClient(error=RuntimeError("boom")))

    with pytest.raises(GeminiProviderError):
        await service.generate_reply("Hello", [], None)
