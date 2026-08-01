"""
app/api/v1/endpoints/image_search.py — POST /api/v1/query/image-search

Route handler only: validates that at least one input is provided,
delegates encoding to embedding_service, search to vector_service.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.query import ImageSearchRequest, ImageSearchResponse
from app.services import embedding_service, vector_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Image Search"])


@router.post("/image-search", response_model=ImageSearchResponse)
async def image_search(
    body: ImageSearchRequest,
    db: AsyncSession = Depends(get_db),
) -> ImageSearchResponse:
    """
    Find visually similar tourist attractions using CLIP embeddings (dim=512).

    Provide either:
    - `image_url`: a public image URL or base64 data URI
    - `text_prompt`: a visual description (zero-shot cross-modal search)

    Returns the top-k most visually similar Sri Lankan attractions.
    """
    if not body.image_url and not body.text_prompt:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'image_url' (URL or base64 data URI) or 'text_prompt'.",
        )

    query_type = "image" if body.image_url else "text-clip"
    logger.info(
        "Image search — type=%s, top_k=%d", query_type, body.top_k
    )

    try:
        if body.image_url:
            # Async image fetch + CLIP encoding (non-blocking)
            query_vector = await embedding_service.encode_image_from_url(body.image_url)
        else:
            # CLIP text encoder for zero-shot visual search
            query_vector = embedding_service.encode_text_with_clip(body.text_prompt)  # type: ignore[arg-type]

        results = await vector_service.image_search(
            query_vector=query_vector,
            top_k=body.top_k,
            db=db,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Image search failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return ImageSearchResponse(results=results, query_type=query_type)
