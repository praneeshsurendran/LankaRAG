"""
app/api/v1/router.py — Aggregates all v1 endpoint routers.

All query routes are mounted under the /api/v1/query prefix.
Import this router in app/main.py.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import structured, semantic, image_search, hybrid

router = APIRouter(prefix="/api/v1/query")

router.include_router(structured.router)
router.include_router(semantic.router)
router.include_router(image_search.router)
router.include_router(hybrid.router)
