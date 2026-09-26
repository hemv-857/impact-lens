# ImpactLens — End-to-End Audit vs Problem Statement 02

**Date:** 2026-09-26 · **Method:** Playwright suite (`e2e/`, 45 tests across UI / UX / Backend / Feasibility / Capability) against a production build (`next build` + standalone server) on `localhost:3001`, live Gemini calls, plus source & filesystem probes.

**Re-run:** `npm run test:e2e` with the server up:

```bash
set -a; source .env; source .env.local; set +a
DATABASE_URL="file:$(pwd)/db/custom.db" NODE_ENV=production PORT=3001 bun .next/standalone/server.js &
npx playwright test
```

**Result:** 41 passed · 4 skipped (Gemini free-tier quota exhausted mid-session — those capability tests were green earlier in the same session) · 0 failed.

---

## 1. PS 02 requirement matrix

| # | PS requirement | Status | Evidence |
|---|---|---|---|
| R1 | Analyze & organize image + video evidence | **PARTIAL** | Images: upload → VLM analysis → tags/signals/confidence live (88–96% observed). Video: upload accepts mp4/webm/mov/mkv, but **analysis fails** on the default provider (F3). |
| R2 | Identify projects / activities / locations / visual signals | **COVERED** | 10 projects with locations + SDGs; activity/location/category/signals/objects/mood columns AI-populated; counts verified (13 assets / 10 projects / 9 reports). |
| R3 | Before/after comparison | **COVERED** | Pickers + "Generate comparison" + history with % impact scores (seeded 65%/75%; vision call live-tested). |
| R4 | Visual reports / summaries / campaign content | **COVERED** | 4 report types; summary narrative >200 chars generated live; campaign studio (Instagram/Twitter/LinkedIn/Newsletter) generated live. |
| R5 | AI metadata / tagging / semantic search | **COVERED** | Captions, tags, confidence, OCR/mood/objects; semantic search returns ranked hits with score + reason (live); saved searches. |
| R6 | Traceability to originals & transformations | **COVERED** | Asset drawer "Evidence chain" (upload → ai-analyze steps with timestamps); CSV export includes `originalUrl` + `publicId`. |
| R7 | **Built on Cloudinary** (explicit PS mandate) | **NOT MET** | Zero Cloudinary: no npm dep, no usage in `src/`, no config (asserted by feasibility test). Storage = local `public/uploads`. See F2. |

## 2. Findings (severity-ranked)

### High

**F1 — Default Media Library shows only unverified assets (1 of 13).**
`LibraryTab.tsx:117-118` always sends `verified=false&favorite=false` while the toggles are off; `GET /api/media` treats `verified=false` as a hard filter. Evidence: captured default request `…/api/media?…verified=false&favorite=false…`; the Export CSV link href carries the same params, so exports are truncated too.
→ **Fix:** `verified: verifiedOnly || undefined, favorite: favoritesOnly || undefined` (two lines). The `audit-ui` GAP test flips to a PASS check once fixed.

**F2 — Cloudinary mandate not implemented (PS 02 core).**
No `cloudinary` dependency, no source usage, no config. Media lives on local disk (`public/uploads`); no CDN, no server-side image/video transformations.
→ Fix plan: Phase 2 below. Schema already has `publicId` + `originalUrl`, which map 1:1 onto Cloudinary.

**F3 — Video analysis broken on the default provider.**
`AI_PROVIDER=gemini` (OpenAI-compat endpoint) rejects `video_url` content parts → `POST /api/analyze/[id]` returns 500 (`Invalid content part type: video_url`). Videos upload but never gain metadata. Evidence: `audit-capability` GAP test (green live this session).
→ **Fix (ready):** `openrouter` provider preset added in `src/lib/ai.ts` — OpenRouter accepts base64 `video_url` parts. Set `OPENROUTER_API_KEY` and use `AI_PROVIDER=openrouter` (or per-asset routing) for video; alternatively implement native Gemini file-upload.

### Medium

**F4 — Sign-out redirects to `http://localhost:3000/auth`.** `NEXTAUTH_URL` is unset → NextAuth falls back to its default origin; verified by the UX test landing on :3000 (a foreign dev server answered 404). Breaks on any non-default port/host, deployments included.
→ **Fix:** set `NEXTAUTH_URL` in env (or derive sign-out URL from request origin).

**F5 — Image generation blocked: free-tier quota** (`generate_content_free_tier_requests`, limit 20 on the current key) → `POST /api/media/generate` 502s.
→ **Fix:** enable billing on the Gemini key, or point `imageModel` at an OpenRouter image model.

**F6 — No server-side upload size limit.** 10 MB data-URL accepted end-to-end (feasibility test creates then deletes a 7.5 MB file). UI copy promises ~10 MB; the server validates only data-URL shape → memory/disk abuse vector.
→ **Fix:** reject bodies >10 MB and unexpected MIME types in `POST /api/media` (~10 lines + flip the feasibility GAP test).

**F7 — `public/uploads/` not git-ignored.** A plain `git add .` would commit user media.
→ **Fix:** add `public/uploads/` to `.gitignore`.

