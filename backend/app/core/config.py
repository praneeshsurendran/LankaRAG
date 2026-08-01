"""
app/core/config.py — Centralised settings via pydantic-settings.

All values are loaded from the .env file at the project root.
The lru_cache singleton ensures the file is parsed exactly once.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration, fully typed and validated."""

    model_config = SettingsConfigDict(
        # The .env lives two directories up: backend/app/core/ → backend/app/ → backend/ → project root
        env_file=["../../.env", "../.env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── PostgreSQL ────────────────────────────────────────────────
    postgres_user: str = "lankarag"
    postgres_password: str = "lankarag_secret"
    postgres_db: str = "lankarag_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        """Async DSN for SQLAlchemy + asyncpg."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        """Sync DSN for the ingest script (psycopg2)."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Pinecone ──────────────────────────────────────────────────
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_text_index: str = "lankarag-text"
    pinecone_image_index: str = "lankarag-images"

    # ── Google Gemini ─────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # ── Server ────────────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        """Split comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
