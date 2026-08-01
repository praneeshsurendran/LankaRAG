"""
app/services/embedding_service.py — Singleton wrapper for ML model inference.

Manages:
  - SentenceTransformer (all-MiniLM-L6-v2) for 384-dim text embeddings
  - CLIP ViT-B/32 for 512-dim image embeddings (both image and text encoders)

Both models are lazily loaded once on first use and reused for the lifetime
of the process. This avoids repeated expensive model initialisation per request.

Async fix: image URL fetching uses httpx.AsyncClient instead of the blocking
`requests.get()` that was previously called inside async route handlers.
"""

from __future__ import annotations

import base64
import io
import logging
from functools import lru_cache

import httpx
import torch
from PIL import Image

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
#  SentenceTransformer singleton
# ─────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_sentence_transformer():
    """Load and cache the sentence-transformer model (called once)."""
    from sentence_transformers import SentenceTransformer  # deferred import
    logger.info("Loading SentenceTransformer (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    logger.info("SentenceTransformer ready.")
    return model


# ─────────────────────────────────────────────────────────────────
#  CLIP singleton
# ─────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_clip():
    """Load and cache the CLIP ViT-B/32 model (called once)."""
    import clip  # deferred import (optional heavy dependency)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Loading CLIP ViT-B/32 on %s...", device)
    model, preprocess = clip.load("ViT-B/32", device=device)
    logger.info("CLIP ready.")
    return model, preprocess, device


# ─────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────

def encode_text(query: str) -> list[float]:
    """
    Encode a text query with SentenceTransformer.
    Returns a normalised 384-dim embedding.
    """
    model = _load_sentence_transformer()
    vector = model.encode(query, normalize_embeddings=True)
    return vector.tolist()


def encode_text_with_clip(text_prompt: str) -> list[float]:
    """
    Encode a text description with CLIP's text encoder.
    Returns a normalised 512-dim embedding.
    """
    import clip  # deferred import

    model, _, device = _load_clip()
    tokens = clip.tokenize([text_prompt]).to(device)
    with torch.no_grad():
        embedding = model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    return embedding.squeeze().cpu().tolist()


async def encode_image_from_url(image_url: str) -> list[float]:
    """
    Download an image (URL or base64 data URI) and return its
    CLIP image embedding (512-dim, L2-normalised).

    Uses httpx.AsyncClient for non-blocking HTTP fetching, fixing
    the original bug where blocking requests.get() was called
    inside an async FastAPI route handler.
    """
    model, preprocess, device = _load_clip()

    if image_url.startswith("data:image"):
        # Base64 data URI from the frontend drag-and-drop uploader
        _, encoded = image_url.split(",", 1)
        image_bytes = base64.b64decode(encoded)
    else:
        # Public HTTP/HTTPS URL — fetched asynchronously
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            image_bytes = response.content

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(device)  # type: ignore[operator]

    with torch.no_grad():
        embedding = model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

    return embedding.squeeze().cpu().tolist()
