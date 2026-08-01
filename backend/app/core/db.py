"""
app/core/db.py — Async PostgreSQL engine/session and Pinecone client.

Provides FastAPI-compatible dependency-injection functions:
  - get_db()                    → AsyncSession (per-request)
  - get_pinecone_text_index()   → Pinecone Index (text, dim=384)
  - get_pinecone_image_index()  → Pinecone Index (image, dim=512)
  - check_postgres()            → health string
  - check_pinecone_text()       → health string
  - check_pinecone_image()      → health string
  - ensure_pinecone_indexes()   → idempotent index creation
"""

import logging
from typing import AsyncGenerator

from pinecone import Pinecone, ServerlessSpec
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────
#  PostgreSQL — Async Engine & Session Factory
# ─────────────────────────────────────────────────────────────────

async_engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # reconnect on stale connections
    echo=False,
)

AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,   # prevent lazy-load errors after commit
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a scoped async DB session.
    Automatically rolls back on exception and closes on exit.
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_postgres() -> str:
    """Health-check: returns 'ok' or a descriptive error string."""
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as exc:
        logger.error("PostgreSQL health check failed: %s", exc)
        return f"error: {exc}"


# ─────────────────────────────────────────────────────────────────
#  Pinecone — Lazy Singleton Client & Index Accessors
# ─────────────────────────────────────────────────────────────────

_pinecone_client: Pinecone | None = None


def _get_pinecone_client() -> Pinecone:
    """Return (and lazily create) the Pinecone singleton client."""
    global _pinecone_client
    if _pinecone_client is None:
        _pinecone_client = Pinecone(api_key=settings.pinecone_api_key)
    return _pinecone_client


def get_pinecone_text_index():
    """Return the Pinecone Index for text embeddings (dim=384)."""
    return _get_pinecone_client().Index(settings.pinecone_text_index)


def get_pinecone_image_index():
    """Return the Pinecone Index for image embeddings (dim=512)."""
    return _get_pinecone_client().Index(settings.pinecone_image_index)


def ensure_pinecone_indexes() -> None:
    """
    Idempotently create both Pinecone indexes if they do not exist.
    Called once during ingest or app startup.
    """
    client = _get_pinecone_client()
    existing = {idx["name"] for idx in client.list_indexes()}

    if settings.pinecone_text_index not in existing:
        logger.info("Creating Pinecone text index: %s", settings.pinecone_text_index)
        client.create_index(
            name=settings.pinecone_text_index,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )

    if settings.pinecone_image_index not in existing:
        logger.info("Creating Pinecone image index: %s", settings.pinecone_image_index)
        client.create_index(
            name=settings.pinecone_image_index,
            dimension=512,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )


async def check_pinecone_text() -> str:
    """Health-check for the text vector index."""
    try:
        stats = get_pinecone_text_index().describe_index_stats()
        return f"ok (vectors: {stats.total_vector_count})"
    except Exception as exc:
        return f"error: {exc}"


async def check_pinecone_image() -> str:
    """Health-check for the image vector index."""
    try:
        stats = get_pinecone_image_index().describe_index_stats()
        return f"ok (vectors: {stats.total_vector_count})"
    except Exception as exc:
        return f"error: {exc}"
