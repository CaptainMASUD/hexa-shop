import json
import logging
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = {
    "password",
    "passwordhash",
    "passwordresettoken",
    "pin",
    "profilepin",
    "screencode",
    "credentials",
    "credential",
    "deliverycredentials",
    "encryptedpayload",
    "licensekey",
    "activationcode",
    "apikey",
    "accesstoken",
    "refreshtoken",
    "resettoken",
    "verificationtoken",
    "emailverificationtoken",
    "secret",
    "secretkey",
}


def _normalize_key(key: str) -> str:
    return "".join(ch for ch in key.lower() if ch.isalnum())


def sanitize_context(value: Any) -> Any:
    """Recursively remove fields that should never be exposed to Gemini."""
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            if _normalize_key(str(key)) in _SENSITIVE_KEYS:
                continue
            cleaned[str(key)] = sanitize_context(item)
        return cleaned

    if isinstance(value, list):
        return [sanitize_context(item) for item in value]

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    return str(value)


class HexaApiService:
    """Optional bridge to one sanitized, authenticated endpoint on the MERN API."""

    MAX_CONTEXT_BYTES = 8192

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    async def fetch_account_context(self, authorization: str | None) -> dict[str, Any] | None:
        path = self.settings.hexa_account_context_path.strip()
        if not path or not authorization or not authorization.lower().startswith("bearer "):
            return None
        if "://" in path:
            logger.warning("HEXA_ACCOUNT_CONTEXT_PATH must be a relative API path")
            return None

        url = f"{self.settings.hexa_api_url.rstrip('/')}/{path.lstrip('/')}"
        headers = {"Authorization": authorization}

        try:
            if self._client is not None:
                response = await self._client.get(url, headers=headers)
            else:
                async with httpx.AsyncClient(
                    timeout=self.settings.hexa_api_timeout_seconds,
                    follow_redirects=False,
                ) as client:
                    response = await client.get(url, headers=headers)

            if response.status_code in {401, 403}:
                return None
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            logger.warning("Unable to retrieve HEXA account context: %s", type(exc).__name__)
            return None

        cleaned = sanitize_context(payload)
        if not isinstance(cleaned, dict):
            return None

        encoded = json.dumps(cleaned, ensure_ascii=False, default=str).encode("utf-8")
        if len(encoded) > self.MAX_CONTEXT_BYTES:
            logger.warning("HEXA account context exceeded safe prompt size and was omitted")
            return {"notice": "Authenticated account context is available but too large to include safely."}

        return cleaned

    async def fetch_recommendations(
        self,
        authorization: str | None = None,
        category: str | None = None,
        current_product_id: str | None = None,
        search: str | None = None,
        cart_product_ids: list[str] | None = None,
        guest_view_product_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        url = f"{self.settings.hexa_api_url.rstrip('/')}/api/v1/engagement/recommendations"
        headers: dict[str, str] = {}
        if authorization and authorization.lower().startswith("bearer "):
            headers["Authorization"] = authorization

        params: dict[str, str] = {"limit": "5"}
        if category:
            params["category"] = category
        if current_product_id:
            params["currentProductId"] = current_product_id
        if search:
            params["search"] = search
        if cart_product_ids:
            params["cartProductIds"] = ",".join(cart_product_ids)
        if guest_view_product_ids:
            params["guestViewProductIds"] = ",".join(guest_view_product_ids)

        try:
            if self._client is not None:
                response = await self._client.get(url, headers=headers, params=params)
            else:
                async with httpx.AsyncClient(
                    timeout=self.settings.hexa_api_timeout_seconds,
                    follow_redirects=False,
                ) as client:
                    response = await client.get(url, headers=headers, params=params)

            if response.status_code == 200:
                payload = response.json()
                data = payload.get("data")
                if isinstance(data, list):
                    return [sanitize_context(item) for item in data if isinstance(item, dict)]
        except Exception as exc:
            logger.warning("Unable to fetch recommendations from MERN: %s", type(exc).__name__)

        return []

