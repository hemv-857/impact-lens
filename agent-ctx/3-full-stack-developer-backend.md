# Task ID 3 — full-stack-developer (backend)

## Summary
Built all backend API routes for ImpactLens. Files created:

### Library
- `src/lib/serialize.ts` — Prisma → frontend type converters (`serializeAsset`, `serializeProject`, `serializeReport`, `serializeComparison`). Handles JSON parsing of `signals`/`objects`/`transformations`, splitting `tagsCsv`, Date→ISO conversion, and `assetCount` aggregation from `_count.assets`.

### API routes (all under `src/app/api/`)
| Method | Path | File |
|---|---|---|
| GET | `/api/analytics` | `analytics/route.ts` |
| GET, POST | `/api/media` | `media/route.ts` |
| GET, DELETE | `/api/media/[id]` | `media/[id]/route.ts` |
| POST | `/api/analyze/[id]` | `analyze/[id]/route.ts` |
| GET, POST | `/api/projects` | `projects/route.ts` |
| GET, PATCH, DELETE | `/api/projects/[id]` | `projects/[id]/route.ts` |
| POST | `/api/compare` | `compare/route.ts` |
| GET | `/api/comparisons` | `comparisons/route.ts` |
| POST | `/api/report` | `report/route.ts` |
| GET | `/api/reports` | `reports/route.ts` |
| POST | `/api/search` | `search/route.ts` |
| POST | `/api/campaign` | `campaign/route.ts` |
| POST | `/api/seed` | `seed/route.ts` |

## Key decisions / edge cases
- **Media POST** decodes `data:` URLs via `saveUpload`, derives `format` from extension when given a real URL, generates `publicId` as `impactlens/<ts>-<rand>`, and supports `autoAnalyze` to run VLM inline.
- **Analyze POST** parses the existing `transformations` JSON array, appends `{type:'ai-analyze', at, note:'VLM analysis'}`, and re-serializes — never overwrites prior steps.
- **Compare POST** returns `{...ComparisonResult, before: MediaAsset, after: MediaAsset}` as the frontend contract expects. Since the Prisma Comparison model doesn't declare `@relation` back to MediaAsset, `/api/comparisons` GET fetches referenced assets in a second query and stitches them client-side.
- **Search POST** reduces analyzed assets to the lightweight `semanticSearch` shape, calls the LLM scorer, then fetches full MediaAsset rows for the top-N hit ids (preserving LLM score order).
- **Campaign POST** validates platform ∈ {instagram, twitter, linkedin, newsletter}, builds a platform-specific audience hint, prepends `[Instagram]` etc. to the title, appends `(Channel: …)` to the call-to-action, and stores `platform` + `channel` in the metrics JSON.
- **Seed POST** iterates over `SPECS` (12 images across 10 projects), skips files not yet on disk and existing URLs (idempotent re-runs), creates projects with unique slugs, sets `pairGroup`/`pairRole` for the reforest + garden before/after pairs, and runs VLM analysis sequentially. Each VLM failure is swallowed and recorded as a `failed:` note in `transformations` so the seed continues.
- **Slug uniqueness** in `projects/route.ts` and `seed/route.ts` uses a `while(true)` probe loop.
- All routes wrap DB/SDK calls in `try/catch` and return `{error}` with proper status codes (400 / 404 / 500).
- Used `Prisma.MediaAssetWhereInput` / `Prisma.MediaAssetOrderByWithRelationInput` for type-safe query building in `media/route.ts`.

## Verification
- `bun run lint` → 0 errors (only 3 pre-existing warnings in frontend files I didn't own).
- Smoke-tested against running dev server:
  - `GET /api/analytics` → 200 with full Analytics shape.
  - `GET /api/projects`, `/api/media`, `/api/reports`, `/api/comparisons` → 200 `[]`.
  - `POST /api/search` (empty DB) → 200 `{hits:[]}`.
  - `POST /api/compare` (missing fields) → 400.
  - `POST /api/campaign` (invalid platform) → 400.
  - `POST /api/media` (missing url) → 400.
  - `POST /api/projects` (create) → 201 with `assetCount:0`; `DELETE` → 200; subsequent GET shows the list back to `[]`.
- Frontend subagent can consume the exact shapes from `src/lib/types.ts` (MediaAsset[] / Project / Report / ComparisonResult / Analytics) via `serializeAsset` / `serializeProject` / `serializeReport` / `serializeComparison`.
