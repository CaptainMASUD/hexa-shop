# HEXA AI Chatbot Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a ready-to-run, Python-only FastAPI backend that lets the existing HEXA frontend send support-chat messages to Google Gemini without exposing the Gemini API key.

**Architecture:** FastAPI exposes `/health` and `/api/chat`. The chat route validates bounded conversation input, rate-limits clients, optionally retrieves sanitized account context through one configured HEXA MERN endpoint, and sends the system instruction + history + message to Gemini using the official `google-genai` SDK. Chat history is request-scoped only and is not persisted.

**Tech Stack:** Python 3.11+, FastAPI, Uvicorn, Pydantic Settings, google-genai, httpx, pytest.

**Spec:** `docs/superpowers/specs/2026-08-28-hexa-ai-chatbot-backend-design.md`

## Global Constraints

- Python backend only; do not create or alter React/Vite frontend code.
- Local frontend origin is `http://localhost:5173`.
- Existing MERN API is `http://localhost:4000`.
- Python service defaults to port `8000`.
- `GEMINI_API_KEY` is server-only.
- No direct MongoDB access.
- No persistent chat storage in v1.
- Do not expose passwords, PINs, license keys, encrypted payloads, tokens, or admin-only data to Gemini or the client.
- The public chat contract stays `POST /api/chat` with `message` plus bounded optional `history`.

---

### Task 1: Configuration, schemas, prompt, and Gemini service

**Files:**
- Create: `app/__init__.py`
- Create: `app/config.py`
- Create: `app/schemas/__init__.py`
- Create: `app/schemas/chat.py`
- Create: `app/prompts/__init__.py`
- Create: `app/prompts/hexa_system_prompt.py`
- Create: `app/services/__init__.py`
- Create: `app/services/gemini_service.py`
- Test: `tests/test_gemini_service.py`

**Interfaces:**
- Produces: `Settings`, `ChatRequest`, `ChatResponse`, `HistoryMessage`, `GeminiService.generate_reply(message, history, runtime_context)`.

- [x] **Step 1: Write the failing Gemini-service tests**

```python
@pytest.mark.asyncio
async def test_generate_reply_returns_text(fake_client):
    service = GeminiService(settings, client=fake_client)
    result = await service.generate_reply("How do I buy credits?", [], None)
    assert result == "Open Wallet Credits."
```

Also test missing API key and empty-provider responses.

- [x] **Step 2: Run the tests and verify RED**

Run: `pytest tests/test_gemini_service.py -v`
Expected: FAIL because application modules do not exist yet.

- [x] **Step 3: Implement minimal configuration, schema, system prompt, and Gemini service**

Use `google.genai.Client(api_key=settings.gemini_api_key)` and call the SDK from `asyncio.to_thread` so FastAPI's event loop is not blocked by the synchronous SDK call. Map user history role `assistant` to Gemini role `model` and preserve `user`.

- [x] **Step 4: Run Gemini-service tests and verify GREEN**

Run: `pytest tests/test_gemini_service.py -v`
Expected: PASS.

### Task 2: Safe HEXA account-context bridge

**Files:**
- Create: `app/services/hexa_api_service.py`
- Test: `tests/test_hexa_api_service.py`

**Interfaces:**
- Produces: `HexaApiService.fetch_account_context(authorization)` returning a sanitized dict or `None`.

- [x] **Step 1: Write failing sanitizer and context-fetch tests**

```python
def test_sanitize_removes_credentials():
    payload = {"walletBalance": 500, "password": "x", "delivery": {"pin": "1234"}}
    assert sanitize_context(payload) == {"walletBalance": 500, "delivery": {}}
```

Test that no configured path returns `None`, bearer auth is forwarded only to the configured HEXA URL, and provider failures return `None` instead of crashing chat.

- [x] **Step 2: Run and verify RED**

Run: `pytest tests/test_hexa_api_service.py -v`
Expected: FAIL because service does not exist.

- [x] **Step 3: Implement the service**

Use `httpx.AsyncClient`, an optional `HEXA_ACCOUNT_CONTEXT_PATH`, a short timeout, recursive sensitive-key removal, and an 8 KB serialized context cap.

- [x] **Step 4: Run and verify GREEN**

Run: `pytest tests/test_hexa_api_service.py -v`
Expected: PASS.

### Task 3: Rate limiter, API routes, and app factory

**Files:**
- Create: `app/middleware/__init__.py`
- Create: `app/middleware/rate_limit.py`
- Create: `app/routes/__init__.py`
- Create: `app/routes/chat.py`
- Create: `app/main.py`
- Test: `tests/test_health.py`
- Test: `tests/test_chat_route.py`
- Test: `tests/test_rate_limit.py`

**Interfaces:**
- Produces: `create_app(...)`, `GET /health`, `POST /api/chat`.

- [x] **Step 1: Write failing endpoint tests**

Cover health, successful mocked chat, missing Gemini configuration, safe provider failure, request validation, and 429 rate limiting.

- [x] **Step 2: Run and verify RED**

Run: `pytest tests/test_health.py tests/test_chat_route.py tests/test_rate_limit.py -v`
Expected: FAIL because routes/app do not exist.

- [x] **Step 3: Implement app factory, CORS, route, and limiter**

Use configured origins only. Build rate-limit keys from a SHA-256 hash of bearer auth when available, otherwise client IP. Do not log Authorization values. Preserve provider errors behind safe HTTP messages.

- [x] **Step 4: Run endpoint tests and verify GREEN**

Run: `pytest tests/test_health.py tests/test_chat_route.py tests/test_rate_limit.py -v`
Expected: PASS.

### Task 4: Packaging, documentation, and full verification

**Files:**
- Create: `.env.example`
- Create: `.gitignore`
- Create: `requirements.txt`
- Create: `pytest.ini`
- Create: `README.md`

**Interfaces:**
- Produces: a standalone install/run experience and integration contract for the existing frontend.

- [x] **Step 1: Add runtime/development dependencies and environment template**

Required variables include `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL`, `HEXA_API_URL`, optional `HEXA_ACCOUNT_CONTEXT_PATH`, `PORT`, message/history limits, and rate-limit values.

- [x] **Step 2: Document Windows-first setup and frontend API contract**

Document venv creation, `.env` creation, `pip install -r requirements.txt`, Uvicorn run command, health test, chat curl example, and optional bearer forwarding.

- [x] **Step 3: Run the complete automated test suite**

Run: `pytest -q`
Expected: all tests pass with no real Gemini key or network calls.

- [x] **Step 4: Compile-check production modules**

Run: `python -m compileall app`
Expected: success.

- [x] **Step 5: Create final ZIP without secrets, caches, or virtualenv**

Run from `/mnt/data` and package the `hexa-ai-backend` folder while excluding `.env`, `.venv`, `.pytest_cache`, `__pycache__`, and `.git`.