**F8 — Type errors ignored at build** (`next.config.ts` `typescript.ignoreBuildErrors: true`; 4 pre-existing tsc errors: `examples/websocket/*`, `CompareTab.tsx`, `DateRangeFilter.tsx`, `media/bulk/route.ts`).
→ **Fix:** fix the 4 errors, set `ignoreBuildErrors: false`, gate CI on `npx tsc --noEmit`.

**F9 — Open org join by name.** Signup field doubles as a join code: anyone typing an existing org name joins that org as a member (`api/auth/signup/route.ts:63-68`, carries a `ponytail:` note).
→ **Fix when public:** invite tokens/links (upgrade path already noted in code).

### Low

**F10 — Auth error detail leak (observed live).** With the DB unreachable during this audit, the sign-in toast surfaced the raw Prisma error text. `authorize()` exceptions should map to a generic message.
**F11 — Command palette a11y/discoverability:** bare `motion.div` without `role="dialog"`/`aria-modal`; footer says "⌘K" while the trigger button says "K" (plain K does nothing). UploadDialog itself is Radix (fine).
**F12 — Missing favicon** → 404 console noise on every page load.
**F13 — Scale posture:** SQLite single file + no job queue; AI analysis runs inside the HTTP request. Fine for demo/eval; Postgres + worker only when multi-instance (defer until then).

## 3. What passed (regression baseline)

- **Backend:** 401 on every core API unauthenticated; org scoping (owner sees 13/10/9, other-org owner sees 0/0 and 404 on ids); project create/delete roundtrip; CSV export with traceability columns; cron secret gate (401 / 401 / 200); forged cookie rejected; weak-password signup → 400.
- **UX:** auth redirect with callback, bad-credential error toast, 8-char password policy (client `minlength` + server 400), login happy path, ⌘K palette, upload dialog accepts video, account menu + sign-out, clean console (documented benign exceptions only).
- **UI:** all 8 views render expected copy; drawer shows AI caption + Evidence chain; project map; compare history; reports viewer opens past reports.
- **Capability (live this session):** semantic search with scores+reasons, summary report narrative, before/after vision scoring, campaign generation, video-rejection GAP, image-gen quota GAP.

## 4. Fix plan

**Phase 1 — quick wins (< 1 h):** F1 (2 lines), F7 (1 line), F4 (env), F6 (size guard), F10 (generic auth error), F12 (icon).
**Phase 2 — PS compliance:** F2 Cloudinary: account → `cloudinary` SDK → upload pipeline (server-side upload with `resource_type: auto`, persist `publicId`/`originalUrl`, serve transformed CDN URLs `f_auto,q_auto`; comparison/report images from Cloudinary) with `public/uploads` as dev fallback. F3: wire `OPENROUTER_API_KEY`, route video analysis through OpenRouter. F5: billing or alternate image model.
**Phase 3 — hardening:** F8 (fix 4 tsc errors, flip flag), F9 (invite tokens), F11 (dialog roles + kbd label), F13 only if deploying multi-instance.

## 5. Test inventory

| Aspect | File | Tests |
|---|---|---|
| UI | `e2e/audit-ui.spec.ts` | 11 |
| UX | `e2e/audit-ux.spec.ts` | 8 |
| Backend | `e2e/audit-backend.spec.ts` | 9 |
| Feasibility | `e2e/audit-feasibility.spec.ts` | 11 |
| Capability (live AI) | `e2e/audit-capability.spec.ts` | 6 |

Live-AI tests retry transient 503s and self-skip when the Gemini free-tier quota is exhausted (capability evidence preserved in this document).

## 6. Resolution status

**Fixed — code + tests flipped, suite green:**

| Finding | Fix |
|---|---|
| F1 | Library + export default query drop `verified`/`favorite` params — grid shows every asset |
| F4 | Sign-out uses `signOut({ redirect: false })` + relative `/auth` navigation (origin-safe without NEXTAUTH_URL) |
| F6 | `POST /api/media` rejects data-URLs past the ~10MB binary cap with 413 |
| F7 | `public/uploads/` git-ignored; previously tracked upload untracked |
| F8 | All 4 type errors fixed (tsconfig excludes `examples`; CompareTab/DateRange/bulk types), `ignoreBuildErrors: false` — `tsc --noEmit` exits 0 and gates the build |
| F10 | `authorize()` wraps DB access in try/catch → returns null, never leaks storage errors |
| F11 | Command palette carries `role="dialog" aria-modal="true"` (header badge already renders ⌘ via the Command icon) |
| F12 | `src/app/favicon.ico` added |
| F3 (partial) | Video failures now append an actionable `OPENROUTER_API_KEY` hint; live run still requires the key |

**Fixed as a by-product of the suite:** runtime uploads 404'd until server
restart (Next indexes `public/` only at boot) — added a streaming
`GET /uploads/[name]` route with path-traversal guard.

**Blocked on credentials / decision:**
- F2 Cloudinary — needs account credentials (`CLOUDINARY_URL`)
- F3 live video verification — needs `OPENROUTER_API_KEY` in `.env.local`
- F5 image generation — Gemini free tier 429; needs billing or a different image provider
- F9 org join-by-name — product decision (invite tokens required)
