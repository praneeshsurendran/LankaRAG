# LankaRAG 🌴

> **Multimodal Multi-Source Retrieval-Augmented Generation** for Sri Lanka Tourism

An intelligent travel guide powered by PostgreSQL, Pinecone, Google Gemini, and OpenAI CLIP — with a Next.js frontend and a service-oriented FastAPI backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (Port 3000)                     │
│  Atomic Design: atoms/ molecules/ organisms/                            │
│  Modular API: lib/api/  •  Custom Hooks: hooks/                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP (REST)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Port 8000)                         │
│                    app/api/v1/endpoints/                                │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ structured  │ │  semantic   │ │ image_search │ │    hybrid      │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬───────┘ └───────┬────────┘  │
│         │               │               │                  │           │
│         └───────────────┴───────────────┴──────────────────┘           │
│                              app/services/                              │
│  ┌──────────────┐  ┌────────────────┐  ┌───────────────────────────┐   │
│  │  sql_service │  │ vector_service │  │      rag_service          │   │
│  │  (Gemini     │  │ (Pinecone      │  │  (asyncio.gather +        │   │
│  │   Text→SQL)  │  │  queries)      │  │   Gemini synthesis)       │   │
│  └──────┬───────┘  └───────┬────────┘  └────────────┬──────────────┘   │
│         │                  │                         │                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   embedding_service                              │   │
│  │   SentenceTransformer (all-MiniLM-L6-v2, dim=384)               │   │
│  │   CLIP ViT-B/32 (dim=512) — async httpx image fetching          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────┬─────────────────────────────────────────────────────────────-─┘
          │
    ┌─────┴──────────────────────────────────────────┐
    │                                                │
    ▼                                                ▼
PostgreSQL (Docker)                           Pinecone (Serverless)
structured facts                    lankarag-text  (dim=384, cosine)
tourist_attractions table           lankarag-images (dim=512, cosine)
```

### 4 Query Pipelines

| Method | Endpoint | Pipeline |
|--------|----------|----------|
| `POST` | `/api/v1/query/structured` | Natural language → Gemini Text-to-SQL → PostgreSQL |
| `POST` | `/api/v1/query/semantic` | Query → SentenceTransformer → Pinecone text index |
| `POST` | `/api/v1/query/image-search` | Image URL / text → CLIP → Pinecone image index |
| `POST` | `/api/v1/query/hybrid` | All 3 streams (concurrent) → Gemini LLM synthesis |

---

## Quick Start

### Prerequisites

- Docker Desktop (for PostgreSQL)
- Python 3.11+
- Node.js 20+
- [Pinecone](https://www.pinecone.io/) account (free Serverless tier)
- [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

### 1. Clone & Configure

```bash
git clone <repo>
cd LankaRAG
cp .env.example .env
# Edit .env — fill in PINECONE_API_KEY and GEMINI_API_KEY
```

### 2. Start PostgreSQL

```bash
docker compose up -d

# Verify it's healthy:
docker compose ps
```

### 3. Backend — Create Virtual Environment & Install

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# Install CLIP (not on PyPI — from GitHub):
pip install git+https://github.com/openai/CLIP.git
```

### 4. Seed the Database & Vector Indexes (one-time)

```bash
# Ensure .env is configured and Postgres is running
python scripts/ingest.py
```

This script will:
- Create the `tourist_attractions` table in PostgreSQL
- Seed 25 Sri Lanka attractions (beaches, waterfalls, temples, parks, historical sites)
- Create Pinecone indexes if they don't exist:
  - `lankarag-text` — dim `384`, cosine (sentence-transformers)
  - `lankarag-images` — dim `512`, cosine (CLIP ViT-B/32)
- Upsert text + image embeddings for every attraction

### 5. Start the Backend

```bash
# From backend/ with .venv activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs (Swagger UI): http://localhost:8000/docs
- Health check: http://localhost:8000/health
- API root: http://localhost:8000/

### 6. Start the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Running the Test Suite

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# Unit tests only (no HTTP, no external calls)
pytest tests/services/ -v

# API integration tests only
pytest tests/api/ -v

# With coverage
pytest tests/ -v --cov=app --cov-report=term-missing
```

All external integrations (Pinecone, Gemini, PostgreSQL) are mocked via `unittest.mock` — no network calls required to run tests.

