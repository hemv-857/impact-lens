# ImpactLens — Competitive Landscape (v2)

**Verified:** 2026-09-29 · **Supersedes:** v1 (Sep 2026, GitHub-first research, no per-claim dates) · **Owner:** product/GTM
**Files:** this memo · [`competitors.csv`](competitors.csv) (source register: one row per competitor, source URL, verified date, confidence) · [`IMPACTLENS PRICING MODEL.xlsx`](IMPACTLENS%20PRICING%20MODEL.xlsx) (pricing model, with new `Cost Inputs` and `Price Benchmark` sheets)

**How to read the evidence.** Every statement below is one of:

| Tag | Meaning |
|---|---|
| **Verified** | Read on the vendor's own page or the GitHub API on 2026-09-29. URL in the CSV. |
| **Calculated** | Derived from verified numbers; the formula is in the workbook. |
| **Not stated** (`ns`) | The page I read is silent. This is **not** proof the feature is absent; marketing pages under-describe products. |
| **Prior** | Carried over from v1 and not re-checked. Low confidence. |
| **Hypothesis** | My inference; needs a customer call or demo to confirm. |

Matrix codes: `Y` stated on the source · `P` partly (see CSV notes) · `ns` source read, not stated · `prior` v1 claim only · `–` not assessed on that dimension.

---

## 1. What this tells you

