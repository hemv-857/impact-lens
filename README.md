# ImpactLens

AI-powered impact & sustainability media platform. Ingest field media (images/video), let AI extract captions, tags, signals and confidence, organize by project, compare before/after, run semantic search, and generate impact reports and campaign content.

## Stack

- **Next.js 16 (App Router) + TypeScript**, standalone output for production
- **Tailwind CSS + shadcn/ui**, Framer Motion, Zustand, TanStack Query
- **Prisma + SQLite** (single-file DB, no external services)
- **NextAuth** credentials auth (scrypt) with per-user org scoping
- **AI**: any OpenAI-compatible endpoint — presets for Gemini, OpenRouter, OpenAI, Groq (`AI_PROVIDER`); vision analysis, semantic search, reports, campaigns; video analyzed via ffmpeg frame sampling
- **Storage**: Cloudinary (`CLOUDINARY_URL`) with automatic fallback to local `./uploads` (private, served only via the org-checked `/uploads/[name]` route)
- **ffmpeg** on PATH enables video analysis (tests skip it when missing)

## Quick start

```bash
npm install
cp .env .env.local          # then edit .env.local — see below
npm run db:push             # create/update SQLite schema
npm run dev                 # http://localhost:3000
```

No database is committed (`db/*.db` is gitignored). For demo data, copy the sanitized e2e fixture — test-only users, no invite codes or share tokens:

```bash
cp e2e/fixtures/seed.db db/custom.db   # ada@example.org (owner), bob@example.org (other org), cara@example.org (member)
```

Never point production at the fixture: its demo passwords are public. Production starts from a fresh `db:push` schema.

## Environment (`.env.local`, gitignored)

| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | session signing key (required in production) |
| `AI_PROVIDER` | `gemini` \| `openrouter` \| `openai` \| `groq` (default in `.env`) |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `AI_API_KEY` | provider key for the chosen preset |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud-name` — uploads go to the CDN; unset ⇒ local fallback |
| `CRON_SECRET` | shared secret gating `POST /api/cron/reports` |
| `EMAIL_*` | optional scheduled-report email delivery |
| `SLACK_WEBHOOK_URL` | optional Slack incoming webhook for cron run summaries |

`.env` carries non-secret defaults only; secrets never enter git.

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
```

The e2e suite expects the production server on **http://127.0.0.1:3002** (port 3001 is reserved for another project):

```bash
npm run build
DATABASE_URL="file:$(pwd)/db/custom.db" NODE_ENV=production PORT=3002 node .next/standalone/server.js &
npm run test:e2e
```

## Tests

`e2e/audit-*.spec.ts` — 57 checks across five files (incl. AI usage meter, share dialog + links, dark mode):

- **ui** — library, compare, reports, search, campaign flows
- **ux** — auth journey, dialogs, palette, custom 404, console-error watch
- **backend** — auth/scoping, invite codes, Cloudinary uploads, cron/CSRF guards
- **feasibility** — build/config invariants (types gate the build, gitignored media, queue/DB tradeoffs)
- **capability** — live AI: search, reports, vision, video frames, image generation (gracefully skipped while the free-tier AI budget is dry)

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

## Operational notes

- API routes are individually protected via `getAuthContext()`; the middleware only guards pages.
- Uploads cap at ~10 MB (413); runtime uploads are served by `/uploads/[name]` (no restart needed).
- Joining an existing org requires an invite code — owners copy/regenerate it from the account menu.
- Media delete removes the local file or the Cloudinary object (best-effort).
