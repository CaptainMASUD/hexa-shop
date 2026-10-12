import asyncio
import json
import logging
import re
from typing import Any

from app.config import Settings
from app.prompts.hexa_system_prompt import HEXA_SYSTEM_PROMPT
from app.prompts.support_agent_prompt import SUPPORT_AGENT_SYSTEM_PROMPT
from app.schemas.chat import HistoryMessage
from app.schemas.support_agent import AdminReport, TicketAgentRequest, TicketAgentResponse

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

    async def process_support_ticket(
        self,
        request_data: TicketAgentRequest,
    ) -> TicketAgentResponse:
        client = self._get_client()

        # Build context header
        context_lines = [
            f"TICKET NUMBER: {request_data.ticket_number}",
            f"SUBJECT: {request_data.subject}",
            f"CATEGORY: {request_data.category}",
            f"PRIORITY: {request_data.priority}",
        ]
        if request_data.customer_name or request_data.customer_email:
            context_lines.append(f"CUSTOMER: {request_data.customer_name or 'Customer'} ({request_data.customer_email or 'No email'})")

        if request_data.order_info:
            context_lines.append(
                "ATTACHED ORDER CONTEXT:\n"
                + json.dumps(request_data.order_info, ensure_ascii=False, default=str)
            )

        if request_data.account_context:
            context_lines.append(
                "CUSTOMER ACCOUNT CONTEXT:\n"
                + json.dumps(request_data.account_context, ensure_ascii=False, default=str)
            )

        context_header = "\n".join(context_lines)

        contents: list[dict[str, Any]] = []

        if request_data.messages:
            for idx, msg in enumerate(request_data.messages):
                role = "model" if (msg.isAdmin or msg.isAi) else "user"
                prefix = ""
                if idx == 0:
                    prefix = f"--- VERIFIED TICKET METADATA ---\n{context_header}\n---------------------------------\n\n"
                contents.append({"role": role, "parts": [{"text": f"{prefix}{msg.message}"}]})
        else:
            contents.append({
                "role": "user",
                "parts": [{"text": f"--- VERIFIED TICKET METADATA ---\n{context_header}\n---------------------------------\n\nNew support request opened."}],
            })

        if self._types is not None:
            config = self._types.GenerateContentConfig(
                system_instruction=SUPPORT_AGENT_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=1200,
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True),
            )
        else:
            config = {
                "system_instruction": SUPPORT_AGENT_SYSTEM_PROMPT,
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "max_output_tokens": 1200,
            }

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
                if not (isinstance(text, str) and text.strip()):
                    logger.warning("Gemini model %s returned empty text for support ticket, trying fallback...", model_name)
                    continue

                cleaned_text = text.strip()
                cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text, flags=re.MULTILINE)
                cleaned_text = re.sub(r"\s*```$", "", cleaned_text, flags=re.MULTILINE).strip()

                try:
                    parsed = json.loads(cleaned_text)
                except Exception as json_err:
                    logger.warning("Could not parse JSON response from Gemini model %s: %s", model_name, json_err)
                    return TicketAgentResponse(
                        success=True,
                        can_handle=True,
                        reply_to_user=cleaned_text,
                        suggested_status="waiting_customer",
                        suggested_priority="normal",
                        admin_report=None,
                        model=model_name,
                    )

                admin_rep: AdminReport | None = None
                rep_data = parsed.get("admin_report")
                if isinstance(rep_data, dict) and (rep_data.get("needs_admin_action") or not parsed.get("can_handle", True)):
                    admin_rep = AdminReport(
                        needs_admin_action=True,
                        issue_summary=str(rep_data.get("issue_summary") or "Customer issue requires administrative attention"),
                        recommended_action=str(rep_data.get("recommended_action") or "Review customer ticket and perform necessary administrative action"),
                        escalation_reason=str(rep_data.get("escalation_reason") or "Action requires admin database or inventory privileges"),
                        sentiment=rep_data.get("sentiment") or "neutral",
                        urgency=rep_data.get("urgency") or "normal",
                    )

                return TicketAgentResponse(
                    success=True,
                    can_handle=bool(parsed.get("can_handle", True)),
                    reply_to_user=str(parsed.get("reply_to_user") or "Thank you for reaching out. We have logged your support request."),
                    suggested_status=parsed.get("suggested_status") or ("open" if admin_rep else "waiting_customer"),
                    suggested_priority=parsed.get("suggested_priority") or "normal",
                    admin_report=admin_rep,
                    model=model_name,
                )

            except GeminiConfigurationError:
                raise
            except Exception as exc:
                last_exception = exc
                logger.warning(
                    "Gemini support agent call failed on %s: %s (%s). Attempting fallback...",
                    model_name,
                    type(exc).__name__,
                    str(exc).splitlines()[0] if str(exc) else "No message",
                )
                await asyncio.sleep(0.3)

        raise GeminiProviderError(
            f"All Gemini models failed for support agent. Last error: {last_exception}"
        ) from last_exception
