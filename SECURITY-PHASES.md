# Security audit + remediation: parallel phases

> **Status: complete (2026-09-29).** Results and open owner items are in `AUDIT.md` §9 (Rev. 3).

Six **independent** phases (P1–P6) that can run at the same time in separate chats, plus one final sequential phase (P7). Each phase owns a **disjoint set of files**, so the branches merge without conflicts.

The leads below come from a source-only recon pass on 2026-09-29 (commit `d9d650b`). They are **unverified candidates**, not confirmed findings. Each phase confirms or rejects them with the `security-audit` skill before fixing anything. `AUDIT.md` §7 lists what earlier reviews already fixed: don't re-report those unless the fix is broken.

---

## How to run a phase (paste into a fresh chat)

```
Read CLAUDE.md and SECURITY-PHASES.md, then execute Phase <N> exactly as written.
Work in a git worktree on branch sec/p<N>. Only edit files that Phase <N> owns.
```

Every phase follows the same steps:

1. **Worktree.** Create a worktree on branch `sec/p<N>` from `main`, and run `npm install` there if tests are needed.
2. **Audit.** Invoke the `security-audit` skill in **full audit mode, scoped run, profile `quick`**:
   - `scope_paths` = the phase's *Owns* list, plus the *Read-only context* list for tracing only
   - output dir = `~/security-audit-skill/impact-lens/p<N>` (outside the repo)
   - agent budget = **10 invocations**: 4 recon + 1 critic + up to 5 hunters/verifiers. If the phase needs more, raise it; quality beats tokens.
   - Give hunters the phase's *Leads* as starting hypotheses, and have them also hunt beyond the leads within scope.
   - The skill's execution-safety rules apply: source-first, with no live or deployed probing.
3. **Fix.** Fix every `confirmed` record with the **smallest fix at the last trusted decision point**, and add ONE regression check per fix. Prefer an e2e case in the phase's own new spec file `e2e/sec-p<N>.spec.ts`; don't edit shared e2e files. `needs_validation` records don't get fixed. List them in the PR.
4. **Gate.** `npx tsc --noEmit && npm run lint` must pass. If the phase touched runtime behavior, build and run the e2e suite on :3002 (see CLAUDE.md).
5. **Ship.** Commit (no AI attribution), push `sec/p<N>`, and open a PR titled `sec(p<N>): <phase name>`. The PR body contains the findings table (id · severity · status · fix · test) and the needs_validation list. Copy `REPORT.md` from the output dir into the PR body. **Don't commit the audit output dir.**

Out-of-scope discoveries: note them in the PR under "Handoff", tagged with the phase that owns the file. Don't edit files you don't own.

---

## P1: Edge, proxy and deployment config
**Owns:** `Caddyfile`, `next.config.ts`, `.zscripts/**`, `src/middleware.ts`
**Read-only context:** `src/lib/rate-limit.ts`, `package.json` scripts

**Leads:**
- **Open internal proxy (likely HIGH).** `Caddyfile` routes any request carrying `?XTransformPort=<n>` to `localhost:<n>` with no auth. Anyone who can reach Caddy can reach every loopback HTTP service on the host (other dev servers, admin panels, the 3001 project). It looks like leftover scaffold. Confirm whether the app uses it (`grep -r XTransformPort`); if nothing does, delete the block.
- **Missing security headers.** There's no CSP, HSTS, `frame-ancestors`/X-Frame-Options, or Referrer-Policy in `next.config.ts` `headers()`. `AUDIT.md` §8.2 deferred this. Add a CSP that works with the actual origins in use (Cloudinary, map tiles in `MapView.tsx`, data: images). Test it in the prod build; the e2e console-error watch will catch CSP breakage.
- **Middleware matcher.** Check that `/uploads/*` and every page that isn't `share`/`auth`/landing stays session-gated, and that the regex has no bypass (case, trailing segments, `/_next/image` abuse).
- `.zscripts/*`: look for shell injection, world-readable secret handling, and `dev.pid` or other committed runtime state.

## P2: Authentication, signup, orgs, cron
**Owns:** `src/lib/auth.ts`, `src/lib/rate-limit.ts`, `src/app/api/auth/**`, `src/app/api/org/**`, `src/app/api/orgs/**`, `src/app/api/cron/**`, `src/types/next-auth.d.ts`, `src/app/auth/**`
**Read-only context:** `prisma/schema.prisma`, `src/middleware.ts`

