# ImpactLens — Product Requirements

**Status:** built (hackathon, Code Cubicle, Problem Statement 02) · hardening in progress
**Owners:** hemv-857, Pratyush Garg
**Last updated:** 2026-09-29

## 1. Problem
Impact and sustainability orgs (NGOs, CSR teams, climate projects) collect large amounts of field media: photos and videos of plantings, installs, cleanups and classrooms. That media sits unorganized. Proving impact to donors takes someone manually sorting files, writing captions, finding before/after pairs and drafting reports. The evidence exists, but nobody can search it or cite it.

## 2. Users
| Persona | Needs |
|---|---|
| **Program manager** (org owner) | Upload field media, organize it by project, and show progress over time |
| **Comms / fundraising** (member) | Find the right shot fast, then draft reports and social campaigns from real evidence |
| **Donor / external stakeholder** | Read a report through a public link, with no account |

## 3. Goals
1. Turn raw field media into structured, searchable evidence automatically (AI captions, tags, signals, confidence, SDG mapping).
2. Cut report and campaign drafting from hours to minutes, grounded in the org's own assets.
3. Keep each org's data strictly isolated. This is a multi-tenant SaaS.

**Non-goals:** a general DAM, a video editor, a donor CRM, or multi-region scale (SQLite single instance for now).

## 4. Functional requirements
| # | Capability | Surface |
|---|---|---|
| F1 | Email/password signup and login. Each user belongs to one or more orgs; joining an existing org requires an owner's invite code | `/auth`, `/api/auth/*`, `/api/org/invite`, `/api/orgs` |
| F2 | Media ingest from a browser upload (≤10 MB), an external URL, or AI generation. Stored on Cloudinary, falling back to local `public/uploads` | `/api/media`, `/api/media/generate`, `/uploads/[name]` |
| F3 | AI analysis: caption, summary, tags, objects, signals, mood, OCR, quality and confidence. Video is analyzed by ffmpeg frame sampling | `/api/analyze/[id]`, `/api/media/bulk` |
| F4 | Library: filter, sort, favorite, verify, manual tags, notes, bulk actions, CSV export | `/api/media*`, `/api/notes*` |
| F5 | Projects with SDG goals, map and timeline, health score, leaderboard, project-vs-project compare | `/api/projects*` |
| F6 | Before/after comparison with AI-described change | `/api/compare`, `/api/comparisons` |
| F7 | Semantic search, plus saved searches | `/api/search`, `/api/searches*` |
| F8 | Report generation (impact/summary/campaign/comparison; 1–4 variants, choice of tone), clone, PDF | `/api/report*`, `/api/reports*`, `/api/report-pdf` |
| F9 | Campaign copy per platform (Instagram/X/LinkedIn/newsletter), with variants | `/api/campaign*` |
| F10 | Public read-only share links for reports (revocable token) | `/api/reports/[id]/share`, `/share/[token]` |
| F11 | Scheduled reports, delivered by email and summarized in Slack, triggered by an external cron with a shared secret | `/api/schedules*`, `/api/cron/reports` |
| F12 | AI usage metering per org and user | `/api/ai/usage` |
| F13 | Analytics dashboard, command palette, dark mode | `/api/analytics`, UI |

## 5. Non-functional requirements
- **Security:** every API route authenticates itself, and every query is org-scoped. No SSRF to private networks, no stored XSS, no path traversal. Secrets never enter git. Details and open work: `SECURITY-PHASES.md`.
- **Abuse limits:** rate limits on signup, login and AI-cost endpoints. Upload size caps.
- **Performance:** dashboard interactive in under 2 s on the seeded DB. AI calls are async with visible progress.
- **Accessibility:** keyboard navigable (command palette, shortcuts), WCAG AA contrast in both themes.
- **Quality gates:** `tsc --noEmit`, `eslint`, and the Playwright e2e suite (`e2e/`) stay green.

## 6. Success metrics
- Time from upload to a searchable, tagged asset: under 30 s per image.
- Share of generated reports that cite at least 3 real org assets: 100%.
- Zero cross-tenant reads or writes in the e2e scoping suite.

## 7. Known constraints and open questions
- Single-instance SQLite and an in-memory rate limiter. Moving to Postgres, a shared rate-limit store and a worker queue waits until a multi-instance deploy is planned.
- Video analysis depends on the provider. The Gemini OpenAI-compat endpoint rejects `video_url`; use OpenRouter.
- Deployment target is undecided (Caddy on a VM per `Caddyfile`, or a Vercel-style host). This affects headers, the proxy trust model and cron.
