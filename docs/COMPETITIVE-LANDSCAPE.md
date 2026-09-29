# ImpactLens — Competitive Landscape & Upgrade Plan

Research date: Sep 2026 (GitHub + web, ~20 queries, star counts verified live).

**ImpactLens reference features:** multi-tenant org-scoped web app · field media upload → VLM analysis · semantic search over media · before/after comparison with impact score · LLM donor-ready reports (4 angles, variants, clone) · campaign copy (IG/X/LinkedIn/newsletter) · scheduled email reports + public share links · leaderboards + health score · analytics · metered AI usage per org.

---

## Landscape

### Group A — closest overlap

| Product | What it does | Gap vs ImpactLens |
|---|---|---|
| [Ecodrive ImpactIQ](https://www.ecodrive.community/impactiq) | Photo/video evidence per impact unit + GPS/timestamp, AI-matched to partners, auto dashboards/reports | No VLM semantic search, no before/after scoring, no campaign copy |
| [BNZ Impact](https://bnzgreen.io/impact) | Baseline/before-after field photos, geotag, satellite MRV, funder "evidence packs" | No AI reports or comms |
| [Sopact](https://sopact.com) | AI ingestion of forms/field data, evidence-linked answers, stakeholder reports | Text/forms only, no media VLM |
| [ReportsAI](https://reports-ai.app) | AI reports vs SDG/IRIS+/GRI/ESG, offline multilingual field collection | No field-photo analysis |
| [ImpactDraft](https://impactdraft.org) | Donor-report generator only (7 types, 5 langs, BYOK) | Single link in the chain |
| [Sealr / UNDP DigitalX](https://digitalx.undp.org) | AI+blockchain verified geotagged image/video capture, map dashboard | Ingest only |

### Group B — partial overlap

- **[mirl-aftermath](https://github.com/mirl-ucsb/mirl-aftermath)** (OSS) — before/after photo pairs → condition dossier with image registration + SHA-256 provenance; our compare engine as a standalone
- **[impact-vision](https://github.com/joejoe168168/impact-vision)** (28★) — report claims → SDG/IRIS+ mapping agent
- **[impact-reporter-ai](https://github.com/maree217/impact-reporter-ai)** (MIT, 0★) — LLM impact-report drafts wired to fundraising CRMs
- **[KoboToolbox](https://github.com/kobotoolbox/kpi)** (184★, free) — field data collection + NLP on open text, no VLM
- **TextIt / [RapidPro](https://github.com/rapidpro/rapidpro)** (908★; hosted from $25/mo) — SMS/WhatsApp donor stewardship + AI classification
- **engage by [Kindsight](https://kindsight.io/engage)** — nonprofit campaign/grant copy, 80+ prompts
- **[Tella](https://tella.app)** — encrypted offline-capable field photo/video capture

### Group C — adjacent (M&E / ESG, no field-media AI)

- **DevResults** — established M&E platform, **$33.8k–103.4k setup + $28k–91k/yr**
- **[Chauka](https://chauka.org)** (OSS, beta), **MONIC** (6★), **[MEInsight](https://github.com/edc-it/MEInsight)** (30★) — open-source M&E/logframe systems
- **[Uwazi](https://docs.uwazi.io)** (324★) — HURIDOCS evidence document collections + search
- **Amp Impact (Vera Solutions)** — Salesforce-packaged impact measurement
- **Watershed / Persefoni / Sweep** — enterprise ESG/carbon disclosure (weakest overlap)

**Checked and rejected:** Kickboard (K-12 behavior), SocialGuard (gambling compliance), substrata.me (sales coaching), vercel-labs/before-and-after (web-page visual diff).

---

## Verdict

Crowded on *pieces*, empty on the *whole loop*. No single product bundles capture → VLM analysis → semantic media search → before/after scoring → multi-angle report → scheduled email → leaderboards → metered AI as one NGO-facing product. Nearest competitors own 2–3 links of the chain and leave the rest to integrations.

---

## Best things to take

| From | Take | Becomes | Effort |
|---|---|---|---|
| Sealr + mirl-aftermath | SHA-256 provenance hash + geotag/EXIF capture on upload | Tamper-evident evidence, hash shown in report, funder-verifiable | S |
| Sopact | Evidence-linked claims — every report statement cites source assets | "Why" chips under each paragraph → click through to media | M |
| ReportsAI / impact-vision | Auto-tag findings to SDG / IRIS+ / GRI | LLM tagger on reports + badges | S |
| BNZ Impact | One-click evidence pack: before/after + score + report + hashes (PDF/ZIP) | Export button on compare & report pages | M |
| Ecodrive ImpactIQ | Embeddable public dashboard widget (iframe) | `/share` links become embeds on partner sites | S |
| ImpactDraft | Word/PDF export + BYOK (customer's own LLM key) | BYOK = Enterprise tier → near-zero AI COGS | S–M |
| RapidPro | WhatsApp delivery of scheduled reports | New channel on `schedules` (email exists) | S |
| engage (Kindsight) | Prompt library for grants/campaigns | Prompt gallery in campaign tab | S |
| Kobo/Tella | Offline PWA capture queue | Field use with no signal — Phase 2 | L |

## How we stack up

**Ours:** only product with the full loop; VLM media AI + semantic search; multi-tenant metered AI usage; leaderboards/health score.
**Ours lacking:** provenance/geo trust layer, framework rigor (SDG/IRIS+), export/embed polish, offline capture.

## Upgrade priority

- **P0** — provenance hashes + geo capture (trust is the sale; small diff)
- **P0** — report citations back to source media (data already exists)
- **P1** — SDG/IRIS+ tagging, evidence-pack export, embeddable widget
- **P1** — BYOK + PDF/Word export (margin protection + enterprise box-ticking)
- **P2** — WhatsApp delivery, grant/campaign prompt library, offline PWA capture
- **Phase 2 (shared with Edge.Mem)** — SSO/RBAC + audit log + public API; BYOK key management is the same enterprise story — build once, share patterns