**Leads:**
- **Orphan-data adoption on every signup (likely MEDIUM–HIGH).** `signup/route.ts:109` calls `adoptOrphanData(org.id)` for *every* new org, not only the first account as the comment says. Any `orgId: null` rows (legacy or seeded) go to whichever stranger signs up first. Fix: remove it or restrict it to the very first user; also check whether any code path still creates `orgId: null` rows.
- **Rate-limit key is spoofable.** `clientIp()` trusts client-supplied `X-Forwarded-For`/`X-Real-IP`. Without Caddy in front (direct `bun server.js`), an attacker rotates the header and bypasses the signup limit. Decide the trust model with P1's proxy finding in mind.
- **No login throttle.** `authorize()` has no rate limit, so password spraying against `ada@example.org`-style accounts is unbounded. Invite-code brute force goes through signup (8 chars from a 31-symbol alphabet, 30/hr/IP): confirm it's infeasible once XFF is fixed.
- **Cron secret compare** uses `!==`, not `timingSafeEqual`. It's low severity, but it's a one-liner.
- **`NEXTAUTH_SECRET` enforcement.** Check what happens in production when it's unset (NextAuth v4 fallback behavior), and whether JWT org switching (`trigger === "update"`) can be abused beyond the membership re-check.
- Session and membership revocation: after membership removal, `getAuthContext` returns null, but check that every page and data path relies on it.
- `err.message` leaks in owned routes (signup 500 path, cron results): replace with generic messages.

## P3: Tenant isolation and IDOR sweep (data API)
**Owns:** `src/app/api/{media,projects,notes,reports,report,schedules,compare,comparisons,search,searches,analytics,analyze,campaign,ai,seed}/**`, `src/app/uploads/**`, `src/lib/serialize.ts`, `src/lib/db.ts`, `src/lib/store.ts`
**Read-only context:** `src/lib/auth.ts`, `prisma/schema.prisma`, `src/lib/report-gen.ts`

**Leads:**
- **Systematic IDOR sweep.** For every handler, confirm that each id from the path, body or query (`id`, `ids[]`, `assetIds[]`, `projectId`, `beforeId/afterId`, `comparisonId`, `assetId`) is org-checked **before** use, including in `include`/nested relations and bulk paths. Recon found the find-then-write pattern consistent; this pass proves it for every route, including `report/clone`, `media/bulk`, `projects/compare`, `campaign/variants`, `notes`, `search` (the embedding/candidate set), and `reports/[id]/share`.
- **Cross-org upload read.** `/uploads/[name]` requires only a session (middleware), with no org check. Filenames are `upload_<ms>_<6 base36 chars>` from `Math.random` (`src/lib/ai.ts` `saveUpload`, owned by P4), which is guessable with effort. Decide whether to org-check via DB lookup of `url` here, or to hand P4 the task of switching names to `randomUUID()`. Probably both.
- **Mass assignment.** Check PATCH/POST handlers that spread body fields into Prisma `data` (media, projects, schedules): can a client set `orgId`, `verified`, `shareToken` or `analyzedAt`?
- **Schedule `emailTo`.** Any member can point a schedule at any external address, so the org's email sender becomes a spam or exfil relay for org report content. Decide the policy (restrict to org member emails?) and note it; the fix lives in `schedules/**` (owned here).
- `seed` route: any member can trigger N AI calls, which costs money (coordinate with P4's rate limiter).
- `err.message` leaks across all owned routes: sweep to a generic 500.

## P4: SSRF, AI provider, outbound integrations, cost abuse
**Owns:** `src/lib/ai.ts`, `src/lib/ai-usage.ts`, `src/lib/email.ts`, `src/lib/slack.ts`, `src/lib/cloudinary.ts`, `src/lib/report-gen.ts`, `scripts/**`
**Read-only context:** `src/app/api/media/route.ts`, `src/app/api/analyze/[id]/route.ts`, `src/app/api/media/generate/route.ts`

**Leads:**
- **SSRF guard is hostname-only.** `isPrivateHost()` (`ai.ts:165`) checks the literal hostname, so DNS names that resolve to private IPs (`127.0.0.1.nip.io`, attacker DNS, rebinding) pass. The video fetch (`ai.ts:374-378`) then connects. Fix: resolve with `dns.lookup(all)`, reject private/reserved results (including IPv4-mapped IPv6, 100.64/10, 0/8), and connect to the checked IP.
- **Unguarded provider-returned URL fetch.** `ai.ts:744` does `fetch(item.url)` on a URL returned by the image API, with no private-host check, no size cap, no timeout and redirects followed. Apply the same guard, cap and timeout.
- **Other outbound fetches.** Check every place a user-supplied URL reaches a server-side fetch or ffmpeg (`videoFramesAsParts`: ffmpeg given a remote URL is its own SSRF and protocol vector: `file:`, `concat:`, `http` with redirects).
- **Prompt injection into reports.** OCR text and captions from user media flow into report and campaign prompts. Check whether injected content can leak another org's data (it shouldn't be in context at all) or emit HTML that P5's renderers trust.
- **AI cost DoS.** There are no per-org or per-user limits on AI calls. Add ONE choke point in `ai-usage.ts` (`withAiScope`/meter) that enforces an org-level budget and rate, so no route changes are needed.
- `saveUpload` filenames: switch to `crypto.randomUUID()` (see P3).
- `email.ts`: header injection via `subject`/`to` (CRLF) and HTML injection in rendered report email bodies. `slack.ts`: webhook URL only from env; confirm.
- Cloudinary: signed vs unsigned uploads, `publicId` control, and whether delete can target another org's `publicId`.

