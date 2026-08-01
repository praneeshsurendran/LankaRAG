"""
app/api/v1/endpoints/hybrid.py — POST /api/v1/query/hybrid

Route handler only: delegates the entire multi-source retrieval
and Gemini synthesis to rag_service.run_hybrid_rag().
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.query import HybridQueryRequest, HybridQueryResponse
from app.services import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Hybrid RAG"])


@router.post("/hybrid", response_model=HybridQueryResponse)
async def hybrid_query(
    body: HybridQueryRequest,
    db: AsyncSession = Depends(get_db),
) -> HybridQueryResponse:
    """
    Flagship hybrid RAG endpoint.

    Concurrently runs:
      1. Structured SQL (Gemini text-to-SQL → PostgreSQL)
      2. Semantic search (SentenceTransformer → Pinecone)
      3. Image similarity (CLIP → Pinecone) — only if image_url provided

    Then synthesizes all context with Google Gemini (gemini-1.5-flash)
    into a markdown-formatted travel recommendation.

    Example: "best national parks for a family safari under $20 entrance fee"
    """
    logger.info("Hybrid RAG query: %r (top_k=%d)", body.query, body.top_k)

    try:
        ai_response, structured_results, semantic_results, image_results = (
            await rag_service.run_hybrid_rag(
                query=body.query,
                db=db,
                top_k=body.top_k,
                image_url=body.image_url,
            )
        )
    except Exception as exc:
        logger.error("Hybrid query failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return HybridQueryResponse(
        ai_response=ai_response,
        structured_results=structured_results,
        semantic_results=semantic_results,
        image_results=image_results,
        total_sources=len(structured_results) + len(semantic_results) + len(image_results),
    )
