# Task 2-b — full-stack-developer (frontend)

## Task
Build the ImpactLens dashboard UI as a single-page Next.js 16 app at
`src/app/page.tsx` with 7 tab-switched views, wired to the backend API
contract, using TanStack Query for server state and Zustand for client state.

## Work Log
- Read prior worklog (`/home/z/my-project/worklog.md`), `src/lib/types.ts`
  (exact data shapes) and `src/lib/ai.ts` (backend AI capabilities) so the
  UI consumes the real return types.
- Inspected existing scaffold: shadcn/ui components in `src/components/ui/`,
  Geist fonts in `layout.tsx`, `useToast` hook, no QueryClient yet, no impact
  components.
- Created `src/app/providers.tsx` (singleton `QueryClientProvider`) and wired
  it into `layout.tsx` (kept Geist fonts + Toaster; updated metadata to
  ImpactLens branding + earthy `bg-stone-50` body).
- Updated `src/app/globals.css` with custom utilities: `.scrollbar-thin`
  (emerald thumb on stone track), `.lift-on-hover` (card hover lift),
  `.hero-gradient` (emerald→teal), and `.markdown-body` typography for
  rendered reports.
- Added `src/lib/store.ts` (Zustand) for `activeTab`, `selectedAssetId`,
  `uploadOpen`, `reportsProjectId`, `reportsComparisonId`, and
  `compareBeforeId`/`compareAfterId` (so CTAs across tabs can pre-select
  state, e.g. clicking "Use in report" from a media card jumps to Reports
  with the project preselected).
- Added `src/lib/api.ts` (typed fetchers + `MediaQuery` builder) and
  `src/lib/format.ts` (date / timeAgo / pct / bytes / truncate helpers).
- Added `src/components/impactlens/impact-hooks.ts` with TanStack Query hooks
  (`useAnalytics`, `useMedia`, `useMediaById`, `useProjects`, `useReports`,
  `useComparisons`, `useSearch`, `useSeedData`) and mutations
  (`useCreateMedia`, `useAnalyzeMedia`, `useDeleteMedia`, `useCreateProject`,
  `useCreateComparison`, `useCreateReport`, `useCreateCampaign`). Query keys
  are centralized in `qk`. Mutations invalidate the right query families on
  success so the UI stays consistent.
- Built UI primitives: `CategoryBadge.tsx` (earthy color map per category —
  reforestation=emerald, solar=amber, water=teal, education=stone, cleanup=
  cyan, agriculture=lime, infrastructure=stone, conservation=green, community=
  rose, energy=orange, other=stone; NO indigo/blue), `ConfidenceBar.tsx`
  (emerald ≥0.7, amber 0.4–0.7, red <0.4), `EmptyState.tsx`,
  `MarkdownRenderer.tsx` (react-markdown styled via `.markdown-body`).
- Built `MediaCard.tsx` (thumbnail, category badge, verified check, location,
  confidence bar, tags, hover quick-actions: View / Compare / dropdown with
  Use-in-report, Set-as-Before, Set-as-After), `MediaCardSkeleton`,
  `ProjectCard.tsx` (cover, status badge, SDG chips, asset count, date range),
  `ProjectCardSkeleton`.
- Built `AssetDrawer.tsx` — a right-side `Sheet` showing the full asset:
  image, AI caption/summary/description, metadata grid (project, location,
  activity, captured, confidence, quality, mood, analyzed), detected signals
  with per-signal confidence bars, objects, tags, OCR text, before/after pair
  info, and a vertical traceability timeline built from
  `transformations[]`. Includes Re-analyze (POST /api/analyze/[id]) and
  Delete (DELETE /api/media/[id]) actions with toast feedback.
- Built `UploadDialog.tsx` — three modes (Upload file → base64 data URL;
  Paste URL; Generate via prompt). All modes share title / project / pair
  role / capture date fields. Upload & URL modes call `POST /api/media`
  then auto-run `POST /api/analyze/[id]`. Generate mode calls
  `POST /api/media/generate` (see assumptions below).
