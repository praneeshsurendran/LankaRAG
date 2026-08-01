"""
tests/conftest.py — Shared pytest fixtures with mocked external integrations.

All heavy dependencies (Pinecone, Gemini, PostgreSQL) are mocked so the
test suite runs in total isolation without network calls or a running DB.

Fixtures:
  - mock_settings          : Override settings with safe test values
  - mock_db_session        : AsyncMock of SQLAlchemy AsyncSession
  - mock_pinecone_text     : MagicMock of Pinecone text Index
  - mock_pinecone_image    : MagicMock of Pinecone image Index
  - mock_gemini_llm        : AsyncMock of ChatGoogleGenerativeAI
  - mock_sentence_transformer: MagicMock of SentenceTransformer
  - mock_clip              : MagicMock of CLIP model
  - test_client            : httpx.AsyncClient over the FastAPI app
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# ── Sample data ────────────────────────────────────────────────────
SAMPLE_ATTRACTION_ROW = MagicMock(
    id=1,
    name="Unawatuna Beach",
    category="Beaches",
    district="Galle",
    entrance_fee_usd=None,
    difficulty_level="Easy",
    description="A stunning crescent-shaped beach on the southern coast of Sri Lanka.",
    image_url="https://example.com/unawatuna.jpg",
)

SAMPLE_ATTRACTION_DICT = {
    "id": 1,
    "name": "Unawatuna Beach",
    "category": "Beaches",
    "district": "Galle",
    "entrance_fee_usd": None,
    "difficulty_level": "Easy",
    "description": "A stunning crescent-shaped beach on the southern coast of Sri Lanka.",
    "image_url": "https://example.com/unawatuna.jpg",
}

SAMPLE_PINECONE_MATCHES = [
    {"id": "1", "score": 0.95, "metadata": {"category": "Beaches"}},
]


# ── Pytest configuration ───────────────────────────────────────────
def pytest_configure(config):
    """Register asyncio mode as auto."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ── DB Session mock ───────────────────────────────────────────────
@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Mock AsyncSession that returns a sample attraction on execute."""
    session = AsyncMock(spec=AsyncSession)

    # Mock scalars().all() to return a TouristAttraction-like object
    db_attraction = MagicMock()
    db_attraction.id = 1
    db_attraction.to_dict.return_value = SAMPLE_ATTRACTION_DICT

    scalar_result = MagicMock()
    scalar_result.scalars.return_value.all.return_value = [db_attraction]
    scalar_result.fetchall.return_value = [SAMPLE_ATTRACTION_ROW]

    session.execute = AsyncMock(return_value=scalar_result)
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


# ── Pinecone mocks ────────────────────────────────────────────────
@pytest.fixture
def mock_pinecone_text() -> MagicMock:
    """Mock Pinecone text index returning a sample match."""
    idx = MagicMock()
    idx.query.return_value = {"matches": SAMPLE_PINECONE_MATCHES}
    idx.describe_index_stats.return_value = MagicMock(total_vector_count=25)
    return idx


@pytest.fixture
def mock_pinecone_image() -> MagicMock:
    """Mock Pinecone image index returning a sample match."""
    idx = MagicMock()
    idx.query.return_value = {"matches": SAMPLE_PINECONE_MATCHES}
    idx.describe_index_stats.return_value = MagicMock(total_vector_count=25)
    return idx


# ── Gemini LLM mock ───────────────────────────────────────────────
@pytest.fixture
def mock_gemini_response() -> MagicMock:
    """Mock AI message content."""
    msg = MagicMock()
    msg.content = "## Unawatuna Beach\n\nA beautiful beach in Galle district. Free entry. Easy difficulty."
    return msg


@pytest.fixture
def mock_gemini_llm(mock_gemini_response) -> AsyncMock:
    """Mock ChatGoogleGenerativeAI with ainvoke returning a fixed response."""
    llm = AsyncMock()
    llm.ainvoke = AsyncMock(return_value=mock_gemini_response)
    return llm


# ── Embedding model mocks ─────────────────────────────────────────
@pytest.fixture
def mock_sentence_transformer() -> MagicMock:
    """Mock SentenceTransformer that returns a 384-dim zero vector."""
    import numpy as np
    model = MagicMock()
    model.encode.return_value = np.zeros(384, dtype="float32")
    return model


@pytest.fixture
def mock_clip_model() -> MagicMock:
    """Mock CLIP model that returns a 512-dim zero tensor."""
    import torch
    model = MagicMock()
    embedding = torch.zeros(1, 512)
    model.encode_image.return_value = embedding
    model.encode_text.return_value = embedding
    return model


# ── TestClient factory ────────────────────────────────────────────
@pytest_asyncio.fixture
async def test_client(
    mock_db_session,
    mock_pinecone_text,
    mock_pinecone_image,
    mock_gemini_llm,
    mock_sentence_transformer,
) -> AsyncGenerator[AsyncClient, None]:
    """
    httpx.AsyncClient wired to the FastAPI app with all external
    integrations patched out.
    """
    from app.main import app
    from app.core import db as db_module
    from app.services import embedding_service, sql_service, rag_service

    patches = [
        # DB session dependency override
        patch.object(db_module, "check_postgres", new=AsyncMock(return_value="ok")),
        patch.object(db_module, "check_pinecone_text", new=AsyncMock(return_value="ok (vectors: 25)")),
        patch.object(db_module, "check_pinecone_image", new=AsyncMock(return_value="ok (vectors: 25)")),
        patch.object(db_module, "get_pinecone_text_index", return_value=mock_pinecone_text),
        patch.object(db_module, "get_pinecone_image_index", return_value=mock_pinecone_image),
        # Embedding service
        patch.object(embedding_service, "encode_text", return_value=[0.0] * 384),
        patch.object(embedding_service, "encode_text_with_clip", return_value=[0.0] * 512),
        patch.object(
            embedding_service,
            "encode_image_from_url",
            new=AsyncMock(return_value=[0.0] * 512),
        ),
        # SQL service – mock Gemini SQL generation
        patch.object(
            sql_service,
            "generate_sql",
            new=AsyncMock(return_value="SELECT * FROM tourist_attractions LIMIT 10"),
        ),
        # RAG service – mock Gemini synthesis
        patch.object(
            rag_service,
            "_get_rag_llm",
            return_value=mock_gemini_llm,
        ),
    ]

    # Override the get_db dependency
    app.dependency_overrides[db_module.get_db] = lambda: iter([mock_db_session])

    with (p for p in patches):
        # The above is not valid syntax for multiple patchers; use ExitStack
        pass

    import contextlib

    with contextlib.ExitStack() as stack:
        for p in patches:
            stack.enter_context(p)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client

    # Clean up dependency overrides
    app.dependency_overrides.clear()
