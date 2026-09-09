import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from app.middleware.rate_limit import build_rate_limit_key
from app.schemas.chat import ChatRequest, ChatResponse, RecommendedProduct
from app.services.gemini_service import GeminiConfigurationError, GeminiProviderError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

_DISCOVERY_KEYWORDS = {
    "recommend",
    "recommendation",
    "recommendations",
    "suggest",
    "suggestion",
    "buy",
    "purchase",
    "looking for",
    "need",
    "wishlist",
    "product",
    "products",
    "subscription",
    "subscriptions",
    "tool",
    "tools",
    "what should i",
    "anything good",
    "popular",
    "best",
    "viewed",
    "recently viewed",
    "what was i looking at",
    "design",
    "graphic",
    "vpn",
    "streaming",
    "ai",
    "netflix",
    "canva",
    "chatgpt",
    "spotify",
    "adobe",
    "plan",
    "plans",
    "price",
    "prices",
    "cost",
}


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    authorization: str | None = Header(default=None),
) -> ChatResponse:
    settings = request.app.state.settings
    limiter = request.app.state.rate_limiter

    retry_after = limiter.check(build_rate_limit_key(request, authorization))
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    if len(payload.message) > settings.max_message_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Message is too long. Maximum is {settings.max_message_chars} characters.",
        )

    if len(payload.history) > settings.max_history_messages:
        raise HTTPException(
            status_code=400,
            detail=f"Too much chat history. Maximum is {settings.max_history_messages} messages.",
        )

    if any(len(item.content) > settings.max_message_chars for item in payload.history):
        raise HTTPException(
            status_code=400,
            detail=f"A history message is too long. Maximum is {settings.max_message_chars} characters.",
        )

    context_parts: list[str] = []
    if payload.page:
        context_parts.append(f"Current page: {payload.page}")

    recommended_products_list: list[dict[str, Any]] = []

    # 1. Fetch authenticated account context if user is logged in
    account_context = await request.app.state.hexa_api_service.fetch_account_context(authorization)
    if account_context:
        context_parts.append(
            "Authenticated HEXA account context:\n"
            + json.dumps(account_context, ensure_ascii=False, default=str)
        )
        if isinstance(account_context.get("data"), dict):
            rec_data = account_context["data"].get("recommendedProducts")
            if isinstance(rec_data, list):
                recommended_products_list = [p for p in rec_data if isinstance(p, dict)]

    # 2. Perform real-time product search from HEXA catalog based on customer message
    search_fetched = await request.app.state.hexa_api_service.fetch_recommendations(
        authorization=authorization,
        search=payload.message,
        cart_product_ids=payload.cartProductIds,
        guest_view_product_ids=payload.guestViewProductIds,
    )

    if search_fetched:
        # Merge search matches, avoiding duplicates
        existing_ids = {str(p.get("id") or p.get("_id")) for p in recommended_products_list}
        prioritized: list[dict[str, Any]] = []
        for p in search_fetched:
            pid = str(p.get("id") or p.get("_id"))
            if pid not in existing_ids:
                prioritized.append(p)
                existing_ids.add(pid)
        recommended_products_list = prioritized + recommended_products_list

    if recommended_products_list:
        context_parts.append(
            "Available Real Products & Plans from HEXA store catalog:\n"
            + json.dumps(recommended_products_list[:6], ensure_ascii=False, default=str)
        )

    runtime_context = "\n\n".join(context_parts) if context_parts else None

    try:
        reply = await request.app.state.gemini_service.generate_reply(
            payload.message,
            payload.history,
            runtime_context,
        )
    except GeminiConfigurationError:
        raise HTTPException(status_code=503, detail="AI assistant is not configured yet.") from None
    except GeminiProviderError as exc:
        logger.warning("Gemini provider request failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=502,
            detail="HEXA Assistant is temporarily unavailable. Please try again.",
        ) from None

    # 3. Form structured product attachments based on reply references or discovery intent (max 4-5)
    response_products: list[RecommendedProduct] = []
    lower_reply = reply.lower()
    lower_query = payload.message.lower()

    is_discovery_query = any(keyword in lower_query for keyword in _DISCOVERY_KEYWORDS)

    matched_products = [
        p
        for p in recommended_products_list
        if p.get("name") and (p.get("name", "").lower() in lower_reply or p.get("slug", "").lower() in lower_reply)
    ]

    final_candidates = (
        matched_products
        if matched_products
        else (recommended_products_list[:5] if is_discovery_query else [])
    )

    for prod in final_candidates[:5]:
        try:
            response_products.append(
                RecommendedProduct(
                    id=str(prod.get("id") or prod.get("_id") or ""),
                    name=str(prod.get("name") or "Product"),
                    slug=str(prod.get("slug") or ""),
                    price=float(prod.get("price") or 0),
                    regularPrice=float(prod.get("regularPrice")) if prod.get("regularPrice") is not None else None,
                    salePrice=float(prod.get("salePrice")) if prod.get("salePrice") is not None else None,
                    image=str(prod.get("image") or ""),
                    category=str(prod.get("category") or "Digital Products"),
                    url=str(prod.get("url") or f"/product/{prod.get('slug', '')}"),
                    reason=str(prod.get("reason") or "Available on HEXA"),
                    availablePlans=prod.get("availablePlans") or [],
                )
            )
        except Exception as err:
            logger.debug("Skipping unparseable recommended product: %s", err)

    return ChatResponse(
        success=True,
        message=reply,
        model=settings.gemini_model,
        products=response_products,
    )
