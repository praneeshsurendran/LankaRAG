"""
app/schemas/attraction.py — Pydantic schema for a single tourist attraction result.

Shared across all four query pipelines.
"""

from typing import Optional
from pydantic import BaseModel, Field


class AttractionResult(BaseModel):
    """A single tourist attraction returned by any retrieval pipeline."""

    id: int
    name: str
    category: str
    district: str
    entrance_fee_usd: Optional[float] = None
    difficulty_level: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    score: Optional[float] = Field(
        default=None,
        description="Cosine similarity/relevance score (0–1) from vector search",
    )
    source: str = Field(
        default="postgres",
        description="Data source: 'postgres', 'pinecone-text', or 'pinecone-image'",
    )