---

## Project Structure

```
LankaRAG/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI entry point (uvicorn app.main:app)
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py         # Aggregates all 4 endpoint routers
│   │   │       └── endpoints/
│   │   │           ├── structured.py # Route handler → sql_service
│   │   │           ├── semantic.py   # Route handler → embedding + vector service
│   │   │           ├── image_search.py # Route handler → embedding + vector service
│   │   │           └── hybrid.py     # Route handler → rag_service
│   │   ├── core/
│   │   │   ├── config.py             # pydantic-settings (env vars, DB URLs)
│   │   │   └── db.py                 # Async SQLAlchemy engine + Pinecone client
│   │   ├── models/
│   │   │   └── attraction.py         # SQLAlchemy 2.0 ORM model
│   │   ├── schemas/
│   │   │   ├── attraction.py         # Shared AttractionResult Pydantic schema
│   │   │   └── query.py              # Request/response schemas for all endpoints
│   │   └── services/                 # All business logic lives here
│   │       ├── embedding_service.py  # SentenceTransformer + CLIP singletons
│   │       ├── vector_service.py     # Pinecone queries + DB hydration
│   │       ├── sql_service.py        # Gemini Text-to-SQL + safety validation
│   │       └── rag_service.py        # Hybrid RAG orchestration + Gemini synthesis
│   ├── scripts/
│   │   ├── ingest.py                 # One-time data ingestion pipeline
│   │   └── init.sql                  # Optional DDL for Docker init
│   ├── tests/
│   │   ├── conftest.py               # Shared mocks (Pinecone, Gemini, DB)
│   │   ├── api/
│   │   │   └── test_endpoints.py     # HTTP integration tests (17 cases)
│   │   └── services/
│   │       └── test_rag.py           # Service unit tests (20 cases)
│   ├── pytest.ini                    # asyncio_mode = auto
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── layout.tsx                # Root layout + SEO metadata
    │   ├── page.tsx                  # Main dashboard — orchestrates hooks + UI
    │   └── globals.css               # Design system (navy/emerald theme)
    ├── components/
    │   ├── atoms/                    # Button, Badge, Typography, Input
    │   ├── molecules/                # QuerySelector, SearchBar, FilterTags
    │   └── organisms/                # SearchPanel, ResultsPanel, ImageUploader,
    │                                 # ResultsSection, AttractionCard
    ├── hooks/                        # Custom React hooks (one per endpoint)
    │   ├── useStructuredQuery.ts
    │   ├── useSemanticQuery.ts
    │   ├── useImageQuery.ts
    │   └── useHybridQuery.ts
    ├── lib/api/                      # Modular API service layer
    │   ├── client.ts                 # Base HTTP client + ApiError class
    │   ├── types.ts                  # Shared TypeScript types
    │   ├── structured.ts
    │   ├── semantic.ts
    │   ├── image.ts
    │   └── hybrid.ts
    └── utils/
        └── cn.ts                     # clsx + tailwind-merge utility
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

| Variable | Description |
|---|---|
| `POSTGRES_USER` | PostgreSQL username (default: `lankarag`) |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name (default: `lankarag_db`) |
| `POSTGRES_HOST` | Host (default: `localhost`) |
| `POSTGRES_PORT` | Port (default: `5432`) |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_ENVIRONMENT` | Pinecone cloud region (default: `us-east-1`) |
| `PINECONE_TEXT_INDEX` | Index name for text embeddings (default: `lankarag-text`) |
| `PINECONE_IMAGE_INDEX` | Index name for image embeddings (default: `lankarag-images`) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_MODEL` | Gemini model (default: `gemini-1.5-flash`) |
| `NEXT_PUBLIC_API_URL` | Backend URL for the frontend (default: `http://localhost:8000`) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, lucide-react |
| **Backend** | FastAPI, Python 3.11+, Uvicorn |
| **ORM** | SQLAlchemy 2.0 (async), asyncpg |
| **Relational DB** | PostgreSQL 15 (Docker) |
| **Vector DB** | Pinecone Serverless (two indexes) |
| **Text Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (dim=384) |
| **Image Embeddings** | OpenAI CLIP `ViT-B/32` (dim=512) |
| **LLM** | Google Gemini 1.5 Flash via LangChain |
| **Testing** | pytest, pytest-asyncio, httpx |
