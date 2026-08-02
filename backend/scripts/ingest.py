"""
scripts/ingest.py — Full data ingestion pipeline for LankaRAG.

What this script does:
  1. Connects to PostgreSQL and creates the tourist_attractions table (DDL)
  2. Seeds 25+ Sri Lanka tourist attractions across 5 categories
  3. Loads sentence-transformer model and encodes descriptions → text embeddings
  4. Upserts text embeddings into Pinecone text index (dim=384)
  5. Loads CLIP model and encodes image URLs → image embeddings
  6. Upserts image embeddings into Pinecone image index (dim=512)

Run from the /backend directory:
    python scripts/ingest.py

Prerequisites:
  - Docker Compose PostgreSQL is running (docker compose up -d)
  - .env file is configured with valid Pinecone and Gemini keys
  - pip install -r requirements.txt
  - pip install git+https://github.com/openai/CLIP.git
"""

import logging
import os
import ssl
import sys

# Disable SSL verification for downloading model weights on macOS
ssl._create_default_https_context = ssl._create_unverified_context
import time

# Ensure the backend/ directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clip
import requests
import torch
from PIL import Image
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
from tqdm import tqdm

from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()

from attractions import ATTRACTIONS



# ─────────────────────────────────────────────────────────────────
#  Step 1: PostgreSQL — DDL + Seed
# ─────────────────────────────────────────────────────────────────

CREATE_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tourist_attractions (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255)  NOT NULL,
    category         VARCHAR(100)  NOT NULL,
    district         VARCHAR(100)  NOT NULL,
    entrance_fee_usd FLOAT,
    difficulty_level VARCHAR(50),
    description      TEXT          NOT NULL,
    image_url        TEXT
);
"""

INSERT_SQL = """
INSERT INTO tourist_attractions
    (name, category, district, entrance_fee_usd, difficulty_level, description, image_url)
VALUES
    (:name, :category, :district, :entrance_fee_usd, :difficulty_level, :description, :image_url)
