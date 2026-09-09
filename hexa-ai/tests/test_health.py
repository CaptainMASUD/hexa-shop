from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health_does_not_call_gemini_and_reports_configuration():
    settings = Settings(GEMINI_API_KEY="", CLIENT_URL="http://localhost:5173")
    client = TestClient(create_app(settings=settings))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "hexa-ai-backend",
        "gemini_configured": False,
    }
