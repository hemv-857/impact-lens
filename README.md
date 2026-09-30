# ImpactLens

ImpactLens is a media platform for impact and sustainability organizations. Teams upload photos and videos from the field, and the AI writes captions, adds tags, and records the signals it found along with a confidence score. From there you can group media by project, compare before and after shots, search in plain language, and generate impact reports and campaign content.

## Business model

- [Pricing model](https://docs.google.com/spreadsheets/d/1WIFK6_iso3vl1DMP3qsm1B_FH52WUs_3/edit?usp=sharing&ouid=114034518876045891640&rtpof=true&sd=true) (Google Sheets)
- [GTM and pricing model](https://docs.google.com/spreadsheets/d/1zhHMH68bsirOe_k4w5NPLzqI39sQeLjb/edit?usp=sharing&ouid=114034518876045891640&rtpof=true&sd=true) (Google Sheets)

Local copies of both workbooks are in `docs/`, next to the competitive landscape write-up.

## Stack

- Next.js 16 (App Router) and TypeScript, built as standalone output for production
- Tailwind CSS with shadcn/ui, Framer Motion, Zustand and TanStack Query
- Prisma with SQLite: a single-file database with no external services
- NextAuth credentials login (scrypt), with every user scoped to an organization
- AI through any OpenAI-compatible endpoint. `AI_PROVIDER` has presets for Gemini, OpenRouter, OpenAI and Groq. The AI handles vision analysis, semantic search, reports and campaigns, and analyzes video by sampling frames with ffmpeg.
- Storage on Cloudinary (`CLOUDINARY_URL`). Without it, uploads fall back to a private local `./uploads` folder, served only through the org-checked `/uploads/[name]` route.
- ffmpeg on the PATH enables video analysis. Tests skip video when it is missing.

## Quick start

```bash
npm install
cp .env .env.local          # then edit .env.local — see below
npm run db:push             # create/update SQLite schema
npm run dev                 # http://localhost:3000
```

The repository ships without a database (`db/*.db` is gitignored). For demo data, copy the sanitized e2e fixture. It contains test users only, with no invite codes or share tokens:

```bash
cp e2e/fixtures/seed.db db/custom.db   # ada@example.org (owner), bob@example.org (other org), cara@example.org (member)
```

Do not use the fixture in production, because its demo passwords are public. A production install starts from a fresh `db:push` schema.

## Environment (`.env.local`, gitignored)

| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | Session signing key. Required in production. |
| `AI_PROVIDER` | `gemini` \| `openrouter` \| `openai` \| `groq` (default set in `.env`) |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `AI_API_KEY` | API key for the chosen provider |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud-name`. When set, uploads go to the CDN. When unset, they use the local fallback. |
| `CRON_SECRET` | Shared secret that protects `POST /api/cron/reports` |
| `AI_DAILY_CALL_CAP` | Maximum provider calls per org in a rolling 24 hours (default `2000`; `0` turns the cap off) |
| `EMAIL_*` | Optional email delivery for scheduled reports |
| `SLACK_WEBHOOK_URL` | Optional Slack incoming webhook for cron run summaries |

`.env` holds non-secret defaults only. Secrets stay out of git.

## Scripts

```bash
npm run dev        # dev server on :3000
npm run build      # production build (standalone + static/public copy)
npm start          # run the standalone build (defaults to :3000)
npm run lint       # eslint
npm run test:e2e   # Playwright suite — start the prod server on :3002 first
npm run db:push    # sync schema to db/custom.db
bun scripts/ai-smoke.ts      # self-stubbed AI client contract check (no keys)
bun scripts/notify-smoke.ts  # email + Slack contract check (no network)
bun scripts/db-smoke.ts      # libSQL/Turso adapter round-trip against a scratch DB
```

The e2e suite runs against the production server at http://127.0.0.1:3002. Port 3001 is reserved for another project.

```bash
npm run build
DATABASE_URL="file:$(pwd)/db/custom.db" NODE_ENV=production PORT=3002 node .next/standalone/server.js &
npm run test:e2e
```

## Tests

The `e2e/` folder holds the audit specs, the security specs (`sec-p*`) and the production-readiness spec (`prod-readiness`): 80 checks in total, 72 of which run without an AI key. `scripts/ai-smoke.ts` uses a stubbed provider to cover the AI client contract, output validation and search ranking.

The audit specs cover:

- ui: library, compare, reports, search and campaign flows
- ux: the sign-in journey, dialogs, the command palette, the custom 404 page, and a console-error watch
- backend: auth and org scoping, invite codes, Cloudinary uploads, and the cron and CSRF guards
- feasibility: build and config invariants (types block the build, media stays gitignored, queue and database trade-offs)
- capability: live AI for search, reports, vision, video frames and image generation. These tests skip cleanly when the free-tier AI budget runs out.

## Project layout

```
src/app          routes: pages, API handlers, auth, not-found
src/components   impactlens feature components + shadcn ui
src/lib          ai, auth, db, cloudinary, serialize, store
prisma           schema.prisma (SQLite)
e2e              Playwright audit suite
public           static assets
uploads          local upload fallback (gitignored, private)
db/custom.db     seeded SQLite database
AUDIT.md         audit findings + resolution status
```

## Deploy

On both Vercel and Render the app itself is stateless. It depends on two services: a database, and Cloudinary for uploads.

| | Vercel | Render |
|---|---|---|
| Config | `vercel.json`: build command and a daily cron | `render.yaml`: a Blueprint with build, start, env and health check |
| Database | Turso is required. Vercel's filesystem is read-only, so `db/custom.db` can't be used. | The local `db/custom.db` works, but data resets on each deploy. Turso is recommended. |
| Uploads | Cloudinary is required, because the `./uploads` fallback can't write. | Same: set `CLOUDINARY_URL`. |

One-time setup:

```bash
# 1. Turso (free tier) — schema lives in prisma/turso-init.sql, regenerated from schema.prisma
turso db create impactlens
turso db shell impactlens < prisma/turso-init.sql
turso db show impactlens --url            # -> TURSO_DATABASE_URL
turso db tokens create impactlens         # -> TURSO_AUTH_TOKEN
```

2. Cloudinary: set `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`. Uploads then go to the CDN. Without it, uploads on Vercel return a 500.
3. Vercel: import the repository and set the environment variables listed below. `vercel.json` schedules `GET /api/cron/reports` daily at 06:00 UTC, and Vercel sends `Authorization: Bearer $CRON_SECRET` with the request automatically.
4. Render: choose New → Blueprint and select this repository. `render.yaml` declares the environment variables; secrets are either `sync: false` or generated.

Environment variables for both platforms: `NEXTAUTH_SECRET` (required), `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (required on Vercel), `CLOUDINARY_URL`, `CRON_SECRET`, `AI_PROVIDER` with its key (`GEMINI_API_KEY`, `AI_API_KEY` and so on), and optionally `EMAIL_*` and `SLACK_WEBHOOK_URL`.

Video analysis needs `ffmpeg` on the PATH. Vercel doesn't provide it, so video uploads succeed there but their analysis is recorded as `failed`. On Render without Turso, the build command runs `prisma db push` and rebuilds the schema on every deploy, so treat that database as disposable.

## Operational notes

- Each API route checks access itself through `getAuthContext()`. The middleware guards pages only.
- Uploads are capped at about 10 MB and larger files get a 413. Files uploaded at runtime are served by `/uploads/[name]` without a restart.
- Joining an existing org requires an invite code. Owners can copy or regenerate it from the account menu.
- Deleting media also removes the local file or the Cloudinary object, on a best-effort basis.
- `GET /api/health` is an unauthenticated liveness and database probe. It returns 200 `ok` or 503 `unavailable`.
- When the AI provider fails, search falls back to keyword ranking and returns `degraded: true`. AI output that isn't valid JSON is rejected and never stored as a result.
- Cloudinary uploads keep the untouched original in `originalUrl`, read the capture date from EXIF, and show 640 px previews in grids.
