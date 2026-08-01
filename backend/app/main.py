"""
app/main.py — LankaRAG FastAPI Application Entry Point (Refactored)

Service-oriented architecture:
  - All business logic is in app/services/
  - Route handlers are in app/api/v1/endpoints/
  - Configuration is in app/core/config.py
  - DB/Pinecone clients are in app/core/db.py

Run with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import check_postgres, check_pinecone_text, check_pinecone_image
from app.api.v1.router import router as api_v1_router
from app.schemas.query import HealthResponse

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks and graceful shutdown."""
    logger.info("🚀 LankaRAG backend starting up (service-oriented architecture)...")

    pg_status = await check_postgres()
    logger.info("  PostgreSQL : %s", pg_status)

    # Pinecone checks are best-effort; don't block startup on misconfiguration
    try:
        txt_status = await check_pinecone_text()
        img_status = await check_pinecone_image()
        logger.info("  Pinecone text  : %s", txt_status)
        logger.info("  Pinecone image : %s", img_status)
    except Exception as exc:
        logger.warning("  Pinecone check skipped: %s", exc)

    logger.info("  API v1 prefix  : /api/v1/query")
    yield

    logger.info("🛑 LankaRAG backend shutting down...")


# ── FastAPI App ────────────────────────────────────────────────────
app = FastAPI(
    title="LankaRAG API",
    description=(
        "Multimodal Multi-Source RAG system for Sri Lanka Tourism. "
        "Supports structured SQL queries, semantic vector search, "
        "CLIP image similarity, and hybrid Gemini-powered RAG. "
        "Refactored into service-oriented architecture under app/."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount v1 router ───────────────────────────────────────────────
app.include_router(api_v1_router)


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Verify connectivity to PostgreSQL, Pinecone indexes, and Gemini API."""
    pg_status = await check_postgres()
    txt_status = await check_pinecone_text()
    img_status = await check_pinecone_image()
    gemini_status = "ok" if settings.gemini_api_key else "error: GEMINI_API_KEY not set"

    all_ok = all(s.startswith("ok") for s in [pg_status, gemini_status])

    return HealthResponse(
        status="ok" if all_ok else "degraded",
        postgres=pg_status,
        pinecone_text=txt_status,
        pinecone_image=img_status,
        gemini=gemini_status,
    )


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "LankaRAG API v2 is running 🌴",
        "architecture": "service-oriented (app/ package)",
        "docs": "/docs",
        "health": "/health",
        "v1_routes": {
            "structured": "/api/v1/query/structured",
            "semantic": "/api/v1/query/semantic",
            "image_search": "/api/v1/query/image-search",
            "hybrid": "/api/v1/query/hybrid",
        },
    }