1. **The buyer's alternatives are mostly not "another media-AI product".** Of the 9 competitor products whose pages I read, **none clearly states photo/video content analysis** (`ns` in 8 rows; Sealr says "AI-verified" without saying what the AI does). What buyers can actually buy today splits into four jobs: capture with proof, report writing, form-based M&E, and program-level M&E suites. The Cloudinary platform itself is the only verified source of AI media tagging. *(Verified, with the `ns` caveat.)*
2. **Capture and proof is the crowded, credible end of the chain.** Fulcrum, Sealr, BNZ Impact, Ecodrive and Tella all lead with geotag, timestamp or encryption. ImpactLens stores neither GPS nor a content hash, and its "verified" flag is a manual checkbox. Until that changes, ImpactLens reports are "the AI says", and funder-facing buyers will compare it against tools that can prove where and when a photo was taken. *(Verified competitor claims; ImpactLens state from the repository.)*
3. **There is a visible price gap, but only within the set I could price.** Verified paid plans run from $9 to $5,833 a month (annual plans ÷ 12). Nothing I found in $30–$100 turns an existing photo library into cited reports: report writers are text-only ($9–$49), form-based analysis starts at $299, and capture tools run from free (Tella) through $100 (CommCare) to $215 (Fulcrum, 5-user minimum). ImpactLens Starter ($31) and Pro ($83) sit in that gap. *(Calculated; see `Price Benchmark`.)* Whether the gap is a market or an absence of demand is a **hypothesis**.
4. **Enterprise tier is the weak point commercially.** At ₹19,999 (~$208/mo) it costs about a quarter of Sopact Growth ($799) and a fifth of CommCare Advanced ($1,000), but promises unlimited assets, orgs, seats and comparisons, and its modelled gross margin is the thinnest (48.7%; 45.7% at Cloudinary's published rate; **negative** if the analysis allowance is used on video). *(Calculated; `Cost Inputs`, sections 3–4.)*
5. **The v1 verdict ("empty on the whole loop") is unproven and partly stale.** It rests on marketing pages that are silent, and several items v1 lists as gaps already ship (§6).

---

## 2. Who a buyer is really choosing between

| The buyer's alternative | Verified examples | What it does not do (per the pages read) | Price context (verified, USD/mo) |
|---|---|---|---|
| **Capture with proof** | Fulcrum, CommCare, Sealr, Tella, BNZ Impact | No photo/video analysis stated; no donor narrative | Fulcrum from $215 (5 users); CommCare $100–$1,000+; Tella free; BNZ/Sealr unpriced |
| **AI report writing** | ImpactDraft, Sopact, ReportsAI, engage | ImpactDraft/engage: text only. Sopact: forms and files, no photo analysis stated | ImpactDraft $9–$49; Sopact $299–$799 (+ setup from $2,000); ReportsAI/engage unpriced |
| **M&E suite** | DevResults | Priced by the funder's program size; no media AI stated | ≈ $2,333–$5,833 (annual ÷ 12) + $33,800–$103,400 setup |
| **Corporate-donation marketplace** | Ecodrive ImpactIQ | Sells verified impact units to corporates; not a media library | $0.45 per unit, or from a $50k/yr impact commitment (funding, not a software fee) |
| **The platform vendor** | Cloudinary (the problem statement's track) | Plus plan lists auto-tagging; documented AI Content Analysis and video-tagging add-ons | Plus $89/mo annual (225 credits); add-on prices not found |
| **Do it by hand** | Shared drive + a general LLM chat | *Hypothesis:* no evidence chain, no cited reports, no schedule | Not researched. Do not quote a price |

*Not yet assessed (see §8):* generic DAMs with AI tagging, nonprofit CRMs adding AI, and the shared-drive-plus-LLM alternative above.

### Capability coverage (verified where the code is `Y`/`P`/`ns`)

| Product | Capture + geotag | Photo/video AI | Semantic search | Before/after | Reports | Campaign copy | SDG/IRIS+/GRI | Offline |
|---|---|---|---|---|---|---|---|---|
| Fulcrum | Y | ns | – | – | – | – | – | Y |
| Sealr (UNDP Digital X) | Y | P | P | – | ns | – | – | – |
| BNZ Impact | Y | ns | – | P | P | – | – | – |
| Tella | P | ns | – | – | – | – | – | Y |
| Ecodrive ImpactIQ | Y | ns | – | ns | P | P | Y | – |
| Sopact | – | ns | – | – | Y | – | P | – |
| ReportsAI | – | ns | – | – | prior | – | Y | Y |
| ImpactDraft | – | ns | – | – | Y | – | – | – |
| engage by Kindsight | – | ns | – | – | – | Y | – | – |
| Cloudinary | – | Y | ns | – | – | – | – | – |
| **ImpactLens (from the repo)** | **P** (EXIF date only, via Cloudinary; no GPS, no hash) | **Y** | **Y** (LLM ranking; keyword fallback) | **Y** | **Y** | **Y** | **P** (SDG goals per project + coverage view; no IRIS+/GRI) | **–** (none) |

Only the **Photo/video AI** column was checked on every page; other `–` cells mean I did not ask, not that the answer is no.

---

## 3. Where ImpactLens is differentiated, and where it is not

**Differentiated (verified competitor silence + repo fact):**
- Understanding the *content* of photos and video (caption, activity, signals, OCR, video via frame sampling) and turning it into search, before/after comparison and donor-ready copy in one workflow. No verified competitor states any of the first three.
- Reports and campaign copy that are generated from the org's own assets and list them (numbered evidence appendix in the PDF, added in Rev. 4).

**Competitors are stronger (verified):**
- **Proof of capture:** geotag + timestamp (Fulcrum, Sealr, BNZ, Ecodrive), encrypted capture (Tella), satellite MRV (BNZ). ImpactLens has none of these.
- **Offline field use:** Fulcrum, Tella, ReportsAI. ImpactLens has none.
- **Framework alignment:** ReportsAI states SDGs, IRIS+, GRI and ESG; Ecodrive shows SDG badges. ImpactLens has SDG goals only.
- **Price at the text-only end:** ImpactDraft is $9–$49 for report drafts. ImpactLens must justify itself by the media evidence, not the writing.
- **Distribution:** UNDP's catalogue (Sealr), Dimagi and Fulcrum are established. ImpactLens has none; unassessed.

**Do not lead with "AI tagging".** Cloudinary's Plus plan already lists auto-tagging, so a technical team on Cloudinary can get tags without ImpactLens. The claim that holds up is the workflow around the tags: evidence chain → cited report → scheduled delivery.

**Underserved segments (all hypotheses):**
1. Small and mid NGOs with a backlog of field photos and no M&E staff: the priced tools are aimed at teams that collect data (capture, forms) or fund programs (M&E suites).
2. Comms and fundraising staff (ImpactDraft and engage target them, neither grounds copy in the org's media).
3. Corporate CSR teams (BNZ names them): underserved by ImpactLens *today*, because they need verified evidence it cannot yet provide.

**Suggested positioning (hypothesis to test):** *"The report layer for organisations that already have field photos and video: turn a media library into cited, donor-ready evidence."* Avoid positioning as capture, and avoid "AI tagging".

---

## 4. Pricing implications (from `Price Benchmark` and `Cost Inputs`)

| Question | Finding | Basis |
|---|---|---|
| Is Starter priced against a real anchor? | ImpactLens Starter ($31) is about 3.5× ImpactDraft Basic ($9) and 1.6× its Pro ($19). It needs a media-evidence reason to cost more. | Calculated |
| Is Pro coherent? | $83 sits between text-only writers ($9–$49) and Sopact Power ($299) / Fulcrum ($215). | Calculated |
| Is Enterprise "enterprise"? | $208/mo is below Sopact Growth, CommCare Advanced and every DevResults tier. 10 of the 15 priced plans in the benchmark cost more. Either it is under-priced for what it promises, or it is a Pro-plus tier. | Calculated |
| Are margins safe? | Model: 85.6% / 65.2% / 48.7%. At Cloudinary's published rate: 84.2% / 62.7% / 45.7%. If every Pro/Enterprise analysis is a video (up to 6 image inputs each): 6.5% / −66.8%. | Calculated, upper bound |
| Is the Cloudinary cost basis right? | The model says ₹34 per credit. Cloudinary's published $89 for 225 credits is ₹38.0 at the model's own FX rate (₹42.3 if billed monthly). The model understates that cost by 10.5%. | Verified price, calculated |
| Can the plan be enforced? | No. See U3. | Repo |

**Pricing differentiation options (decision needed, none applied):** price the Enterprise tier by a bounded unit (assets analysed, video minutes) with overage, not "unlimited"; add a fence between Starter and ImpactDraft-priced buyers (media analysis and share links only on Pro, as the feature table already does); publish annual-only pricing if monthly plans cost more to serve.

---

## 5. Prioritised upgrades

Effort: S ≤ 2 days · M ≈ 1 week · L > 2 weeks. Items marked **Decision** need an owner's call before work starts.

### P0: blocks credibility or revenue

| ID | Problem | Why it matters | Proposed solution | Expected impact | Data / decision needed | Effort |
|---|---|---|---|---|---|---|
| **U1** | No proof of where or when media was captured, and no tamper evidence. `verified` is a manual boolean; only the EXIF date is stored, and only on the Cloudinary path. | Five verified products lead with geotag/timestamp. Funders ask "how do we know this is real?" | Compute SHA-256 of the original bytes before upload; store it with EXIF GPS + capture time (new `sha256`, `lat`, `lng` columns); show hash and place in the evidence chain and PDF appendix. Local fallback: read EXIF with `sharp`. | Removes the main trust objection to a funder-facing sale; prerequisite for U7. | Schema change (approve). Confirm Cloudinary's GPS field names. | S–M |
| **U2** | Reports ask the model to cite assets by number, but nothing checks it; the PRD's "100% of reports cite ≥ 3 real assets" is neither enforced nor measured. | A donor-facing claim that cannot be traced is the product's main risk. | Ask for structured citations `{claim, assetNumbers[]}`; reject or regenerate if an index is out of range or fewer than 3 distinct assets are cited; render as chips linking to the asset. | Makes "every statement traces to media" true and testable. | None | M |
| **U3** | The pricing model cannot be enforced. There is no plan, quota or overage in the schema; the feature table's limits (250/5,000 assets, seats, 5/100 comparisons, gated features) exist only in the workbook. Enterprise lists SSO/RBAC/audit log as "Phase 2" while being sold. | Cannot invoice, cap cost, or protect the thinnest margin. | `Organization.plan` + an entitlements table; meter units from `AiUsageLog`; define one billable unit for video; block or bill at the limit. | Turns the workbook from a proposal into a product. | **Decision:** unit definitions, overage policy, whether "unlimited" stays. | M–L |

### P1: needed before serious buyers

| ID | Problem | Why it matters | Proposed solution | Expected impact | Data / decision needed | Effort |
|---|---|---|---|---|---|---|
| U4 | AI unit costs are assumptions (₹0.90 per analysis, ₹1.00 per report, ₹0.50 per search) and `AiUsageLog` records no tokens. Cloudinary basis is off by 10.5% (₹34 vs ₹38.0). | Every margin figure rests on them. | Log prompt/completion tokens per call; compute measured ₹ per unit; fill `Cost Inputs` C7–C10; fix or justify C7. | Real gross margin per tier. | **Decision:** which Cloudinary plan/billing to model. Provider price sheet. | S |
| U5 | v1 never analysed Cloudinary as a competitor or supplier, though the problem statement is its track and Plus lists auto-tagging. | A buyer already on Cloudinary can DIY tagging. | Add a "why not just Cloudinary?" answer to the sales material; check add-on prices and Cloudinary's own DAM. | Sharper positioning; avoids a losing feature comparison. | Cloudinary add-on prices (not found on pages read). | S |
| U6 | Framework alignment stops at SDGs. | ReportsAI states SDG/IRIS+/GRI/ESG; Sopact sells "funder-aligned" reporting. | Add IRIS+/GRI tagging to reports beside the existing SDG view. | Closes a visible feature gap for grant-driven buyers. | Confirm IRIS+ catalogue reuse terms. | S–M |
| U7 | No exportable evidence pack. | BNZ states "exportable evidence packs for verification bodies and auditors". | ZIP: report PDF + originals (`originalUrl`) + hashes + CSV manifest. Depends on U1. | Answers the auditor use case. | None | M |
| U8 | Public share page has no images and cannot be embedded (`frame-ancestors 'none'` is set globally). | The donor persona sees text only; Ecodrive advertises embeddable public impact pages. | **Decision** first: show all, verified-only, or no assets. Then add images and an embed route with its own frame policy. | Better donor experience; a partner-site channel. | **Decision:** privacy. | S–M |
| U9 | Price positioning is unsettled (§4). | Starter/Enterprise are the tiers with weak anchors. | Decide the Enterprise unit and the Starter fence before publishing prices. | Defensible price page. | **Decision** | S |
| U10 | v1's "Gap vs ImpactLens" column asserts absences ("no VLM semantic search", "no before/after scoring") that marketing pages cannot prove. | Sales will be surprised in a demo. | Book demos with BNZ Impact, Sopact and ReportsAI; test whether they accept photos and produce change comparisons. | Converts `ns` cells to `Y`/`N`. | Demo access | S |

### P2: useful

| ID | Upgrade | Basis | Effort |
|---|---|---|---|
| U11 | Per-org API key (BYOK): near-zero AI cost for large accounts | ImpactDraft offers 25% off for customers using their own Anthropic key (verified) | M |
| U12 | Import connectors (Fulcrum, CommCare, KoboToolbox exports) instead of building capture and offline | Capture is served by verified incumbents at $0–$1,000/mo; API terms not yet checked | M |
| U13 | WhatsApp delivery of scheduled reports | TextIt $25/mo for 1,000 contacts (verified) is one option; WhatsApp Business API direct is another (unassessed) | S–M |
| U14 | Prompt gallery for campaign copy | engage advertises 80+ prompts (verified) | S |
| U15 | Word export | ImpactDraft's page does not state it; v1 claimed it (prior). Confirm demand first | S |

---

## 6. Corrections to v1

| v1 said | Now |
|---|---|
| Sealr linked to `digitalx.undp.org`; "Ingest only" | That page never mentions Sealr. Its entry is `digitalx.undp.org/catalogs/sealr.html` (© 2022) and describes a searchable, map-based dashboard, so "ingest only" is overstated. |
| Ecodrive ImpactIQ is "closest overlap" | Pages describe a corporate-donation marketplace ($0.45 per impact unit; $50k/yr impact commitment). Reclassified as adjacent. |
| `impact-reporter-ai` (MIT, 0★) | Repository returns HTTP 404. Removed. |
| MEInsight (30★) listed as an option | Last commit 2023-11-08; dormant. |
| DevResults "$28k–91k/yr" | Verified $28,000 / $49,000 / $70,000 for programs up to $5M / $25M / $50M. The $91k figure is unconfirmed. Setup $33.8k–$103.4k confirmed. |
| ImpactDraft: "Word/PDF export + BYOK" | BYOK is a 25% discount code for customers using their own Anthropic key. Word/PDF export is not stated on the page. |
| Group A had no prices | ImpactDraft ($9/$19/$49) and Sopact ($299/$799) publish theirs; BNZ, Sealr, ReportsAI and engage do not. |
| "Ours lacking: export/embed polish" and P0 "report citations back to source media (data already exists)" | PDF export and public share links exist. Since Rev. 4 the PDF lists the numbered source assets with capture date, verification state and `publicId`, and Cloudinary uploads keep the untouched original URL. What is still missing is enforced, sentence-level citation (U2). |
| "Auto-tag findings to SDG" as a new build | Projects already carry SDG goals and the dashboard has an SDG coverage view. What is missing is IRIS+/GRI (U6). |
| "Embeddable widget" as effort S | The app sends `frame-ancestors 'none'` on every route (`next.config.ts`), so an embed needs a separate policy (U8). |
| "Phase 2 (shared with Edge.Mem)" | No context for "Edge.Mem" exists in this repository. Removed until someone can say what it is. |
| Method: "~20 queries, GitHub + web" | GitHub-first search produced 0-star repos as "competitors" and missed commercial tools with public prices. No query log existed. Replaced by per-row sources and dates in the CSV. |
| No pricing or segment data | Added: pricing model, price summary, source URL, verified date and confidence per competitor. |

---

## 7. What was checked and how

- **Read (vendor pages, 2026-09-29):** Ecodrive (`/impactiq`, `/pricing`), BNZ Impact, Sopact (`/`, `/pricing`), ReportsAI (`/`; `/pricing` = 404), ImpactDraft, Sealr (UNDP catalogue), engage, Tella, DevResults, TextIt, Cloudinary, Fulcrum, CommCare.
- **GitHub API:** stars, licence, last push for mirl-aftermath, impact-vision, KoboToolbox, RapidPro, MEInsight, Uwazi; `impact-reporter-ai` = 404.
- **Not verifiable here:** Chauka, MONIC, Amp Impact, Watershed, Persefoni, Sweep (kept as `Low`, never verified).
- **Method limit:** page extraction was summarised by a tool, so exact figures should be re-read on the page before they go in a customer-facing document.

## 8. Unresolved: exact checks still needed

| # | Open item | How to close it |
|---|---|---|
| 1 | DevResults annual fee for programs of $50M–$100M ($91k in v1) | Read the full pricing table by hand |
| 2 | Whether BNZ, Sopact, ReportsAI, Ecodrive accept photos and compare before/after | Product demo or trial |
| 3 | Prices for BNZ Impact, ReportsAI, engage, Sealr | Sales quote |
| 4 | Cloudinary AI add-on prices; Cloudinary DAM as a substitute | Cloudinary docs or account manager |
| 5 | MIRL Aftermath's exact hash algorithm (README uses hash/checksum wording) | Read the source |
| 6 | Chauka, MONIC, Amp Impact, Watershed, Persefoni, Sweep | Verify or drop; they are the least relevant rows |
| 7 | Missing categories: generic DAMs with AI tagging, nonprofit CRMs adding AI, shared drive + general LLM | Research pass; add rows to the CSV |
| 8 | Who actually buys: no customer interviews exist | 5–10 calls with program managers and fundraising staff; test the positioning and the price gap |
| 9 | Real AI cost per unit, Cloudinary plan actually used, tax and payment fees | U4; finance input |

## 9. Keeping it current

- Edit [`competitors.csv`](competitors.csv); it is the source of truth. Set `last_verified` and `confidence` whenever a row is re-read. Do not record a feature as absent because a page is silent: use `ns`.
- Re-verify anything older than 90 days. This lists the stale or never-verified rows:

```bash
python3 -c "import csv,datetime as d;[print(r['id'],r['last_verified'] or 'NEVER') for r in csv.DictReader(open('docs/competitors.csv')) if not r['last_verified'] or (d.date.today()-d.date.fromisoformat(r['last_verified'])).days>90]"
```

- Pricing changes go in the `Price Benchmark` sheet (blue cells), with the source URL and date on the same row.
