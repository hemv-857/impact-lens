# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Impact and sustainability orgs (NGOs, CSR teams, climate projects). The signed-in app serves two roles equally (confirmed 2026-09-30):
- **Program manager** (org owner): uploads field media, keeps it organized by project, shows progress over time.
- **Comms / fundraising** (member): finds the right shot fast, drafts reports and social campaigns from real evidence.
Donors and external stakeholders read shared reports through a public link, no account.

## Product Purpose
Turn unorganized field photos and video into searchable, citable evidence, then turn that evidence into donor reports and campaigns in minutes instead of hours. Success: every asset is tagged and searchable within ~30 s of upload, and every generated report cites real org assets.

## Positioning
Evidence first: reports and campaigns are grounded in, and cite, the org's own verified field media (AI caption, confidence, verification, before/after change) rather than being written from nothing.

## Operating Context
Loop: ingest (upload / URL / AI generation) → AI analysis → review and verify → organize by project → compare before/after → search → draft report or campaign → share a public link or schedule delivery. Used repeatedly by small teams; donors see only the shared report.

## Capabilities and Constraints
- Media library with filters, favorites, verification, tags, notes, bulk actions, CSV export; asset drawer with evidence chain.
- Projects with SDG goals, map, timeline, health score, leaderboard, project compare. Before/after comparison with AI-described change.
- Semantic search with saved searches. Reports (impact/summary/campaign/comparison, variants, tone, clone, PDF, share links, schedules). Campaign copy per platform.
- AI usage metering, command palette (Cmd+K), dark mode.
- Navigation (confirmed 2026-09-30): Home · Library (media, search, timeline) · Projects (incl. before/after) · Reports (reports, campaigns, schedules). No feature is removed.
- Next.js App Router, Tailwind, shadcn/ui; single-page tab shell driven by a Zustand store.

## Evidence on Hand
Seed/demo data in `e2e/fixtures/seed.db` (test only). Field images under `public/field-media/`. No real customers, testimonials or benchmarks exist; do not invent them.

## Product Principles
1. Evidence is the product: media, confidence and verification lead; decoration never competes with them.
2. Every claim traces back to an asset.
3. Scan, understand, act: repeat users should not re-read explanations.
4. One org's data is never visible to another.

## Accessibility & Inclusion
Keyboard navigable (command palette, shortcuts); WCAG AA contrast in light and dark themes.
