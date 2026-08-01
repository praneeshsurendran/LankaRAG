"""
tests/services/test_rag.py — Unit tests for the service layer.

Tests verify the business logic of each service in isolation,
without HTTP transport or real external calls.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.attraction import AttractionResult


# ─────────────────────────────────────────────────────────────────
#  Test helpers
# ─────────────────────────────────────────────────────────────────

def _make_attraction(
    id: int = 1,
    name: str = "Sigiriya Rock Fortress",
    category: str = "Historical Sites",
    district: str = "Matale",
    fee: float = 30.0,
    difficulty: str = "Moderate",
    source: str = "postgres",
    score: float | None = None,
) -> AttractionResult:
    return AttractionResult(
        id=id,
        name=name,
        category=category,
        district=district,
        entrance_fee_usd=fee,
        difficulty_level=difficulty,
        description=f"A UNESCO World Heritage site — {name}.",
        image_url=None,
        score=score,
        source=source,
    )


# ─────────────────────────────────────────────────────────────────
#  sql_service unit tests
# ─────────────────────────────────────────────────────────────────

class TestSqlService:
    """Unit tests for app.services.sql_service."""

    def test_is_safe_sql_accepts_select(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("SELECT * FROM tourist_attractions LIMIT 10") is True

    def test_is_safe_sql_accepts_select_with_where(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql(
            "SELECT id, name FROM tourist_attractions WHERE category = 'Beaches'"
        ) is True

    def test_is_safe_sql_rejects_drop(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("DROP TABLE tourist_attractions") is False

    def test_is_safe_sql_rejects_delete(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("DELETE FROM tourist_attractions WHERE id = 1") is False

    def test_is_safe_sql_rejects_insert(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("INSERT INTO tourist_attractions VALUES (1, 'X')") is False

    def test_is_safe_sql_rejects_update(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("UPDATE tourist_attractions SET name='X' WHERE id=1") is False

    def test_is_safe_sql_rejects_truncate(self):
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("TRUNCATE tourist_attractions") is False

    def test_is_safe_sql_rejects_embedded_delete(self):
        """SELECT wrapping a DELETE subquery should still be rejected."""
        from app.services.sql_service import is_safe_sql
        assert is_safe_sql("SELECT 1; DELETE FROM tourist_attractions") is False

    @pytest.mark.asyncio
    async def test_generate_sql_calls_llm(self):
        """generate_sql should invoke the LLM and strip markdown fences."""
        from app.services import sql_service

        mock_msg = MagicMock()
        mock_msg.content = "```sql\nSELECT * FROM tourist_attractions LIMIT 5\n```"
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_msg)

        with patch.object(sql_service, "_get_sql_llm", return_value=mock_llm):
            result = await sql_service.generate_sql("Which beaches are free?")

        assert "SELECT" in result
        assert "```" not in result

    @pytest.mark.asyncio
    async def test_run_sql_query_maps_rows(self):
        """run_sql_query should map DB rows to AttractionResult objects."""
        from app.services import sql_service

        mock_row = MagicMock()
        mock_row.id = 5
        mock_row.name = "Mirissa Beach"
        mock_row.category = "Beaches"
        mock_row.district = "Matara"
        mock_row.entrance_fee_usd = None
        mock_row.difficulty_level = "Easy"
        mock_row.description = "Beautiful beach in Matara."
        mock_row.image_url = None

        mock_result = MagicMock()
        mock_result.fetchall.return_value = [mock_row]

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=mock_result)

        results = await sql_service.run_sql_query(
            "SELECT * FROM tourist_attractions", mock_db, top_k=10
        )

        assert len(results) == 1
        assert results[0].name == "Mirissa Beach"
        assert results[0].source == "postgres"


# ─────────────────────────────────────────────────────────────────
#  vector_service unit tests
# ─────────────────────────────────────────────────────────────────

class TestVectorService:
    """Unit tests for app.services.vector_service."""

    @pytest.mark.asyncio
    async def test_text_search_returns_ordered_results(self):
        """text_search preserves Pinecone rank order in returned results."""
        from app.services import vector_service
        from app.core import db as db_module

        db_obj_1 = MagicMock()
        db_obj_1.id = 1
        db_obj_1.to_dict.return_value = {
            "id": 1, "name": "Unawatuna Beach", "category": "Beaches",
            "district": "Galle", "entrance_fee_usd": None,
            "difficulty_level": "Easy", "description": "...", "image_url": None,
        }
        db_obj_2 = MagicMock()
        db_obj_2.id = 2
        db_obj_2.to_dict.return_value = {
            "id": 2, "name": "Mirissa Beach", "category": "Beaches",
            "district": "Matara", "entrance_fee_usd": None,
            "difficulty_level": "Easy", "description": "...", "image_url": None,
        }

        mock_pinecone = MagicMock()
        mock_pinecone.query.return_value = {
            "matches": [
                {"id": "1", "score": 0.95, "metadata": {}},
                {"id": "2", "score": 0.87, "metadata": {}},
            ]
        }

        mock_db = AsyncMock()
        scalar_result = MagicMock()
        scalar_result.scalars.return_value.all.return_value = [db_obj_1, db_obj_2]
        mock_db.execute = AsyncMock(return_value=scalar_result)

        with patch.object(db_module, "get_pinecone_text_index", return_value=mock_pinecone):
            results = await vector_service.text_search([0.0] * 384, top_k=5, db=mock_db)

        assert len(results) == 2
        assert results[0].name == "Unawatuna Beach"
        assert results[0].score == 0.95
        assert results[0].source == "pinecone-text"
        assert results[1].score == 0.87

    @pytest.mark.asyncio
    async def test_text_search_empty_pinecone_response(self):
        """text_search returns an empty list when Pinecone returns no matches."""
        from app.services import vector_service
        from app.core import db as db_module

        mock_pinecone = MagicMock()
        mock_pinecone.query.return_value = {"matches": []}
        mock_db = AsyncMock()

        with patch.object(db_module, "get_pinecone_text_index", return_value=mock_pinecone):
            results = await vector_service.text_search([0.0] * 384, top_k=5, db=mock_db)

        assert results == []

    @pytest.mark.asyncio
    async def test_image_search_returns_results(self):
        """image_search returns correctly sourced results from the image index."""
        from app.services import vector_service
        from app.core import db as db_module

        db_obj = MagicMock()
        db_obj.id = 3
        db_obj.to_dict.return_value = {
            "id": 3, "name": "Bambarakanda Falls", "category": "Waterfalls",
            "district": "Badulla", "entrance_fee_usd": 1.5,
            "difficulty_level": "Moderate", "description": "...", "image_url": None,
        }

        mock_pinecone = MagicMock()
        mock_pinecone.query.return_value = {
            "matches": [{"id": "3", "score": 0.88, "metadata": {}}]
        }

        scalar_result = MagicMock()
        scalar_result.scalars.return_value.all.return_value = [db_obj]
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=scalar_result)

        with patch.object(db_module, "get_pinecone_image_index", return_value=mock_pinecone):
            results = await vector_service.image_search([0.0] * 512, top_k=5, db=mock_db)

        assert len(results) == 1
        assert results[0].source == "pinecone-image"
        assert results[0].score == 0.88


# ─────────────────────────────────────────────────────────────────
#  rag_service unit tests
# ─────────────────────────────────────────────────────────────────

class TestRagService:
    """Unit tests for app.services.rag_service."""

    @pytest.mark.asyncio
    async def test_synthesize_rag_response_returns_string(self):
        """synthesize_rag_response should call the LLM chain and return a string."""
        from app.services import rag_service

        mock_msg = MagicMock()
        mock_msg.content = "Here are some beautiful Sri Lankan destinations for you!"
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_msg)

        attractions = [_make_attraction(score=0.9, source="pinecone-text")]

        with patch.object(rag_service, "_get_rag_llm", return_value=mock_llm):
            result = await rag_service.synthesize_rag_response(
                query="Show me peaceful waterfalls",
                structured_results=[],
                semantic_results=attractions,
                image_results=[],
            )

        assert isinstance(result, str)
        assert "Sri Lankan" in result

    @pytest.mark.asyncio
    async def test_run_hybrid_rag_concurrent_retrieval(self):
        """run_hybrid_rag should call both structured and semantic retrieval."""
        from app.services import rag_service, sql_service, embedding_service, vector_service

        mock_msg = MagicMock()
        mock_msg.content = "Travel recommendations for you!"
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_msg)

        mock_db = AsyncMock()
        attraction = _make_attraction()

        with (
            patch.object(sql_service, "generate_sql", AsyncMock(return_value="SELECT * FROM tourist_attractions LIMIT 5")),
            patch.object(sql_service, "run_sql_query", AsyncMock(return_value=[attraction])),
            patch.object(embedding_service, "encode_text", return_value=[0.0] * 384),
            patch.object(vector_service, "text_search", AsyncMock(return_value=[attraction])),
            patch.object(rag_service, "_get_rag_llm", return_value=mock_llm),
        ):
            ai_response, structured, semantic, image = await rag_service.run_hybrid_rag(
                query="best waterfalls in Sri Lanka",
                db=mock_db,
                top_k=3,
            )

        assert isinstance(ai_response, str)
        assert len(structured) == 1
        assert len(semantic) == 1
        assert len(image) == 0  # No image_url provided

    def test_format_context_empty_list(self):
        """_format_context should return a "No results" string for empty lists."""
        from app.services.rag_service import _format_context
        result = _format_context([], "structured")
        assert "No structured results found" in result

    def test_format_context_with_attractions(self):
        """_format_context should include name, fee, district, and score."""
        from app.services.rag_service import _format_context

        attraction = _make_attraction(fee=5.0, score=0.92, source="pinecone-text")
        result = _format_context([attraction], "semantic")

        assert "Sigiriya Rock Fortress" in result
        assert "$5.00" in result
        assert "Matale" in result
        assert "score: 0.920" in result


# ─────────────────────────────────────────────────────────────────
#  embedding_service unit tests
# ─────────────────────────────────────────────────────────────────

class TestEmbeddingService:
    """Unit tests for app.services.embedding_service."""

    def test_encode_text_returns_list(self):
        """encode_text should return a list of floats."""
        from app.services import embedding_service
        import numpy as np

        mock_model = MagicMock()
        mock_model.encode.return_value = np.zeros(384, dtype="float32")

        with patch.object(embedding_service, "_load_sentence_transformer", return_value=mock_model):
            result = embedding_service.encode_text("test query")

        assert isinstance(result, list)
        assert len(result) == 384

    def test_encode_text_with_clip_returns_list(self):
        """encode_text_with_clip should return a 512-dim list."""
        import torch
        from app.services import embedding_service

        mock_model = MagicMock()
        mock_model.encode_text.return_value = torch.zeros(1, 512)

        with (
            patch("clip.tokenize", return_value=torch.zeros(1, 77, dtype=torch.long)),
            patch.object(embedding_service, "_load_clip", return_value=(mock_model, None, "cpu")),
        ):
            result = embedding_service.encode_text_with_clip("misty waterfall")

        assert isinstance(result, list)
        assert len(result) == 512

    @pytest.mark.asyncio
    async def test_encode_image_from_base64_data_uri(self):
        """encode_image_from_url should handle base64 data URIs without HTTP requests."""
        import base64
        import io
        import torch
        from PIL import Image
        from app.services import embedding_service

        # Create a tiny 4x4 white PNG as base64 data URI
        img = Image.new("RGB", (4, 4), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        data_uri = f"data:image/png;base64,{b64}"

        mock_model = MagicMock()
        mock_model.encode_image.return_value = torch.zeros(1, 512)
        mock_preprocess = MagicMock(return_value=torch.zeros(3, 224, 224))

        with patch.object(embedding_service, "_load_clip", return_value=(mock_model, mock_preprocess, "cpu")):
            result = await embedding_service.encode_image_from_url(data_uri)

        assert isinstance(result, list)
        assert len(result) == 512
