import asyncio
import logging
from typing import Any

from app.config import Settings
from app.prompts.hexa_system_prompt import HEXA_SYSTEM_PROMPT
from app.schemas.chat import HistoryMessage

logger = logging.getLogger(__name__)

# Resilient fallback models in order of priority
_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"]


class GeminiConfigurationError(RuntimeError):
    """Raised when Gemini cannot be used because configuration is missing."""


class GeminiProviderError(RuntimeError):
    """Raised when the Gemini provider fails or returns an unusable response."""


class GeminiService:
    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self.settings = settings
        self._client = client
        self._types = None

    def _get_client(self) -> Any:
        if not self.settings.gemini_api_key.strip():
            raise GeminiConfigurationError("GEMINI_API_KEY is not configured")

        if self._client is None:
            try:
                from google import genai
                from google.genai import types
            except ImportError as exc:
                raise GeminiConfigurationError(
                    "google-genai is not installed. Run pip install -r requirements.txt"
                ) from exc
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
            self._types = types

        return self._client

    async def generate_reply(
        self,
        message: str,
        history: list[HistoryMessage],
        runtime_context: str | None,
    ) -> str:
        client = self._get_client()

        contents: list[dict[str, Any]] = []
        for item in history:
            role = "model" if item.role in {"model", "assistant"} else "user"
            contents.append({"role": role, "parts": [{"text": item.content}]})

        final_message = message
        if runtime_context:
            final_message = (
                f"{message}\n\n"
                "Verified runtime context (use only when relevant; never reveal sensitive data):\n"
                f"{runtime_context}"
            )
        contents.append({"role": "user", "parts": [{"text": final_message}]})

        if self._types is not None:
            config = self._types.GenerateContentConfig(
                system_instruction=HEXA_SYSTEM_PROMPT,
                temperature=self.settings.gemini_temperature,
                max_output_tokens=self.settings.gemini_max_output_tokens,
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True),
            )
        else:
            config = {
                "system_instruction": HEXA_SYSTEM_PROMPT,
                "temperature": self.settings.gemini_temperature,
                "max_output_tokens": self.settings.gemini_max_output_tokens,
            }

        # Build prioritized unique list of models to try (primary setting first, then fallback models)
        models_to_try: list[str] = []
        for m in [self.settings.gemini_model, *_FALLBACK_MODELS]:
            clean_m = m.strip()
            if clean_m and clean_m not in models_to_try:
                models_to_try.append(clean_m)

        last_exception: Exception | None = None

        for model_name in models_to_try:
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model_name,
                    contents=contents,
                    config=config,
                )

                text = getattr(response, "text", None)
                if isinstance(text, str) and text.strip():
                    return text.strip()

                logger.warning("Gemini model %s returned empty text, trying fallback...", model_name)
            except GeminiConfigurationError:
                raise
            except Exception as exc:
                last_exception = exc
                logger.warning(
                    "Gemini model %s failed with %s (%s). Attempting fallback if available...",
                    model_name,
                    type(exc).__name__,
                    str(exc).splitlines()[0] if str(exc) else "No message",
                )
                await asyncio.sleep(0.3)

        raise GeminiProviderError(
            f"All Gemini models failed. Last error: {last_exception}"
        ) from last_exception