- Built `Header.tsx` (sticky, brand mark, desktop nav, mobile Sheet menu,
  primary "Analyze media" CTA) and `Footer.tsx` (mt-auto sticky footer with
  platform info, "Built with <provider>", sample-data disclaimer).
- Built the seven tabs:
  - `OverviewTab.tsx`: hero gradient band + 2 CTAs, 6 KPI stat cards (Total,
    Analyzed, Active projects, Reports, Verified, Avg impact score), recharts
    horizontal bar chart of media-by-category (emerald/amber/teal/lime
    palette), recent-activity feed (icon + timeAgo), active-projects preview
    (top 3), and a "Load sample data" CTA visible only when the library is
    empty (calls `POST /api/seed`).
  - `LibraryTab.tsx`: filter bar (debounced search, category / source / sort
    selects, verified-only switch, reset), primary "Analyze new media"
    button, asset grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
    xl:grid-cols-4`), and a "Load more" pagination button that increments
    `limit`. Clicking a card opens the global AssetDrawer.
  - `ProjectsTab.tsx`: project grid + "New project" dialog (name, description,
    location, region, category, status, startDate, endDate, sdgGoals,
    coverUrl). Clicking a project opens a right-side `Sheet` with metadata,
    SDG chips, the project's media, and a "Generate impact report" button
    that jumps to Reports with the project preselected.
  - `CompareTab.tsx`: two drop-zone cards (Before / After) that open a media
    picker dialog. Generate button → `POST /api/compare`. Result view uses a
    draggable range-input divider slider to wipe between before/after images,
    shows AI narrative, change list (each with direction icon ↑→↓ colored
    emerald/stone/rose and magnitude badge), and impact-score gauge. Past
    comparisons grid at the bottom uses the embedded `before`/`after` assets
    returned by `GET /api/comparisons` (no extra fetches per card).
  - `ReportsTab.tsx`: form (type / tone / project / audience / multi-select
    media list with thumbnails + checkboxes) and result panel rendered with
    `MarkdownRenderer`. Loading state with sparkle pulse animation. Copy
    markdown + Download .md buttons. Past reports grid on the side.
    Preselected project from `reportsProjectId` is honored on mount.
  - `SearchTab.tsx`: big search bar, example query chips, calls
    `POST /api/search`, results grid with score badge (emerald ≥70%,
    amber 40–70%, stone <40%) and reason chip overlay on each card.
  - `CampaignTab.tsx`: platform picker (Instagram / Twitter / LinkedIn /
    Newsletter, each with char limit), tone, project, multi-select media.
    Generate → `POST /api/campaign`. Result shows headline, caption with
    live char counter vs. platform limit, suggested hashtag chips (parsed
    from narrative), suggested image carousel, full markdown narrative, and
    CTA banner. Copy buttons throughout.
- Wrote `src/app/page.tsx` orchestrator: root wrapper
  `min-h-screen flex flex-col bg-stone-50`, sticky Header, main `flex-1`,
  Footer with `mt-auto`, `AnimatePresence` tab transitions (fade + slide),
  and the global `AssetDrawer` + `UploadDialog` overlays mounted once.

## Stage Summary

### Files created
- `src/app/providers.tsx` — QueryClientProvider wrapper (singleton client).
- `src/lib/store.ts` — Zustand store (tab + asset + upload + report/compare presets).
- `src/lib/api.ts` — typed API client + `MediaQuery` builder + `ComparisonWithAssets`.
- `src/lib/format.ts` — date / timeAgo / pct / bytes / truncate / initials helpers.
- `src/components/impactlens/impact-hooks.ts` — TanStack Query hooks + mutations.
- `src/components/impactlens/CategoryBadge.tsx`
- `src/components/impactlens/ConfidenceBar.tsx`
- `src/components/impactlens/EmptyState.tsx`
- `src/components/impactlens/MarkdownRenderer.tsx`
- `src/components/impactlens/MediaCard.tsx`
- `src/components/impactlens/ProjectCard.tsx`
- `src/components/impactlens/AssetDrawer.tsx`
- `src/components/impactlens/UploadDialog.tsx`
- `src/components/impactlens/Header.tsx`
- `src/components/impactlens/Footer.tsx`
- `src/components/impactlens/OverviewTab.tsx`
- `src/components/impactlens/LibraryTab.tsx`
- `src/components/impactlens/ProjectsTab.tsx`
- `src/components/impactlens/CompareTab.tsx`
- `src/components/impactlens/ReportsTab.tsx`
- `src/components/impactlens/SearchTab.tsx`
- `src/components/impactlens/CampaignTab.tsx`
- `agent-ctx/README.md` + this file.

### Files modified
- `src/app/layout.tsx` — wrap children in `<Providers>`, keep Geist fonts +
  Toaster, retarget metadata to ImpactLens, set body `bg-stone-50`.
- `src/app/globals.css` — added `.scrollbar-thin`, `.lift-on-hover`,
  `.hero-gradient`, `.markdown-body` typography rules.
- `src/app/page.tsx` — replaced placeholder with the full dashboard.

### Key decisions
- **File upload approach**: chosen the **base64 data-URL** path (browser
  reads the file via `FileReader.readAsDataURL`, POSTs JSON `{url:
  "data:image/...;base64,..."}` to `/api/media`). The backend already
  supports this — see `decodeDataUrl` in `src/app/api/media/route.ts`. No
  multipart handling needed.
- **Comparison list & create** return `{...ComparisonResult, before, after}`
  with the embedded `MediaAsset`s. The frontend type
  `ComparisonWithAssets` extends `ComparisonResult` to include those, so the
  past-comparisons grid renders thumbnails without per-card fetches. (Backend
  implemented by Task 3 already does this — verified in
  `src/app/api/comparisons/route.ts` and `src/app/api/compare/route.ts`.)
- **Semantic search** assumes backend returns `{hits: [{asset: MediaAsset,
  score, reason}]}`. Backend `src/app/api/search/route.ts` confirms this
  shape — no client-side id-batching needed.
- **Avg impact score** KPI: `Analytics` type in `types.ts` doesn't expose
  `avgImpactScore`. The frontend defensively reads
  `(analytics as any).avgImpactScore` and falls back to
  `verifiedAssets / totalAssets` so the card shows something useful either
  way. If Task 3 wants to surface a real avg-impact-score, just add the field
  to `Analytics` and the route.
- **Asset drawer** is a globally-mounted Sheet driven by
  `useImpactStore.selectedAssetId`, so any media card anywhere in the app
  can pop it. Same pattern for the `UploadDialog`.
- **Animations**: framer-motion `motion.div` with `layout` on grids +
  `AnimatePresence mode="wait"` for tab transitions. Card hover uses a CSS
  `.lift-on-hover` utility for performance.

### Assumptions / outstanding items for the backend (Task 3)
- **`POST /api/media/generate`** is called by the UploadDialog's "Generate"
  mode with body `{prompt, title?, projectId?, pairRole?, captureDate?,
  analyze: true}` and expected to return a fully-analyzed `MediaAsset`. As of
  writing, the route does not exist (only `/api/media` and `/api/media/[id]`
  are present). The frontend handles a 404/500 gracefully with a toast, but
  implementing this endpoint will unlock the generate-from-prompt flow.
  Suggested impl: call `generateImage(prompt)` from `src/lib/ai.ts`, save
  via `saveUpload(buffer, "png")`, create the `MediaAsset`, optionally call
  `analyzeImage`, return serialized asset. The seed route already does
  something similar.
- All other endpoints in the contract are implemented and verified working
  against the dev server (analytics, media list/get/delete/analyze, projects
  list/create/delete, comparisons list/create, reports list/create, search,
  campaign, seed).

### Lint
- `bun run lint` is clean (0 errors, 0 warnings) after `--fix` removed
  unused `@next/next/no-img-element` disable directives (the rule isn't
  active in this project's eslint config).
- Dev server recompiles cleanly and `GET /` returns 200 with the full
  Overview tab HTML (verified key strings: "ImpactLens", "Turn field media
  into measurable impact.", "Analyze new media", "Media by category",
  "Recent activity", "Active projects", etc.).
