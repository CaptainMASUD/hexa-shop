import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.middleware.rate_limit import InMemoryRateLimiter
from app.routes.chat import router as chat_router
from app.routes.support import router as support_router
from app.services.gemini_service import GeminiService
from app.services.hexa_api_service import HexaApiService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


def create_app(
    settings: Settings | None = None,
    gemini_service=None,
    hexa_api_service=None,
    rate_limiter: InMemoryRateLimiter | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title="HEXA AI Chatbot Backend",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.state.settings = settings
    app.state.gemini_service = gemini_service or GeminiService(settings)
    app.state.hexa_api_service = hexa_api_service or HexaApiService(settings)
    app.state.rate_limiter = rate_limiter or InMemoryRateLimiter(
        limit=settings.requests_per_minute,
        window_seconds=60,
    )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, object]:
        return {
            "status": "ok",
            "service": "hexa-ai-backend",
            "gemini_configured": bool(settings.gemini_api_key.strip()),
        }

    app.include_router(chat_router)
    app.include_router(support_router)
    return app


app = create_app()