## P5: Client-side rendering, public share, PDF
**Owns:** `src/components/**`, `src/app/share/**`, `src/app/api/report-pdf/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/not-found.tsx`, `src/hooks/**`
**Read-only context:** `src/lib/types.ts`, `src/lib/format.ts`, `src/app/api/reports/[id]/share/route.ts`

**Leads:**
- **Stored XSS paths.** AI output, titles, notes and tags render in the React UI. Check `MarkdownRenderer.tsx` (`react-markdown`: no `rehype-raw`? link `href` schemes like `javascript:`?), `components/ui/chart.tsx:83` `dangerouslySetInnerHTML` (inputs come from config only?), and `PlatformPreview`, `MapView` (Leaflet popups take HTML strings!), and `AssetDrawer`.
- **Report PDF HTML.** `report-pdf` escapes metric values (fixed earlier); check the *rest* of the template (title, body, audience, asset captions, URLs in `<img src>`), and whether the output is served as `text/html` same-origin.
- **Public share page** `/share/[token]`: it's unauthenticated. Check that it exposes only the report, not other org assets, internal ids, member emails or asset URLs from other orgs. Check the token (128-bit random, good) and revocation. Add `noindex` and `Referrer-Policy: no-referrer` so tokens don't leak through Referer headers to embedded image hosts.
- Open redirects via `callbackUrl` on `/auth` (NextAuth), or client-side `window.location` from query params.
- Secrets or env values bundled into client code (`NEXT_PUBLIC_*`, imports of server libs in client components).

## P6: Supply chain, repo hygiene, CI
**Owns:** `package.json`, `package-lock.json`, `bun.lock`, `.github/**`, `.gitignore`, `db/**`, `README.md`, `.env`, `download/**`, `examples/**`, `mini-services/**`, `tests/**`, `agent-ctx/**`
**Read-only context:** `AUDIT.md`, full git history

**Leads:**
- **Public repo ships a live DB.** `db/custom.db` is committed to a **public** repo, with 20 users (scrypt hashes), a non-null org **invite code**, and a README-documented demo password. `npm start` runs production against this same file, so a deployment built from the repo lets anyone log in as `ada@example.org` or join that org with the published invite code. Fix: stop tracking the DB (`db/*.db` in `.gitignore`, `git rm --cached`), and ship a seed script or fixture instead. Keep e2e working (CI already materializes per run; check).
- **Secret scan of full history.** Run `gitleaks detect` or `trufflehog git file://.` if either is installed locally; otherwise grep history for key patterns (`sk-`, `AIza`, `cloudinary://`, `xox`, `hooks.slack.com`, `-----BEGIN`). `AUDIT.md` says a Cloudinary secret was once committed; the current history shows no match (it may have been rewritten). Mark rotation as needs_validation for the owner.
- **Dependencies.** `npm audit --omit=dev` (read-only), flag critical/high with a reachable use. Check `next`, `next-auth` v4 and `sharp` versions against known advisories. Remove unused deps flagged in `AUDIT.md` §8.5 only if a grep shows zero imports.
- **CI** (`.github/workflows/ci.yml`): check `permissions:` (default token scope), third-party actions pinned by SHA, no `pull_request_target`, and no secrets echoed to logs.
- `examples/websocket/server.ts`, `mini-services/`, `download/`, `tests/*.sh`: check for dead scaffold that ships in the build or runs anything. Delete what's unused.

---

## P7: Consolidate (sequential, after P1–P6 merge)
1. Merge `sec/p1` … `sec/p6` into `main` in order and resolve any conflicts (there should be none; the Handoff notes may create small follow-ups).
2. Work through every "Handoff" item from the six PRs.
3. Full gate: `tsc`, `lint`, build, and the whole e2e suite including all `e2e/sec-p*.spec.ts`.
4. Add a **Rev. 3** section to `AUDIT.md`: one table of every finding across phases (severity · status · commit), plus the combined needs_validation list for the owners (key rotation, deploy topology, CSP report endpoint).
5. Optional: one `security-audit` **`standard`** run over the whole repo, with the P1–P6 output dirs as prior runs, to catch gaps between the phase boundaries.
