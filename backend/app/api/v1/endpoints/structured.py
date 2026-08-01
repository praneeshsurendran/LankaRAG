"""
app/api/v1/endpoints/structured.py — POST /api/v1/query/structured

Route handler only: validates input, delegates to sql_service,
and formats the response. No business logic lives here.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.query import StructuredQueryRequest, StructuredQueryResponse
from app.services import sql_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Structured Query"])


@router.post("/structured", response_model=StructuredQueryResponse)
async def structured_query(
    body: StructuredQueryRequest,
    db: AsyncSession = Depends(get_db),
) -> StructuredQueryResponse:
    """
    Convert a natural-language query to SQL via Gemini and execute it against PostgreSQL.

    Examples:
    - "Which waterfalls have an entrance fee under $5?"
    - "List all beaches in the Galle district"
    - "Show me Easy difficulty national parks that are free"
    """
    logger.info("Structured query: %r (top_k=%d)", body.query, body.top_k)

    try:
        generated_sql = await sql_service.generate_sql(body.query, row_limit=body.top_k)
        logger.info("Generated SQL: %s", generated_sql)

        if not sql_service.is_safe_sql(generated_sql):
            raise HTTPException(
                status_code=400,
                detail=f"Generated SQL failed safety check: {generated_sql!r}",
            )

        results = await sql_service.run_sql_query(generated_sql, db, top_k=body.top_k)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Structured query failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return StructuredQueryResponse(
        results=results,
        generated_sql=generated_sql,
        total=len(results),
    )
