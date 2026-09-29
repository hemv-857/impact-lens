# ImpactLens — End-to-End Audit vs Problem Statement 02

**Date:** 2026-09-26 (rev. 2) · **Method:** Playwright suite (`e2e/`, 50 tests across UI / UX / Backend / Feasibility / Capability) against a production build (`next build` + standalone server) on `localhost:3001`, live OpenRouter/Gemini calls, plus independent security & code reviews of the full source.

**Re-run:** `npm run test:e2e` with the server up:

```bash
set -a; source .env; source .env.local; set +a
DATABASE_URL="file:$(pwd)/db/custom.db" NODE_ENV=production PORT=3001 bun .next/standalone/server.js &
npx playwright test
```

**Result:** 44 passed · 6 skipped (OpenRouter free budget drained — those live capability tests were green earlier in the same session) · 0 failed.

**Rev. 2 adds:** two independent review passes (security-reviewer: 1 CRITICAL / 3 HIGH / 6 MEDIUM / 10 LOW; code-reviewer: 1 CRITICAL / 4 HIGH, verdict BLOCK), all CRITICAL/HIGH fixes applied and gated, F2/F3/F9 resolutions, README, custom 404 page. Resolution details in §6; deferred items in §7.

---

## 1. PS 02 requirement matrix

| # | PS requirement | Status | Evidence |
|---|---|---|---|
| R1 | Analyze & organize image + video evidence | **COVERED** | Images: upload → VLM analysis → tags/signals/confidence live (88–96% observed). Video: ≤6 frames sampled with ffmpeg → vision parts → live caption + confidence (F3 fixed). |
| R2 | Identify projects / activities / locations / visual signals | **COVERED** | 10 projects with locations + SDGs; activity/location/category/signals/objects/mood columns AI-populated; counts verified (13 assets / 10 projects / 9 reports). |
| R3 | Before/after comparison | **COVERED** | Pickers + "Generate comparison" + history with % impact scores (seeded 65%/75%; vision call live-tested). |
| R4 | Visual reports / summaries / campaign content | **COVERED** | 4 report types; summary narrative >200 chars generated live; campaign studio (Instagram/Twitter/LinkedIn/Newsletter) generated live. |
| R5 | AI metadata / tagging / semantic search | **COVERED** | Captions, tags, confidence, OCR/mood/objects; semantic search returns ranked hits with score + reason (live); saved searches. |
| R6 | Traceability to originals & transformations | **COVERED** | Asset drawer "Evidence chain" (upload → ai-analyze steps with timestamps); CSV export includes `originalUrl` + `publicId`. |
| R7 | **Built on Cloudinary** (explicit PS mandate) | **COVERED** | Uploads go through `uploadToCloudinary()` (`f_auto,q_auto` CDN URLs, `publicId` persisted); delete removes the CDN object; local `public/uploads` remains the dev/offline fallback. Feasibility test asserts integration. |

## 2. Findings (severity-ranked)

### High

*(All §2 findings are resolved or superseded — see §6 for status per finding.)*

**F1 — Default Media Library shows only unverified assets (1 of 13).**
`LibraryTab.tsx:117-118` always sends `verified=false&favorite=false` while the toggles are off; `GET /api/media` treats `verified=false` as a hard filter. Evidence: captured default request `…/api/media?…verified=false&favorite=false…`; the Export CSV link href carries the same params, so exports are truncated too.
→ **Fix:** `verified: verifiedOnly || undefined, favorite: favoritesOnly || undefined` (two lines). The `audit-ui` GAP test flips to a PASS check once fixed.

**F2 — Cloudinary mandate not implemented (PS 02 core).** *(FIXED — rev. 2)*
No `cloudinary` dependency, no source usage, no config. Media lives on local disk (`public/uploads`); no CDN, no server-side image/video transformations.
→ Fix plan: Phase 2 below. Schema already has `publicId` + `originalUrl`, which map 1:1 onto Cloudinary.

