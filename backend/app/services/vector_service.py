"""
app/services/vector_service.py — Pinecone query operations.

Encapsulates all vector index interactions so route handlers
never import Pinecone types directly. Two indexes are supported:
  - Text index (dim=384, cosine) — sentence-transformers
  - Image index (dim=512, cosine) — CLIP ViT-B/32
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_pinecone_text_index, get_pinecone_image_index
from app.models.attraction import TouristAttraction
from app.schemas.attraction import AttractionResult

logger = logging.getLogger(__name__)


def _hydrate_results(
    matches: list[dict],
    db_attractions: dict[int, TouristAttraction],
    source: str,
) -> list[AttractionResult]:
    """
    Map Pinecone matches to AttractionResult objects using a pre-fetched
    DB dictionary, preserving the score-ranked order from Pinecone.
    """
    results: list[AttractionResult] = []
    for match in matches:
        attr_id = int(match["id"])
        if attr_id in db_attractions:
            attraction = db_attractions[attr_id]
            results.append(
                AttractionResult(
                    **attraction.to_dict(),
                    score=round(match["score"], 4),
                    source=source,
                )
            )
    return results


async def text_search(
    query_vector: list[float],
    top_k: int,
    db: AsyncSession,
    category_filter: Optional[str] = None,
) -> list[AttractionResult]:
    """
    Search the Pinecone text index, then hydrate full records from PostgreSQL.

    Args:
        query_vector: 384-dim normalised embedding from SentenceTransformer.
        top_k: Maximum number of results to return.
        db: SQLAlchemy async session.
        category_filter: Optional Pinecone metadata filter on attraction category.

    Returns:
        List of AttractionResult ordered by Pinecone cosine similarity score.
    """
    index = get_pinecone_text_index()

    query_params: dict = {
        "vector": query_vector,
        "top_k": top_k,
        "include_metadata": True,
    }
    if category_filter:
        query_params["filter"] = {"category": {"$eq": category_filter}}

    response = index.query(**query_params)
    matches: list[dict] = response.get("matches", [])

    if not matches:
        return []

    attraction_ids = [int(m["id"]) for m in matches]
    stmt = select(TouristAttraction).where(TouristAttraction.id.in_(attraction_ids))
    db_result = await db.execute(stmt)
    db_attractions = {a.id: a for a in db_result.scalars().all()}

    return _hydrate_results(matches, db_attractions, source="pinecone-text")


async def image_search(
    query_vector: list[float],
    top_k: int,
    db: AsyncSession,
) -> list[AttractionResult]:
    """
    Search the Pinecone image index, then hydrate full records from PostgreSQL.

    Args:
        query_vector: 512-dim normalised CLIP embedding.
        top_k: Maximum number of results to return.
        db: SQLAlchemy async session.

    Returns:
        List of AttractionResult ordered by visual similarity score.
    """
    index = get_pinecone_image_index()

    response = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
    )
    matches: list[dict] = response.get("matches", [])

    if not matches:
        return []

    attraction_ids = [int(m["id"]) for m in matches]
    stmt = select(TouristAttraction).where(TouristAttraction.id.in_(attraction_ids))
    db_result = await db.execute(stmt)
    db_attractions = {a.id: a for a in db_result.scalars().all()}

    return _hydrate_results(matches, db_attractions, source="pinecone-image")
