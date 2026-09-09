from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant", "model"]
    content: str = Field(min_length=1, max_length=12000)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content cannot be blank")
        return value


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=30)
    page: str | None = Field(default=None, max_length=300)
    cartProductIds: list[str] = Field(default_factory=list, max_length=20)
    guestViewProductIds: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message cannot be blank")
        return value

    @field_validator("page")
    @classmethod
    def trim_page(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class RecommendedProduct(BaseModel):
    id: str
    name: str
    slug: str
    price: float
    regularPrice: float | None = None
    salePrice: float | None = None
    image: str = ""
    category: str = ""
    url: str
    reason: str = ""
    availablePlans: list[dict[str, Any]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    success: bool = True
    message: str
    model: str
    products: list[RecommendedProduct] = Field(default_factory=list)