**F3 — Video analysis broken on the default provider.** *(FIXED — rev. 2)*
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
| UX | `e2e/audit-ux.spec.ts` | 9 |
| Backend | `e2e/audit-backend.spec.ts` | 12 |
| Feasibility | `e2e/audit-feasibility.spec.ts` | 11 |
| Capability (live AI) | `e2e/audit-capability.spec.ts` | 7 |

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
| F3 | **Solved free:** analyze extracts ≤6 even frames with ffmpeg (`videoFramesAsParts`), sends them as vision image parts to the current provider — live-verified (caption + confidence). Raw `video_url` fallback kept for no-ffmpeg hosts, with a stage-accurate error hint. True-temporal upgrades: ≥$1 OpenRouter credit (preset's `video_url`) or Gemini native inline video |
| F5 | **Solved free:** OpenRouter chat-image model (`google/gemini-2.5-flash-image`, `imageApi: "chat"`) returns PNGs in `message.images[]` on the free tier — live-verified (879KB PNG) |
| F9 | **Invite codes:** signup joining an existing org requires an 8-char invite code (403 otherwise); owners copy/regenerate it from the account menu (`GET`/`POST /api/org/invite`, owner-only); orgs get a code at creation, legacy orgs mint one on first access |

**Fixed as a by-product of the suite:** runtime uploads 404'd until server
restart (Next indexes `public/` only at boot) — added a streaming
`GET /uploads/[name]` route with path-traversal guard.

**Blocked on credentials / decision:** none — Cloudinary credentials
received and wired (F2 above).

Free-tier note: live capability tests skip gracefully when OpenRouter's
free budget/credit window is drained (`skipIfQuota`); they re-run green when
the window refills.

---

## 7. Rev. 2 findings (independent security & code review) and fixes

| Sev | Finding | Status |
|---|---|---|
| **CRITICAL** | Arbitrary file deletion via path traversal — `POST /api/media` accepts an attacker-controlled `url`; `DELETE /api/media/[id]` joined it into `path.join(process.cwd(), "public", asset.url)` with a `startsWith` guard → any signed-up user could delete `.env.local`, the SQLite DB, or anything else under the repo (`/uploads/../../.env.local`) | **FIXED** — `publicFilePath()` resolves + enforces containment under `public/`; delete only unlinks paths inside `public/` (escaped URLs: row removed, file untouched — regression-tested). |
| HIGH | Cross-tenant `projectId` connect — `POST /api/media`, `/api/media/generate`, `/api/compare`, `/api/schedules` accepted any org's `projectId` and attached records to it (IDOR write) | **FIXED** — `orgOwnsProject()` guard added to all four (400 `Unknown project`) |
| HIGH | Unbounded `arrayBuffer()` on remote video fetch (memory-DoS before any size check) | **FIXED** — streaming reader with a 50 MB cap, cancels the stream over limit; SSRF guard (`isPrivateHost`), `redirect: "manual"`, 15 s timeout |
| HIGH | `prisma` log mode `['query']` in production wrote full query params to `server.log` | **FIXED** — prod logging is `["error"]` only |
| MEDIUM | `report-pdf` rendered metric values unescaped (XSS via crafted AI/seeded metric keys) | **FIXED** — `escapeHtml()` on values |
| MEDIUM | CSV export formula injection (`=`, `+`, `-`, `@` cell leading chars) | **FIXED** — `csvEscape` neutralizes with `'` prefix |
| MEDIUM | No declared-size pre-check on `POST /api/media` (body fully buffered first) | **FIXED** — `content-length > 15 MB` → 413 before `req.json()` |
| MEDIUM | SVG upload accepted → stored XSS served from `/uploads/` | **FIXED** — `decodeDataUrl` rejects SVG; extensions sanitized; uploads route `X-Content-Type-Options: nosniff`, SVG mime removed |
| MEDIUM | New orgs created via signup had no `inviteCode` (parity gap with `/api/orgs`) | **FIXED** — `generateInviteCode()` set at creation |
| MEDIUM | Public signup unthrottled (bulk org/user row creation) | **FIXED** — in-memory limiter, 10 signups/hour/IP (429) |
| LOW | `execFileSync` in `videoFramesAsParts` blocked the event loop | **FIXED** — promisified `execFile` (async) |
| LOW | Dead `src/app/api/route.ts` (empty route) | **DELETED** |
| LOW | No `orgId` indexes on Project/MediaAsset/Report/Comparison/SavedSearch/AssetNote | **FIXED** — `@@index([orgId])` + `db push` |
| LOW | Duplicate-email signup race leaked raw Prisma message | **FIXED** — `P2002` → 409 generic |
| LOW | `noImplicitAny: false` in tsconfig masked type holes | **FIXED** — removed; `tsc --noEmit` exits 0 |
| LOW | Secret exposure: Cloudinary `api_secret` was committed in a previous AUDIT.md revision (still in git history) | **SCRUBBED** in current AUDIT.md — **rotation required** (see follow-ups) |

**New files:** `src/lib/cloudinary.ts` (F2), `src/lib/rate-limit.ts`,
`src/app/not-found.tsx` (custom 404 + ux test), `README.md`.

## 8. Deferred follow-ups (documented, intentionally not fixed now)

1. **Rotate the Cloudinary `api_secret`** — it exists in git history of `AUDIT.md`; rotate in the dashboard, update `.env.local`.
2. CSP + HSTS headers (needs a report-URL allowlist audit first).
3. Migrate password hashing from synchronous scrypt to argon2/bcrypt (async scrypt at minimum).
4. `err.message` surfaced to clients from ~30 `catch` blocks — sweep to generic messages + server-side log.
5. Dependency pruning: `@dnd-kit/*` (check drag-drop usage), `date-fns`, other unused — verify before removal, e2e gates.
6. `UploadDialog` double-submit guard.
7. Rate limits beyond signup (login, AI endpoints) — in-memory only, single-instance ceiling noted in `rate-limit.ts`.
8. Multi-instance rate limiting requires a shared store (Redis/Upstash) — `ponytail:` comment in `src/lib/rate-limit.ts`.
9. F13 scale posture (Postgres + worker queue) only when deploying multi-instance.

---

## 9. Rev. 3: phased security audit (2026-09-29)

Six scoped `security-audit` passes ran in parallel (P1–P6 in `SECURITY-PHASES.md`), followed by consolidation (P7). Every P7 item carries a regression check in `e2e/sec-p*.spec.ts`.

**Gate on the merged branch:**
- `tsc` and `lint` are clean, and the build passes.
- e2e: **67 passed**, 8 skipped (LIVE AI, no key), **0 failed**, run against the sanitized fixture DB.

| Sev | Finding | Phase | Status |
|---|---|---|---|
| **HIGH** | `Caddyfile` `?XTransformPort=<n>` reverse-proxied any client to any loopback port, unauthenticated | P1 | **FIXED**: block removed |
| **HIGH** | Public repo shipped `db/custom.db` (demo password, live invite code). The release scripts packaged it, and `start.sh` defaulted to it | P1/P6 | **FIXED**: DB untracked, `db/*.db` ignored. The release builds a fresh schema and `DATABASE_URL` is required. Tests use the sanitized `e2e/fixtures/seed.db` |
| MEDIUM | Cross-org upload read: `/uploads/[name]` was session-gated only | P3 | **FIXED**: the route checks that an asset in the caller's org owns the file |
| MEDIUM | Uploads under `public/` present at boot were served by Next's static layer, skipping that org check | P7 | **FIXED**: uploads moved to `<cwd>/uploads`, outside `public/` (`publicFilePath` maps `/uploads/*` there) |
| MEDIUM | Delete paths could unlink shared `field-media` or out-of-uploads files; bulk delete left files behind | P3 | **FIXED** |
| MEDIUM | Video-fetch SSRF guard checked the hostname string only, so DNS names that resolve to private IPs passed | P4 | **FIXED**: the resolved address is checked and pinned (`guardedLookup`/`guardedGet`) |
| MEDIUM | Provider-returned image URL fetched with no SSRF guard, size cap or timeout | P7 | **FIXED**: private-host check, no redirects, 30 s timeout, 20 MB cap (hostname-level; the URL comes from the operator-configured provider) |
| MEDIUM | ffmpeg/ffprobe on member bytes with no demuxer limits: a crafted HLS/concat playlist could make ffmpeg read files or URLs | P7 | **FIXED**: `-protocol_whitelist file -format_whitelist <video containers>`. Verified locally: mp4/webm pass, an m3u8 disguised as `.mp4` is rejected |
| LOW | Inline upload extension came from the member-chosen MIME subtype (`data:image/html`) | P3 | **FIXED**: media extension allowlist |
| LOW | Schedule `emailTo` could be any address (the org's sender becomes a relay) | P3/P7 | **FIXED**: must be an org member on create and edit, and is re-checked at send time |
| LOW | `err.message` returned to clients (auth/org/cron, data API, report-pdf) | P2/P3/P5 | **FIXED**: generic 500 plus a server log |
| LOW | Signup crashed (500) on non-string JSON fields | P7 | **FIXED**: 400 |
| LOW | AI usage not attributed: seed ran outside `withAiScope`, and native Gemini image calls bypassed metering | P3/P7 | **FIXED** |
| LOW | Missing security headers | P7 | **FIXED**: `frame-ancestors 'none'`, XFO, nosniff, Referrer-Policy (`no-referrer` on `/share/*`), HSTS. `noindex` on share pages (P5) |
| LOW | Upload names used `Math.random` | P4 | **FIXED**: `randomUUID()` |
| LOW | `start.sh` echoed `DATABASE_URL`; `.zscripts/dev.pid` committed; CI token permissions unset | P1/P6/P7 | **FIXED** |
| — | IDOR sweep of every data route (P3) and client rendering / share page (P5) | P3/P5 | **Clean**: org-scoping held everywhere; no XSS sinks |

### Needs owner validation (no severity until confirmed)
1. **Rotate the Cloudinary credential.** It is in git history (commit `51de907`). Rotate it in the dashboard; rewriting history is optional.
2. **AI spend cap.** There is no per-org budget before provider calls: one bulk analyze makes ~200 calls. Confirm whether the provider key has a hard spend cap and whether ingress rate-limits `/api/*`. If neither, add a budget check in `aiFetch`/`geminiImage`.
3. **Deploy topology.** `clientIp()` trusts `X-Forwarded-For`. That is safe behind the Caddyfile, which overwrites it (and `start.sh` now binds Next to 127.0.0.1), but spoofable if `server.js` is exposed directly.
4. **Dependencies.** Check `next` 16.1.3 advisories and the `sharp` 0.34.5 libvips CVE for reachability, then upgrade.

### Still deferred
- A full `script-src` CSP. It needs nonces from middleware for Next's inline bootstrap.
- `Project.slug` is globally unique, which reveals whether another org has a project with the same name. Fix: `@@unique([orgId, slug])` (schema change).
- Remote markdown images in AI narratives act as view beacons on share pages (product decision).
- Login throttling, and request-size limits on routes without a content-length.

---

## 10. Rev. 4: production-readiness audit against Problem Statement 02 (2026-09-29)

Source of truth: the PS 02 text (Cloudinary track). Audited every PS requirement against the code, not against the UI, and fixed what was safe to fix. Gate on this branch: `tsc` clean, lint 0 errors, build passes, **e2e 72 passed / 8 skipped (live AI, no key) / 0 failed**, `ai-smoke` passes (`npx tsx scripts/ai-smoke.ts` locally, `bun` in CI).

### PS requirement coverage

| # | PS requirement | Status | What is true in the code |
|---|---|---|---|
| R1 | Analyze and organize large image + video collections | **PARTIAL** | Per-asset VLM analysis works (video via ffmpeg frames). Organization into projects is manual (upload picker / bulk assign). Analysis runs inside the HTTP request (worker pool of 3, 200 ids max). `GET /api/media` has no offset/cursor, so a library past 500 assets cannot be paged. |
| R2 | Identify projects, activities, locations, visual signals | **PARTIAL** | Activity, category, signals, objects, mood, OCR are extracted. `location` is a model guess of a location *type* ("rural hillside, East Africa"), not a place. No EXIF GPS. `projectName` is free text and never matched to the org's real projects. |
| R3 | Before/after comparison | **COMPLETE** | Slider, AI-described changes, score, history. The score is the model's opinion, not a measurement. Pairs are chosen by hand. |
| R4 | Searchable via AI metadata, tags, semantic discovery | **PARTIAL** | Rich metadata + filters + LLM ranking. Ranking pastes the catalog into one prompt (no embeddings). Now capped to 120 candidates and falls back to keyword ranking, but the ceiling is a few thousand assets. |
| R5 | Visual reports, summaries, campaign content | **PARTIAL** | Was text-only, with model-invented KPIs. Now grounded, with counted facts, and the print/PDF report carries the numbered evidence. The public share page is still text-only (decision needed). |
| R6 | Traceability to source assets and transformations | **COMPLETE** (Cloudinary path not exercised live) | The untransformed Cloudinary original is now stored in `originalUrl` (it was discarded, only the `f_auto,q_auto` derivative was kept), with delivery params in the evidence chain. Reports list their source assets with `publicId`. |
| R7 | Built on Cloudinary | **PARTIAL** | Storage + delivery transforms + EXIF capture date + derived previews. Not used: Cloudinary AI (tagging, moderation, video intelligence), signed/private delivery. |

### Findings and fixes

| Sev | Finding | Fix |
|---|---|---|
| **P0** | `next` 16.1.3 and `next-auth` 4.24.14 carried **critical** advisories (unauthenticated RCE, middleware/proxy bypass, homoglyph email bypass) | Upgraded to `next` 16.3.7, `next-auth` 4.24.15, `eslint-config-next` 16.3.7. `npm audit --omit=dev`: critical 2 → 0 |
| **P1** | Reports and campaigns published model-invented KPIs ("plausible KPIs", "trees_planted: 250") next to real evidence; the "Data-first" campaign angle asked for a "striking metric" | Prompts forbid estimates and require grounding. Every report now also carries counted facts (`evidence_assets`, `human_verified`, `period`) that the model cannot override. Metrics are validated to primitives (an object value used to crash the share page) |
| **P1** | Malformed model replies were saved as if they were results: analysis stored `"Field media asset" / "Unassigned" / confidence 0.4` and set `analyzedAt`; comparisons stored a made-up 50% score; reports stored raw text as the narrative; campaign variants were padded with "Campaign headline" filler | `analyzeMedia`, `compareImages`, `generateReport`, `semanticSearch` validate and normalize (clamped scores, category allowlist, comma-safe tags), or **throw**. Callers already handle failure |
| **P1** | Semantic search sent the entire org catalog to one LLM call and returned a 500 whenever the provider failed; invented ids were passed through | Keyword shortlist caps the prompt; hallucinated/duplicate ids are dropped; on any AI failure the route answers with keyword results (`degraded: true`, shown in the UI). `query` is validated (string, ≤300 chars) |
| **P1** | Printable/PDF report had no images and no source list: "visual reports" and "traceability" stopped at the report boundary | Evidence appendix: the assets the report was written from, numbered as the narrative cites them, with capture date, verification state and `publicId`. Org-scoped |
| **P1** | Cloudinary uploads discarded the original URL, `width`/`height`, and ignored EXIF, so a bulk upload put every photo on the upload date in the timeline | `originalUrl`, dimensions and EXIF `DateTimeOriginal` (validated) are stored; a `cloudinary-delivery` step is added to the evidence chain. An invalid `captureDate` is now a 400, not a 500 |
| **P1** | Library grid loaded full-size originals (no thumbnails were ever generated), and video cards rendered a broken `<img src="clip.mp4">` | Cloudinary previews derived in the serializer (640 px image, first-frame JPEG for video); detail views keep the full image; local videos render their first frame |
| **P1** | No per-org AI spend limit (open item from Rev. 3) | `AI_DAILY_CALL_CAP` (default 2000 calls per org per rolling 24 h, `0` = off), checked before every provider call. Verified against a real SQLite DB |
| **P1** | No login throttling (PRD non-functional requirement; open in Rev. 3); every guess also runs a blocking `scryptSync` | 10 failed attempts per IP+email per 15 min, failures only, so normal sign-ins never trip it |
| P2 | Bulk analyze ran strictly one at a time; duplicate ids could race on one row | Worker pool of 3, ids de-duplicated |
| P2 | No health probe | `GET /api/health` (public, no detail): 200 `ok` / 503 `unavailable` |
| P2 | `assetIds` for reports was unbounded (prompt size and spend) | Strings only, max 60 |
| P2 | In-memory rate limiter kept empty keys forever | Bounded map, empty keys dropped |

New tests: `e2e/prod-readiness.spec.ts` (5), plus 31 new assertions in `scripts/ai-smoke.ts` (junk replies throw, normalization, ID hallucination, keyword ranking, EXIF parser, preview URLs).

### Needs a decision or information (not changed)

1. **Rotate the Cloudinary credential** (still in git history, commit `51de907`). Owner action.
2. **Public share page shows no evidence images.** Adding them would expose asset URLs to anyone holding the link. Product/privacy call: all, verified-only, or none.
3. **Cloudinary delivery is public.** Assets are `type: upload`, so anyone with a URL can read it, while local `./uploads` are org-checked. Switching to `authenticated` + signed URLs makes both consistent but changes every media URL.
4. **Auto-assign uploads to projects?** Needs a policy: silently assign, or only suggest. Wrong auto-attribution of evidence is worse than none.
5. **Embeddings / vector search** past a few thousand assets: needs an embeddings provider and a store (Postgres + pgvector, or an external index).
6. **Job queue + Postgres + shared rate limit store** before any multi-instance or large-batch use. Blocked on the undecided deploy target.
7. **Pagination** of the library (cursor + infinite scroll) is a UI change.
8. **GPS geotagging** (EXIF → lat/lng) needs schema columns on `MediaAsset`.
9. **Local-fallback thumbnails** (sharp) if the fallback is meant to be a real deployment mode.
10. **Remaining advisories** (`npm audit --omit=dev`: 10 high, mostly the Prisma CLI toolchain and `sharp`, which needs a 0.34 → 0.35 major bump and a HEIC/AVIF upload test). `bun.lock` is now stale relative to `package.json`; CI uses `package-lock.json`. Drop one lockfile.
11. **Not verified live:** the Cloudinary `image_metadata` request and response fields are implemented from the SDK/API contract but were not exercised against a real account (no credentials in this environment).
12. **No backups, structured logging or metrics** for the SQLite database and AI calls.
