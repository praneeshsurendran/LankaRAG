# LankaRAG frontend

Next.js App Router dashboard for the LankaRAG tourism search backend. See the [project README](../README.md) for the complete architecture, ingestion and RAG flow, API contracts, configuration, and limitations.

## Run locally

Use Node.js 22.13+ and npm. Start and populate the FastAPI backend using the root README, then run from this directory:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Set the API base URL in `frontend/.env.local` if needed:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The API client defaults to that localhost URL. Restart development after changing it; for production, set it before building. The backend's `CORS_ORIGINS` must include the frontend's origin.

## Source layout

- `app/`: the single active routing tree; `page.tsx` orchestrates searches, `layout.tsx` defines metadata and Inter/Outfit fonts, and `globals.css` supplies the theme.
- `components/`: atoms, molecules, and organisms for the four search modes, image input, and result display.
- `hooks/`: loading, data, and error state for each query endpoint.
- `lib/api/`: typed requests/responses, endpoint services, and shared JSON HTTP client.
- `utils/cn.ts`: class-name merging helper.

The unused `src/app/` Create Next App scaffold was removed. Keep routes in `app/`; `@/*` imports resolve from the frontend root.

## Checks and production build

```bash
npm run lint
npx tsc --noEmit
npm run build
npm start
```

The build uses `next/font/google` and needs network access to fetch Inter and Outfit. The backend runs as a separate process.
