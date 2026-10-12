from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.schemas.support_agent import AdminReport, TicketAgentResponse


class FakeSupportGeminiService:
    def __init__(self, response=None, error=None):
        self.response = response or TicketAgentResponse(
            success=True,
            can_handle=True,
            reply_to_user="You can find your delivered credentials in Account > Orders.",
            suggested_status="waiting_customer",
            suggested_priority="normal",
            admin_report=None,
            model="gemini-test",
        )
        self.error = error
        self.calls = []

    async def process_support_ticket(self, request_data):
        self.calls.append(request_data)
        if self.error:
            raise self.error
        return self.response


def make_settings(**overrides):
    values = {
        "GEMINI_API_KEY": "test-key",
        "GEMINI_MODEL": "gemini-test",
        "CLIENT_URL": "http://localhost:5173",
        "HEXA_API_URL": "http://localhost:4000",
    }
    values.update(overrides)
    return Settings(**values)


def test_support_agent_resolves_directly():
    fake_gemini = FakeSupportGeminiService()
    app = create_app(settings=make_settings(), gemini_service=fake_gemini)
    client = TestClient(app)

    payload = {
        "ticket_id": "ticket_123",
        "ticket_number": "HEXA-T1001",
        "subject": "Where is my Netflix account?",
        "category": "order",
        "priority": "normal",
        "customer_name": "Rahim Khan",
        "customer_email": "rahim@example.com",
        "messages": [
            {"sender": "user", "message": "I placed an order but don't know where to see my password."}
        ],
    }

    res = client.post("/api/support/ticket-agent", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["can_handle"] is True
    assert "delivered credentials" in data["reply_to_user"]
    assert data["suggested_status"] == "waiting_customer"
    assert data["admin_report"] is None


def test_support_agent_escalates_to_admin_with_report():
    escalated_response = TicketAgentResponse(
        success=True,
        can_handle=False,
        reply_to_user="I have verified your order. Since replacement credentials must be issued by our admin, I have escalated this with a priority report.",
        suggested_status="open",
        suggested_priority="high",
        admin_report=AdminReport(
            needs_admin_action=True,
            issue_summary="Netflix screen 3 password reported incorrect 1 day after purchase.",
            recommended_action="Reissue 1 Month Netflix Shared profile credentials for order HEXA-1024.",
            escalation_reason="Credential regeneration requires admin inventory credentials access.",
            sentiment="frustrated",
            urgency="high",
        ),
        model="gemini-test",
    )

    fake_gemini = FakeSupportGeminiService(response=escalated_response)
    app = create_app(settings=make_settings(), gemini_service=fake_gemini)
    client = TestClient(app)

    payload = {
        "ticket_id": "ticket_456",
        "ticket_number": "HEXA-T1002",
        "subject": "Netflix password not working",
        "category": "product",
        "priority": "normal",
        "customer_name": "Karim Hasan",
        "customer_email": "karim@example.com",
        "messages": [
            {"sender": "user", "message": "The Netflix password provided gives incorrect password error. Please give me working login."}
        ],
    }

    res = client.post("/api/support/ticket-agent", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["can_handle"] is False
    assert data["admin_report"] is not None
    assert data["admin_report"]["needs_admin_action"] is True
    assert "Reissue 1 Month Netflix" in data["admin_report"]["recommended_action"]
    assert data["suggested_priority"] == "high"
