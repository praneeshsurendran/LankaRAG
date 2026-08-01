"""
app/services/sql_service.py — Structured SQL query service.

Provides:
  - generate_sql(question) → SQL string via Gemini LLM
  - is_safe_sql(sql)       → bool safety guard
  - run_sql(sql, db)       → list[AttractionResult]

The Gemini LLM instance is constructed once and reused (not per-request).
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.schemas.attraction import AttractionResult

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────
#  Text-to-SQL constants
# ─────────────────────────────────────────────────────────────────

TABLE_SCHEMA = """
Table: tourist_attractions
Columns:
  - id               INTEGER  (primary key)
  - name             TEXT     (attraction name)
  - category         TEXT     ('Beaches' | 'Waterfalls' | 'Historical Sites' | 'National Parks' | 'Temples')
  - district         TEXT     (Sri Lanka district, e.g. 'Galle', 'Kandy', 'Colombo')
  - entrance_fee_usd FLOAT    (USD; NULL means free entry)
  - difficulty_level TEXT     ('Easy' | 'Moderate' | 'Hard')
  - description      TEXT
  - image_url        TEXT
"""

SQL_GENERATION_PROMPT = """\
You are a PostgreSQL expert. Generate a safe SELECT query for the question below.
Rules:
- ONLY SELECT statements. Never INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE.
- Query only: tourist_attractions
- Return at most {limit} rows (add LIMIT {limit} if not already present).
- Return ONLY the raw SQL — no markdown fences, no explanation, no trailing semicolon.

{schema}

Question: {question}

SQL:"""

_FORBIDDEN_SQL = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\b",
    re.IGNORECASE,
)


# ─────────────────────────────────────────────────────────────────
#  LLM singleton (constructed once per process)
# ─────────────────────────────────────────────────────────────────

_gemini_sql_llm = None


def _get_sql_llm():
    """Return the cached Gemini LLM for SQL generation."""
    global _gemini_sql_llm
    if _gemini_sql_llm is None:
        from langchain_google_genai import ChatGoogleGenerativeAI
        _gemini_sql_llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.0,   # deterministic for SQL generation
        )
    return _gemini_sql_llm


# ─────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────

def is_safe_sql(sql: str) -> bool:
    """
    Return True only if the SQL is a read-only SELECT statement.
    Rejects any DML or DDL keywords to prevent destructive queries.
    """
    stripped = sql.strip().upper()
    return stripped.startswith("SELECT") and not _FORBIDDEN_SQL.search(sql)


async def generate_sql(question: str, row_limit: int = 20) -> str:
    """
    Use Gemini to convert a natural-language question into a SQL query.

    Returns the raw SQL string. Strips any accidental markdown fencing.
    """
    llm = _get_sql_llm()
    prompt = SQL_GENERATION_PROMPT.format(
        schema=TABLE_SCHEMA, question=question, limit=row_limit
    )
    result = await llm.ainvoke(prompt)
    sql = result.content if hasattr(result, "content") else str(result)
    # Strip accidental ```sql ... ``` fences
    sql = re.sub(r"```(?:sql)?", "", sql).strip().rstrip(";")
    return sql


def _row_to_attraction(row, score: Optional[float] = None) -> AttractionResult:
    """Convert a raw SQLAlchemy text-query row to an AttractionResult."""
    return AttractionResult(
        id=row.id,
        name=row.name,
        category=row.category,
        district=row.district,
        entrance_fee_usd=row.entrance_fee_usd,
        difficulty_level=row.difficulty_level,
        description=row.description,
        image_url=row.image_url,
        score=score,
        source="postgres",
    )


async def run_sql_query(
    sql: str,
    db: AsyncSession,
    top_k: int = 20,
) -> list[AttractionResult]:
    """
    Execute a pre-validated SELECT SQL statement and return results.

    Args:
        sql: A safe SELECT SQL string (pre-validated with is_safe_sql).
        db: SQLAlchemy async session.
        top_k: Maximum results to return.

    Returns:
        List of AttractionResult objects.
    """
    result = await db.execute(text(sql))
    rows = result.fetchall()
    return [_row_to_attraction(row) for row in rows[:top_k]]
