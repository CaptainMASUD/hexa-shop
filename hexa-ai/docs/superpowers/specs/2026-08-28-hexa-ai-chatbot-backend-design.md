# HEXA AI Chatbot Backend Design

## Goal
Build a standalone Python FastAPI backend for the existing HEXA digital store frontend. The service accepts chat messages, sends them to Google Gemini using a server-side API key, applies HEXA-specific support instructions, and returns safe customer-support responses.

## Scope
This package contains only the Python AI backend. It does not create or replace the existing React/Vite frontend or MERN API.

## Local Services
- React/Vite frontend: `http://localhost:5173`
- Existing MERN API: `http://localhost:4000`
- Python AI service: `http://localhost:8000`

## Architecture

```text
Existing React/Vite frontend
        |
        | POST /api/chat
        v
Python FastAPI AI service
        |
        +--> Gemini API
        |
        +--> optional controlled HEXA MERN API calls
             for authenticated account-aware features
```

Gemini never connects directly to MongoDB. The Python service does not receive database credentials.

## Core API

### `GET /health`
Returns service health without calling Gemini.

### `POST /api/chat`
Request body:

```json
{
  "message": "How do I buy wallet credits?",
  "history": [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello! How can I help?"}
  ]
}
```

Response body:

```json
{
  "success": true,
  "message": "You can buy wallet credits from your account wallet area..."
}
```

The service accepts only a bounded amount of recent history to control cost and prompt size.

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.7-flash
CLIENT_URL=http://localhost:5173
HEXA_API_URL=http://localhost:4000
PORT=8000
MAX_HISTORY_MESSAGES=12
MAX_MESSAGE_CHARS=4000
REQUESTS_PER_MINUTE=20
```

`GEMINI_API_KEY` is server-only and must never be sent to the browser.

## Gemini Integration
Use Google's current official Python Gemini SDK (`google-genai`). The Gemini client is initialized only on the server using `GEMINI_API_KEY`.

The service uses a single HEXA system instruction that tells Gemini to:
- act as the HEXA customer-support assistant;
- focus on the store, products, payments, wallet, wallet credits, subscriptions, delivery, refunds, verification, password reset, and navigation;
- never invent order status, balances, prices, approval state, or subscription state;
- never reveal passwords, PINs, license secrets, API keys, encrypted payloads, or admin-only data;
- direct customers to protected account/order/subscription pages for sensitive delivery credentials;
- clearly say when information cannot be verified;
- avoid performing admin actions.

## Account-Aware Extension Boundary
The initial package includes a `HexaApiService` boundary for future or controlled authenticated calls to the existing MERN API. It must not query MongoDB directly.

If the frontend forwards an existing bearer token, the Python service may forward that same token only to approved HEXA API endpoints. It must not trust arbitrary `userId` values from the client.

The initial chatbot remains useful without account-aware endpoints; unavailable personal data is not invented.

## Security
- CORS permits the configured `CLIENT_URL` only.
- Gemini API key stays in `.env` on the Python service.
- Chat input has a maximum character limit.
- Conversation history is capped.
- Basic per-IP rate limiting protects Gemini quota.
- Authentication headers are never logged.
- Raw Gemini exceptions and stack traces are not returned to customers.
- Sensitive credentials are never intentionally included in Gemini prompts or responses.
- The service does not persist chat history by default.

## Error Handling
- Invalid request -> HTTP 422/400 with a safe message.
- Rate limit exceeded -> HTTP 429.
- Missing/invalid Gemini configuration -> HTTP 503.
- Gemini timeout/provider failure -> HTTP 502/503 with a generic customer-facing message.
- MERN API failure for account-aware data -> respond that account information could not be retrieved rather than guessing.

## Project Layout

```text
hexa-ai-backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── chat.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── chat.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py
│   │   └── hexa_api_service.py
│   ├── prompts/
│   │   ├── __init__.py
│   │   └── hexa_system_prompt.py
│   └── middleware/
│       ├── __init__.py
│       └── rate_limit.py
├── tests/
│   ├── test_health.py
│   ├── test_chat_route.py
│   └── test_rate_limit.py
├── docs/superpowers/specs/
│   └── 2026-08-28-hexa-ai-chatbot-backend-design.md
├── .env.example
├── .gitignore
├── requirements.txt
├── pytest.ini
└── README.md
```

## Testing
Automated tests cover:
- health endpoint;
- chat request validation;
- successful mocked Gemini response;
- provider failure mapping;
- message/history limits;
- rate limiting;
- CORS configuration where practical.

Gemini network calls are mocked in tests so the suite does not require a real API key.

## Run Experience

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend can then call `POST http://localhost:8000/api/chat`.

## Non-Goals for Version 1
- No frontend/chat widget implementation.
- No direct MongoDB access.
- No persistent chat database.
- No vector database/RAG pipeline.
- No autonomous admin actions.
- No direct exposure of delivery credentials through AI.

These can be added later without changing the public `/api/chat` contract.
