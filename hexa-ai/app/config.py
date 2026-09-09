from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables or `.env`."""

    gemini_api_key: str = Field(default="", validation_alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.6-flash", validation_alias="GEMINI_MODEL")
    client_url: str = Field(default="http://localhost:5173", validation_alias="CLIENT_URL")
    hexa_api_url: str = Field(default="http://localhost:4000", validation_alias="HEXA_API_URL")
    hexa_account_context_path: str = Field(default="", validation_alias="HEXA_ACCOUNT_CONTEXT_PATH")
    port: int = Field(default=8000, validation_alias="PORT")
    max_history_messages: int = Field(default=12, ge=0, le=30, validation_alias="MAX_HISTORY_MESSAGES")
    max_message_chars: int = Field(default=4000, ge=100, le=12000, validation_alias="MAX_MESSAGE_CHARS")
    requests_per_minute: int = Field(default=20, ge=1, le=600, validation_alias="REQUESTS_PER_MINUTE")
    gemini_temperature: float = Field(default=0.2, ge=0, le=2, validation_alias="GEMINI_TEMPERATURE")
    gemini_max_output_tokens: int = Field(default=700, ge=64, le=4096, validation_alias="GEMINI_MAX_OUTPUT_TOKENS")
    hexa_api_timeout_seconds: float = Field(default=5.0, ge=1.0, le=30.0, validation_alias="HEXA_API_TIMEOUT_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
        case_sensitive=False,
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.client_url.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
