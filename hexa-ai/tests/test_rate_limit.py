from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


class FakeGeminiService:
    async def generate_reply(self, message, history, runtime_context):
        return "ok"


class FakeContextService:
    async def fetch_account_context(self, authorization):
        return None


def test_chat_rate_limit_returns_429_after_limit():
    settings = Settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-test",
        CLIENT_URL="http://localhost:5173",
        REQUESTS_PER_MINUTE=2,
    )
    app = create_app(
        settings=settings,
        gemini_service=FakeGeminiService(),
        hexa_api_service=FakeContextService(),
    )
    client = TestClient(app)

    assert client.post("/api/chat", json={"message": "one"}).status_code == 200
    assert client.post("/api/chat", json={"message": "two"}).status_code == 200
    response = client.post("/api/chat", json={"message": "three"})

    assert response.status_code == 429
    assert response.json()["detail"] == "Too many requests. Please try again shortly."
    assert int(response.headers["retry-after"]) >= 1
