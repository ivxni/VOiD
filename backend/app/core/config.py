"""
VOiD Backend — Application Configuration

Loads settings from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "VOiD API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/void_db"

    # Auth — Apple Sign In
    APPLE_TEAM_ID: str = ""
    APPLE_CLIENT_ID: str = "com.void.app"
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = ["*"]

    # JWT (for session tokens issued by our backend)
    SECRET_KEY: str = "change-me-in-production-use-a-random-256-bit-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
