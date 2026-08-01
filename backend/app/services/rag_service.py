"""
app/services/rag_service.py — Hybrid RAG orchestration via LangChain + Gemini.

Responsibilities:
  1. Coordinate concurrent retrieval from sql_service + vector_service
  2. Format all retrieved context into a structured prompt
  3. Invoke Gemini (gemini-1.5-flash) via LangChain to synthesize a response

The Gemini LLM is constructed once as a class attribute and reused.
Context formatting is kept here to keep all prompt logic in one place.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.schemas.attraction import AttractionResult
from app.services import sql_service, vector_service, embedding_service

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────
#  Prompt Template
# ─────────────────────────────────────────────────────────────────

_HYBRID_RAG_PROMPT = PromptTemplate(
    input_variables=[
        "user_query",
        "structured_context",
        "semantic_context",
        "image_context",
    ],
    template="""You are LankaGuide, an expert AI travel assistant specialising in Sri Lanka tourism.
Your goal is to provide accurate, engaging, and personalised travel recommendations.

---
**User Query:**
{user_query}

---
**Structured Data (from PostgreSQL — factual, numerical):**
{structured_context}

---
**Semantic Matches (from vector search — descriptive similarity):**
{semantic_context}

---
**Visually Similar Locations (from CLIP image search):**
{image_context}

---
**Instructions:**
1. Synthesise information from ALL THREE sources above.
2. Provide a warm, helpful, markdown-formatted travel recommendation.
3. Highlight key facts: entrance fees, difficulty level, district, best time to visit.
4. If entrance fee data is available, mention it explicitly.
5. Group recommendations by category if multiple categories are present.
6. End with 1-2 practical travel tips specific to Sri Lanka.
7. Keep your response under 500 words and highly actionable.

**Response:**""",
)


# ─────────────────────────────────────────────────────────────────
#  LLM singleton
# ─────────────────────────────────────────────────────────────────

_rag_llm: Optional[ChatGoogleGenerativeAI] = None


def _get_rag_llm() -> ChatGoogleGenerativeAI:
    """Return (or create) the Gemini LLM singleton for RAG synthesis."""
    global _rag_llm
    if _rag_llm is None:
        _rag_llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.4,
            max_output_tokens=1024,
            convert_system_message_to_human=True,
        )
    return _rag_llm


# ─────────────────────────────────────────────────────────────────
#  Context formatting helpers
# ─────────────────────────────────────────────────────────────────

def _format_context(attractions: list[AttractionResult], source_label: str) -> str:
    """Format a list of AttractionResult objects into a readable LLM context block."""
    if not attractions:
        return f"No {source_label} results found."

    lines: list[str] = []
    for i, a in enumerate(attractions, start=1):
        fee = f"${a.entrance_fee_usd:.2f}" if a.entrance_fee_usd is not None else "Free"
        score_str = f" (score: {a.score:.3f})" if a.score is not None else ""
        lines.append(
            f"{i}. **{a.name}** [{a.category}] — {a.district} District\n"
            f"   Fee: {fee} | Difficulty: {a.difficulty_level or 'N/A'}{score_str}\n"
            f"   {a.description[:200]}..."
        )
    return "\n\n".join(lines)


# ─────────────────────────────────────────────────────────────────
#  Main orchestration entry point
# ─────────────────────────────────────────────────────────────────

async def run_hybrid_rag(
    query: str,
    db: AsyncSession,
    top_k: int = 5,
    image_url: Optional[str] = None,
) -> tuple[str, list[AttractionResult], list[AttractionResult], list[AttractionResult]]:
    """
    Run the full hybrid RAG pipeline:
      1. Structured SQL retrieval (Gemini text-to-SQL → PostgreSQL)
      2. Semantic text search (SentenceTransformer → Pinecone)
      3. Optional image similarity search (CLIP → Pinecone)
      4. Gemini synthesis of all three contexts

    Steps 1 and 2 are executed concurrently via asyncio.gather.

    Returns:
        Tuple of (ai_response, structured_results, semantic_results, image_results)
    """
    # ── Concurrent retrieval: structured + semantic ──────────────────
    async def _fetch_structured() -> list[AttractionResult]:
        try:
            sql = await sql_service.generate_sql(query)
            if not sql_service.is_safe_sql(sql):
                logger.warning("Unsafe SQL skipped in hybrid: %s", sql)
                return []
            return await sql_service.run_sql_query(sql, db, top_k=top_k)
        except Exception as exc:
            logger.warning("Structured retrieval failed in hybrid: %s", exc)
            return []

    async def _fetch_semantic() -> list[AttractionResult]:
        try:
            vector = embedding_service.encode_text(query)
            return await vector_service.text_search(vector, top_k, db)
        except Exception as exc:
            logger.warning("Semantic retrieval failed in hybrid: %s", exc)
            return []

    structured_results, semantic_results = await asyncio.gather(
        _fetch_structured(), _fetch_semantic()
    )

    # ── Optional image retrieval ─────────────────────────────────────
    image_results: list[AttractionResult] = []
    if image_url:
        try:
            img_vector = await embedding_service.encode_image_from_url(image_url)
            image_results = await vector_service.image_search(img_vector, top_k, db)
        except Exception as exc:
            logger.warning("Image retrieval failed in hybrid: %s", exc)

    # ── Gemini synthesis ─────────────────────────────────────────────
    chain = _HYBRID_RAG_PROMPT | _get_rag_llm()

    logger.info(
        "Hybrid RAG synthesis — structured: %d, semantic: %d, image: %d",
        len(structured_results), len(semantic_results), len(image_results),
    )

    result = await chain.ainvoke({
        "user_query": query,
        "structured_context": _format_context(structured_results, "structured"),
        "semantic_context": _format_context(semantic_results, "semantic"),
        "image_context": _format_context(image_results, "image"),
    })

    ai_response = result.content if hasattr(result, "content") else str(result)
    return ai_response, structured_results, semantic_results, image_results


async def synthesize_rag_response(
    query: str,
    structured_results: list[AttractionResult],
    semantic_results: list[AttractionResult],
    image_results: list[AttractionResult],
) -> str:
    """
    Lower-level helper: synthesize a Gemini response from pre-fetched results.
    Used in tests and standalone callers who already have results.
    """
    chain = _HYBRID_RAG_PROMPT | _get_rag_llm()
    result = await chain.ainvoke({
        "user_query": query,
        "structured_context": _format_context(structured_results, "structured"),
        "semantic_context": _format_context(semantic_results, "semantic"),
        "image_context": _format_context(image_results, "image"),
    })
    return result.content if hasattr(result, "content") else str(result)
