"""
tests/api/test_endpoints.py — HTTP integration tests for all four API endpoints.

Each test patches external dependencies (Pinecone, Gemini, PostgreSQL) at the
service layer so no real network calls are made. Tests cover both 200 OK paths
and error/validation paths.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
import contextlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


# ─────────────────────────────────────────────────────────────────
#  Shared helpers & fixtures
# ─────────────────────────────────────────────────────────────────

SAMPLE_ATTRACTION = {
    "id": 1,
    "name": "Unawatuna Beach",
    "category": "Beaches",
    "district": "Galle",
    "entrance_fee_usd": None,
    "difficulty_level": "Easy",
    "description": "A stunning crescent-shaped beach on the southern coast of Sri Lanka.",
    "image_url": "https://example.com/unawatuna.jpg",
    "score": None,
    "source": "postgres",
}

SAMPLE_VECTOR_ATTRACTION = {**SAMPLE_ATTRACTION, "score": 0.95, "source": "pinecone-text"}
SAMPLE_IMAGE_ATTRACTION = {**SAMPLE_ATTRACTION, "score": 0.92, "source": "pinecone-image"}


def _make_db_session(rows=None, scalars_rows=None):
    """Create a mock AsyncSession with configurable return data."""
    session = AsyncMock()

    db_obj = MagicMock()
    db_obj.id = 1
    db_obj.to_dict.return_value = {
        "id": 1,
        "name": "Unawatuna Beach",
        "category": "Beaches",
        "district": "Galle",
        "entrance_fee_usd": None,
        "difficulty_level": "Easy",
        "description": "A stunning crescent-shaped beach on the southern coast of Sri Lanka.",
        "image_url": "https://example.com/unawatuna.jpg",
    }

    row = MagicMock()
    for k, v in {
        "id": 1, "name": "Unawatuna Beach", "category": "Beaches",
        "district": "Galle", "entrance_fee_usd": None,
        "difficulty_level": "Easy",
        "description": "A stunning crescent-shaped beach.",
        "image_url": None,
    }.items():
        setattr(row, k, v)

    exec_result = MagicMock()
    exec_result.fetchall.return_value = rows or [row]
    exec_result.scalars.return_value.all.return_value = scalars_rows or [db_obj]
    session.execute = AsyncMock(return_value=exec_result)
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest_asyncio.fixture
async def api_client():
    """Provide a fully patched test client for the FastAPI app."""
    from app.main import app
    from app.core import db as db_module
    from app.services import embedding_service, sql_service, rag_service

    mock_db = _make_db_session()
    mock_text_idx = MagicMock()
    mock_text_idx.query.return_value = {
        "matches": [{"id": "1", "score": 0.95, "metadata": {"category": "Beaches"}}]
    }
    mock_img_idx = MagicMock()
    mock_img_idx.query.return_value = {
        "matches": [{"id": "1", "score": 0.92, "metadata": {}}]
    }
    gemini_msg = MagicMock()
    gemini_msg.content = "Here are your personalised Sri Lanka recommendations!"
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(return_value=gemini_msg)

    app.dependency_overrides[db_module.get_db] = lambda: _iter_once(mock_db)

    with contextlib.ExitStack() as stack:
        stack.enter_context(patch.object(db_module, "check_postgres", AsyncMock(return_value="ok")))
        stack.enter_context(patch.object(db_module, "check_pinecone_text", AsyncMock(return_value="ok (vectors: 25)")))
        stack.enter_context(patch.object(db_module, "check_pinecone_image", AsyncMock(return_value="ok (vectors: 25)")))
        stack.enter_context(patch.object(db_module, "get_pinecone_text_index", return_value=mock_text_idx))
        stack.enter_context(patch.object(db_module, "get_pinecone_image_index", return_value=mock_img_idx))
        stack.enter_context(patch.object(embedding_service, "encode_text", return_value=[0.0] * 384))
        stack.enter_context(patch.object(embedding_service, "encode_text_with_clip", return_value=[0.0] * 512))
        stack.enter_context(patch.object(embedding_service, "encode_image_from_url", AsyncMock(return_value=[0.0] * 512)))
        stack.enter_context(patch.object(sql_service, "generate_sql", AsyncMock(return_value="SELECT * FROM tourist_attractions LIMIT 10")))
        stack.enter_context(patch.object(rag_service, "_get_rag_llm", return_value=mock_llm))

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client

    app.dependency_overrides.clear()


async def _iter_once(value):
    """Async generator that yields a single value (for dependency override)."""
    yield value


# ─────────────────────────────────────────────────────────────────
#  /health
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(api_client: AsyncClient):
    response = await api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["postgres"] == "ok"
    assert data["pinecone_text"] == "ok (vectors: 25)"
    assert data["pinecone_image"] == "ok (vectors: 25)"


@pytest.mark.asyncio
async def test_root_endpoint(api_client: AsyncClient):
    response = await api_client.get("/")
    assert response.status_code == 200
    assert "v1_routes" in response.json()


# ─────────────────────────────────────────────────────────────────
#  /api/v1/query/structured
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_structured_query_200(api_client: AsyncClient):
    """A valid structured query returns 200 with results and generated_sql."""
    response = await api_client.post(
        "/api/v1/query/structured",
        json={"query": "Which waterfalls have a fee under $5?", "top_k": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "generated_sql" in data
    assert data["generated_sql"] is not None
    assert data["total"] == len(data["results"])


@pytest.mark.asyncio
async def test_structured_query_rejects_missing_body(api_client: AsyncClient):
    """Missing required 'query' field returns 422 Unprocessable Entity."""
    response = await api_client.post("/api/v1/query/structured", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_structured_query_rejects_unsafe_sql(api_client: AsyncClient):
    """Unsafe generated SQL should result in 400 Bad Request."""
    from app.services import sql_service

    with patch.object(
        sql_service, "generate_sql", AsyncMock(return_value="DROP TABLE tourist_attractions")
    ):
        response = await api_client.post(
            "/api/v1/query/structured",
            json={"query": "drop all tables"},
        )
    assert response.status_code == 400
    assert "safety check" in response.json()["detail"]


@pytest.mark.asyncio
async def test_structured_query_top_k_validation(api_client: AsyncClient):
    """top_k must be between 1 and 50; out-of-range returns 422."""
    response = await api_client.post(
        "/api/v1/query/structured",
        json={"query": "Show beaches", "top_k": 0},
    )
    assert response.status_code == 422

    response = await api_client.post(
        "/api/v1/query/structured",
        json={"query": "Show beaches", "top_k": 100},
    )
    assert response.status_code == 422


# ─────────────────────────────────────────────────────────────────
#  /api/v1/query/semantic
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_semantic_query_200(api_client: AsyncClient):
    """A valid semantic query returns 200 with results and model name."""
    response = await api_client.post(
        "/api/v1/query/semantic",
        json={"query": "serene locations for meditation", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["query_embedding_model"] == "all-MiniLM-L6-v2"
    # Each result should have score and source=pinecone-text
    for result in data["results"]:
        assert result["source"] == "pinecone-text"
        assert result["score"] is not None


@pytest.mark.asyncio
async def test_semantic_query_with_category_filter(api_client: AsyncClient):
    """category_filter is an optional string and should not cause errors."""
    response = await api_client.post(
        "/api/v1/query/semantic",
        json={"query": "calm beaches", "top_k": 5, "category_filter": "Beaches"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_semantic_query_missing_query(api_client: AsyncClient):
    """Missing 'query' field returns 422."""
    response = await api_client.post(
        "/api/v1/query/semantic",
        json={"top_k": 5},
    )
    assert response.status_code == 422


# ─────────────────────────────────────────────────────────────────
#  /api/v1/query/image-search
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_image_search_with_text_prompt(api_client: AsyncClient):
    """Image search using a text_prompt returns 200 with query_type=text-clip."""
    response = await api_client.post(
        "/api/v1/query/image-search",
        json={"text_prompt": "misty waterfall in jungle", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "text-clip"
    assert data["embedding_model"] == "CLIP ViT-B/32"
    for result in data["results"]:
        assert result["source"] == "pinecone-image"


@pytest.mark.asyncio
async def test_image_search_with_image_url(api_client: AsyncClient):
    """Image search using an image_url returns 200 with query_type=image."""
    response = await api_client.post(
        "/api/v1/query/image-search",
        json={"image_url": "https://example.com/waterfall.jpg", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "image"


@pytest.mark.asyncio
async def test_image_search_requires_at_least_one_input(api_client: AsyncClient):
    """Providing neither image_url nor text_prompt returns 400 Bad Request."""
    response = await api_client.post(
        "/api/v1/query/image-search",
        json={"top_k": 5},
    )
    assert response.status_code == 400
    assert "image_url" in response.json()["detail"]


@pytest.mark.asyncio
async def test_image_search_top_k_validation(api_client: AsyncClient):
    """top_k above 20 should return 422 for image-search."""
    response = await api_client.post(
        "/api/v1/query/image-search",
        json={"text_prompt": "beach", "top_k": 50},
    )
    assert response.status_code == 422


# ─────────────────────────────────────────────────────────────────
#  /api/v1/query/hybrid
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_hybrid_query_200(api_client: AsyncClient):
    """A valid hybrid query returns 200 with ai_response and all result sets."""
    response = await api_client.post(
        "/api/v1/query/hybrid",
        json={"query": "best national parks for families under $20", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert "ai_response" in data
    assert len(data["ai_response"]) > 0
    assert "structured_results" in data
    assert "semantic_results" in data
    assert "image_results" in data
    assert "total_sources" in data


@pytest.mark.asyncio
async def test_hybrid_query_with_image_url(api_client: AsyncClient):
    """Hybrid query with optional image_url should still return 200."""
    response = await api_client.post(
        "/api/v1/query/hybrid",
        json={
            "query": "peaceful waterfalls",
            "image_url": "https://example.com/waterfall.jpg",
            "top_k": 3,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_hybrid_query_missing_query_field(api_client: AsyncClient):
    """Missing 'query' field returns 422 Unprocessable Entity."""
    response = await api_client.post(
        "/api/v1/query/hybrid",
        json={"top_k": 5},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_hybrid_total_sources_calculation(api_client: AsyncClient):
    """total_sources must equal sum of all three result list lengths."""
    response = await api_client.post(
        "/api/v1/query/hybrid",
        json={"query": "beaches in galle", "top_k": 5},
    )
    assert response.status_code == 200
    data = response.json()
    expected_total = (
        len(data["structured_results"])
        + len(data["semantic_results"])
        + len(data["image_results"])
    )
    assert data["total_sources"] == expected_total
