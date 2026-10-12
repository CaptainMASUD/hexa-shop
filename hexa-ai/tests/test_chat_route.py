from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.gemini_service import GeminiConfigurationError, GeminiProviderError


class FakeGeminiService:
    def __init__(self, reply="HEXA answer", error=None):
        self.reply = reply
        self.error = error
        self.calls = []

    async def generate_reply(self, message, history, runtime_context):
        self.calls.append((message, history, runtime_context))
        if self.error:
            raise self.error
        return self.reply


class FakeContextService:
    def __init__(self, context=None, recommendations=None):
        self.context = context
        self.recommendations = recommendations or []
        self.auth_headers = []

    async def fetch_account_context(self, authorization):
        self.auth_headers.append(authorization)
        return self.context

    async def fetch_recommendations(self, **kwargs):
        return self.recommendations


def make_settings(**overrides):
    values = {
        "GEMINI_API_KEY": "test-key",
        "GEMINI_MODEL": "gemini-test",
        "CLIENT_URL": "http://localhost:5173",
        "HEXA_API_URL": "http://localhost:4000",
        "MAX_HISTORY_MESSAGES": 12,
        "MAX_MESSAGE_CHARS": 4000,
        "REQUESTS_PER_MINUTE": 20,
    }
    values.update(overrides)
    return Settings(**values)


def test_chat_returns_gemini_reply_and_passes_runtime_context():
    gemini = FakeGeminiService(reply="Your wallet balance is available in Account → Wallet.")
    context = FakeContextService(context={"walletBalance": 250, "pendingOrders": 1})
    app = create_app(settings=make_settings(), gemini_service=gemini, hexa_api_service=context)
    client = TestClient(app)

    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer test-token"},
        json={
            "message": "Where can I see my wallet?",
            "history": [{"role": "user", "content": "Hello"}],
            "page": "/account",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Your wallet balance is available in Account → Wallet.",
        "model": "gemini-test",
        "products": [],
    }
    assert context.auth_headers == ["Bearer test-token"]
    runtime_context = gemini.calls[0][2]
    assert "Current page: /account" in runtime_context
    assert '"walletBalance": 250' in runtime_context


def test_chat_maps_missing_gemini_configuration_to_503():
    gemini = FakeGeminiService(error=GeminiConfigurationError("missing"))
    app = create_app(settings=make_settings(), gemini_service=gemini, hexa_api_service=FakeContextService())
    client = TestClient(app)

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "AI assistant is not configured yet."


def test_chat_maps_provider_failure_to_safe_502():
    gemini = FakeGeminiService(error=GeminiProviderError("provider details"))
    app = create_app(settings=make_settings(), gemini_service=gemini, hexa_api_service=FakeContextService())
    client = TestClient(app)

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == 502
    assert response.json()["detail"] == "HEXA Assistant is temporarily unavailable. Please try again."
    assert "provider details" not in response.text


def test_chat_rejects_message_above_configured_runtime_limit():
    gemini = FakeGeminiService()
    app = create_app(
        settings=make_settings(MAX_MESSAGE_CHARS=100),
        gemini_service=gemini,
        hexa_api_service=FakeContextService(),
    )
    client = TestClient(app)

    response = client.post("/api/chat", json={"message": "x" * 101})

    assert response.status_code == 400
    assert response.json()["detail"] == "Message is too long. Maximum is 100 characters."


def test_chat_rejects_history_above_configured_runtime_limit():
    gemini = FakeGeminiService()
    app = create_app(
        settings=make_settings(MAX_HISTORY_MESSAGES=1),
        gemini_service=gemini,
        hexa_api_service=FakeContextService(),
    )
    client = TestClient(app)

    response = client.post(
        "/api/chat",
        json={
            "message": "Hello",
            "history": [
                {"role": "user", "content": "one"},
                {"role": "assistant", "content": "two"},
            ],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Too much chat history. Maximum is 1 messages."


def test_chat_rejects_blank_message_at_schema_level():
    client = TestClient(
        create_app(
            settings=make_settings(),
            gemini_service=FakeGeminiService(),
            hexa_api_service=FakeContextService(),
        )
    )

    response = client.post("/api/chat", json={"message": "   "})

    assert response.status_code == 422


def test_cors_allows_configured_frontend_origin():
    client = TestClient(
        create_app(
            settings=make_settings(CLIENT_URL="http://localhost:5173"),
            gemini_service=FakeGeminiService(),
            hexa_api_service=FakeContextService(),
        )
    )

    response = client.options(
        "/api/chat",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