ON CONFLICT DO NOTHING
RETURNING id;
"""


def seed_postgres() -> dict[str, int]:
    """
    Create the table (if not exists) and seed all attractions.
    Returns a mapping of attraction name → DB id.
    """
    logger.info("=== Step 1: Seeding PostgreSQL ===")
    engine = create_engine(settings.sync_database_url, echo=False)
    name_to_id: dict[str, int] = {}

    with engine.begin() as conn:
        conn.execute(text(CREATE_TABLE_DDL))
        logger.info("Table tourist_attractions created/verified.")

        for attraction in tqdm(ATTRACTIONS, desc="Inserting attractions"):
            result = conn.execute(text(INSERT_SQL), attraction)
            row = result.fetchone()
            if row:
                name_to_id[attraction["name"]] = row[0]
            else:
                # Already exists — fetch the id
                existing = conn.execute(
                    text("SELECT id FROM tourist_attractions WHERE name = :name"),
                    {"name": attraction["name"]},
                ).fetchone()
                if existing:
                    name_to_id[attraction["name"]] = existing[0]

    logger.info("Seeded %d attractions into PostgreSQL.", len(name_to_id))
    return name_to_id


# ─────────────────────────────────────────────────────────────────
#  Step 2: Text Embeddings → Pinecone
# ─────────────────────────────────────────────────────────────────

def upsert_text_embeddings(name_to_id: dict[str, int]) -> None:
    """Encode descriptions with sentence-transformers and upsert to Pinecone."""
    logger.info("=== Step 2: Generating Text Embeddings (sentence-transformers) ===")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    pc = Pinecone(api_key=settings.pinecone_api_key)

    # Create index if needed (dim=384)
    existing_indexes = {idx["name"] for idx in pc.list_indexes()}
    if settings.pinecone_text_index not in existing_indexes:
        logger.info("Creating Pinecone text index: %s", settings.pinecone_text_index)
        pc.create_index(
            name=settings.pinecone_text_index,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
        # Wait for index to be ready
        logger.info("Waiting for index to initialise...")
        time.sleep(10)

    index = pc.Index(settings.pinecone_text_index)

    vectors = []
    for attraction in tqdm(ATTRACTIONS, desc="Encoding text"):
        name = attraction["name"]
        if name not in name_to_id:
            continue
        attr_id = name_to_id[name]

        # Combine name + category + description for a richer embedding
        text_to_encode = (
            f"{attraction['name']}. {attraction['category']} in {attraction['district']}. "
            f"{attraction['description']}"
        )
        embedding = model.encode(text_to_encode, normalize_embeddings=True).tolist()

        vectors.append({
            "id": str(attr_id),
            "values": embedding,
            "metadata": {
                "name": name,
                "category": attraction["category"],
                "district": attraction["district"],
                "entrance_fee_usd": attraction.get("entrance_fee_usd") or 0.0,
                "difficulty_level": attraction.get("difficulty_level", ""),
            },
        })

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        logger.info("Upserted text batch %d-%d", i, i + len(batch))

    logger.info("Text embeddings upserted: %d vectors.", len(vectors))


# ─────────────────────────────────────────────────────────────────
#  Step 3: Image Embeddings → Pinecone
# ─────────────────────────────────────────────────────────────────

def download_and_encode_image(image_url: str, preprocess, model, device: str) -> list[float] | None:
    """Download an image from URL and return its CLIP embedding."""
    try:
        response = requests.get(image_url, timeout=15)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = model.encode_image(image_tensor)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.squeeze().cpu().tolist()
    except Exception as exc:
        logger.warning("Failed to encode image %s: %s", image_url, exc)
        return None


def upsert_image_embeddings(name_to_id: dict[str, int]) -> None:
    """Encode attraction images with CLIP and upsert to Pinecone."""
    logger.info("=== Step 3: Generating Image Embeddings (CLIP ViT-B/32) ===")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Using device: %s", device)
    clip_model, preprocess = clip.load("ViT-B/32", device=device)

    pc = Pinecone(api_key=settings.pinecone_api_key)

    # Create index if needed (dim=512)
    existing_indexes = {idx["name"] for idx in pc.list_indexes()}
    if settings.pinecone_image_index not in existing_indexes:
        logger.info("Creating Pinecone image index: %s", settings.pinecone_image_index)
        pc.create_index(
            name=settings.pinecone_image_index,
            dimension=512,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
        logger.info("Waiting for image index to initialise...")
        time.sleep(10)

    index = pc.Index(settings.pinecone_image_index)

    vectors = []
    for attraction in tqdm(ATTRACTIONS, desc="Encoding images"):
        name = attraction["name"]
        if name not in name_to_id or not attraction.get("image_url"):
            continue
        attr_id = name_to_id[name]
        image_url = attraction["image_url"]

        embedding = download_and_encode_image(
            image_url, preprocess, clip_model, device
        )
        if embedding is None:
            # Fallback: encode the attraction name+category as text via CLIP
            logger.info("Using CLIP text fallback for: %s", name)
            tokens = clip.tokenize([f"{name}, {attraction['category']}, Sri Lanka"]).to(device)
            with torch.no_grad():
                emb = clip_model.encode_text(tokens)
                emb = emb / emb.norm(dim=-1, keepdim=True)
            embedding = emb.squeeze().cpu().tolist()

        vectors.append({
            "id": str(attr_id),
            "values": embedding,
            "metadata": {
                "name": name,
                "category": attraction["category"],
                "district": attraction["district"],
                "image_url": image_url,
            },
        })

    # Upsert in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        logger.info("Upserted image batch %d-%d", i, i + len(batch))

    logger.info("Image embeddings upserted: %d vectors.", len(vectors))


# ─────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("╔══════════════════════════════════════════╗")
    logger.info("║        LankaRAG Data Ingestion           ║")
    logger.info("╚══════════════════════════════════════════╝")

    # Validate environment
    if not settings.pinecone_api_key:
        logger.error("PINECONE_API_KEY is not set. Check your .env file.")
        sys.exit(1)

    # Step 1: Seed PostgreSQL
    name_to_id = seed_postgres()

    # Step 2: Text embeddings → Pinecone
    upsert_text_embeddings(name_to_id)

    # Step 3: Image embeddings → Pinecone
    upsert_image_embeddings(name_to_id)

    logger.info("")
    logger.info("✅ Ingestion complete!")
    logger.info("   Attractions in PostgreSQL: %d", len(name_to_id))
    logger.info("   Run the backend: uvicorn main:app --reload")


if __name__ == "__main__":
    main()
