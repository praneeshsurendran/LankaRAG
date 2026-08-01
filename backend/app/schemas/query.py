"""
app/schemas/query.py — Pydantic request/response schemas for all four query endpoints.
"""

from typing import Optional
from pydantic import BaseModel, Field

from app.schemas.attraction import AttractionResult


# ─────────────────────────────────────────────────────────────────
#  Structured Query  (POST /api/v1/query/structured)
# ─────────────────────────────────────────────────────────────────

class StructuredQueryRequest(BaseModel):
    query: str = Field(
        ...,
        description="Natural-language query that will be converted to SQL",
        examples=["Which waterfalls have an entrance fee under $5?"],
    )
    top_k: int = Field(default=10, ge=1, le=50)


class StructuredQueryResponse(BaseModel):
    results: list[AttractionResult]
    generated_sql: Optional[str] = Field(
        default=None, description="The SQL statement generated from the query"
    )
    total: int


# ─────────────────────────────────────────────────────────────────
#  Semantic Query  (POST /api/v1/query/semantic)
# ─────────────────────────────────────────────────────────────────

class SemanticQueryRequest(BaseModel):
    query: str = Field(
        ...,
        description="Free-text query for semantic similarity search",
        examples=["serene historical locations for meditation"],
    )
    top_k: int = Field(default=5, ge=1, le=20)
    category_filter: Optional[str] = Field(
        default=None,
        description="Optional category: Beaches, Waterfalls, Historical Sites, National Parks, Temples",
    )


class SemanticQueryResponse(BaseModel):
    results: list[AttractionResult]
    query_embedding_model: str = "all-MiniLM-L6-v2"


# ─────────────────────────────────────────────────────────────────
#  Image Search  (POST /api/v1/query/image-search)
# ─────────────────────────────────────────────────────────────────

class ImageSearchRequest(BaseModel):
    image_url: Optional[str] = Field(
        default=None,
        description="Public URL or base64 data URI of an image for visual similarity search",
    )
    text_prompt: Optional[str] = Field(
        default=None,
        description="Text description used as CLIP text embedding (fallback)",
        examples=["lush green waterfall surrounded by jungle"],
    )
    top_k: int = Field(default=5, ge=1, le=20)


class ImageSearchResponse(BaseModel):
    results: list[AttractionResult]
    query_type: str = Field(
        description="'image' if image_url was used, 'text-clip' if text_prompt was used"
    )
    embedding_model: str = "CLIP ViT-B/32"


# ─────────────────────────────────────────────────────────────────
#  Hybrid Query  (POST /api/v1/query/hybrid)
# ─────────────────────────────────────────────────────────────────

class HybridQueryRequest(BaseModel):
    query: str = Field(
        ...,
        description="Full natural-language query for hybrid RAG",
        examples=["best national parks for a family safari under $20"],
    )
    image_url: Optional[str] = Field(
        default=None,
        description="Optional image URL to incorporate visual similarity",
    )
    top_k: int = Field(default=5, ge=1, le=20)


class HybridQueryResponse(BaseModel):
    ai_response: str = Field(description="Gemini-synthesized travel recommendation")
    structured_results: list[AttractionResult]
    semantic_results: list[AttractionResult]
    image_results: list[AttractionResult]
    total_sources: int


# ─────────────────────────────────────────────────────────────────
#  Health Check
# ─────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    postgres: str
    pinecone_text: str
    pinecone_image: str
    gemini: str
