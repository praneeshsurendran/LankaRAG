"""
app/api/v1/endpoints/semantic.py — POST /api/v1/query/semantic

Route handler only: delegates to embedding_service and vector_service.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.query import SemanticQueryRequest, SemanticQueryResponse
from app.services import embedding_service, vector_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Semantic Query"])


@router.post("/semantic", response_model=SemanticQueryResponse)
async def semantic_query(
    body: SemanticQueryRequest,
    db: AsyncSession = Depends(get_db),
) -> SemanticQueryResponse:
    """
    Encode the query with sentence-transformers (all-MiniLM-L6-v2) and
    perform cosine similarity search in the Pinecone text index.

    Examples:
    - "serene historical locations for meditation"
    - "adventurous waterfalls with difficult hiking trails"
    - "family-friendly beaches with calm water"
    """
    logger.info("Semantic query: %r (top_k=%d)", body.query, body.top_k)

    try:
        query_vector = embedding_service.encode_text(body.query)
        results = await vector_service.text_search(
            query_vector=query_vector,
            top_k=body.top_k,
            db=db,
            category_filter=body.category_filter,
        )
    except Exception as exc:
        logger.error("Semantic query failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return SemanticQueryResponse(results=results)
