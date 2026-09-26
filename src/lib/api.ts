import type {
  Analytics,
  ComparisonResult,
  MediaAsset,
  Project,
  Report,
  SavedSearch,
} from "@/lib/types";

/** Generic fetcher that throws on non-OK responses. */
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/auth";
    throw new Error("401 Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
    );
  }
  return (await res.json()) as T;
}

// ----------------- Analytics -----------------
export const fetchAnalytics = () => fetcher<Analytics>("/api/analytics");

// ----------------- Media -----------------
export interface MediaQuery {
  projectId?: string;
  category?: string;
  source?: string;
  search?: string;
  verified?: boolean;
  favorite?: boolean;
  sort?: string; // newest | oldest | confidence | quality
  limit?: number;
  ids?: string; // comma-separated
  dateFrom?: string; // ISO date — filter captureDate >=
  dateTo?: string; // ISO date — filter captureDate <=
}

export function buildMediaQuery(q: MediaQuery = {}) {
  const p = new URLSearchParams();
  if (q.projectId) p.set("projectId", q.projectId);
  if (q.category && q.category !== "all") p.set("category", q.category);
  if (q.source && q.source !== "all") p.set("source", q.source);
  if (q.search) p.set("search", q.search);
  if (typeof q.verified === "boolean") p.set("verified", String(q.verified));
  if (typeof q.favorite === "boolean") p.set("favorite", String(q.favorite));
  if (q.sort) p.set("sort", q.sort);
  if (q.limit) p.set("limit", String(q.limit));
  if (q.ids) p.set("ids", q.ids);
  if (q.dateFrom) p.set("dateFrom", q.dateFrom);
  if (q.dateTo) p.set("dateTo", q.dateTo);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const fetchMedia = (q: MediaQuery = {}) =>
  fetcher<MediaAsset[]>(`/api/media${buildMediaQuery(q)}`);

export const fetchMediaById = (id: string) =>
  fetcher<MediaAsset>(`/api/media/${id}`);

export interface CreateMediaInput {
  url: string;
  title?: string;
  source?: string;
  projectId?: string;
  pairGroup?: string;
  pairRole?: "before" | "after" | null;
  captureDate?: string;
}

export const createMedia = (body: CreateMediaInput) =>
  fetcher<MediaAsset>("/api/media", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const analyzeMedia = (id: string) =>
  fetcher<MediaAsset>(`/api/analyze/${id}`, { method: "POST" });

export const deleteMedia = (id: string) =>
  fetcher<{ ok: true }>(`/api/media/${id}`, { method: "DELETE" });

// ----------------- Favorite toggle -----------------
export const toggleFavorite = (id: string, favorite?: boolean) =>
  fetcher<MediaAsset>("/api/media/favorite", {
    method: "POST",
    body: JSON.stringify({ id, favorite }),
  });

// ----------------- Bulk actions -----------------
export type BulkAction = "analyze" | "verify" | "unverify" | "delete" | "assign" | "favorite" | "unfavorite";

export interface BulkActionInput {
  ids: string[];
  action: BulkAction;
  projectId?: string;
}

export interface BulkActionResult {
  action: string;
  processed: number;
  failed: number;
  results?: { id: string; ok: boolean; error?: string }[];
}

export const bulkMediaAction = (body: BulkActionInput) =>
  fetcher<BulkActionResult>("/api/media/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Projects -----------------
export const fetchProjects = () => fetcher<Project[]>("/api/projects");

export interface CreateProjectInput {
  name: string;
  description?: string;
  location?: string;
  region?: string;
  category?: string;
  status?: "active" | "completed" | "planning";
  startDate?: string;
  endDate?: string;
  sdgGoals?: string;
  coverUrl?: string;
}

export const createProject = (body: CreateProjectInput) =>
  fetcher<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Comparisons -----------------
// Both the list and create endpoints include `before` and `after` MediaAsset
// records alongside the ComparisonResult, so the frontend can render
// thumbnails without extra round-trips.
export interface ComparisonWithAssets extends ComparisonResult {
  before?: MediaAsset | null;
  after?: MediaAsset | null;
}

export const fetchComparisons = () =>
  fetcher<ComparisonWithAssets[]>("/api/comparisons");

export const createComparison = (body: {
  beforeId: string;
  afterId: string;
  projectId?: string;
}) =>
  fetcher<ComparisonWithAssets>("/api/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Report schedules -----------------
export interface ReportSchedule {
  id: string;
  name: string | null;
  type: string;
  tone: string;
  projectId: string | null;
  audience: string | null;
  everyDays: number;
  emailTo: string | null;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export interface CreateScheduleInput {
  name?: string;
  type?: string;
  tone?: string;
  projectId?: string;
  audience?: string;
  everyDays?: number;
  emailTo?: string;
}

export const fetchSchedules = () => fetcher<ReportSchedule[]>("/api/schedules");

export const createSchedule = (body: CreateScheduleInput) =>
  fetcher<ReportSchedule>("/api/schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateSchedule = (id: string, body: Partial<CreateScheduleInput> & { active?: boolean }) =>
  fetcher<ReportSchedule>(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteSchedule = (id: string) =>
  fetcher<{ ok: boolean }>(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

// ----------------- Auth / orgs -----------------
export interface OrgMembership {
  id: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
}

export const fetchOrgs = () => fetcher<OrgMembership[]>("/api/auth/orgs");

// ----------------- Reports -----------------
export const fetchReports = () => fetcher<Report[]>("/api/reports");

export interface CreateReportInput {
  type: "impact" | "summary" | "campaign" | "comparison";
  tone: "professional" | "emotional" | "data-driven";
  projectId?: string;
  assetIds: string[];
  audience?: string;
  comparisonId?: string;
  /** 1-4 drafts, each with a distinct angle. 1 (default) returns a single Report. */
  variantCount?: number;
  angles?: string[];
}

export interface MultiReportResponse {
  reports: Report[];
  warning?: string;
}

export const createReport = (body: CreateReportInput) =>
  fetcher<Report | MultiReportResponse>("/api/report", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Campaign -----------------
export interface CreateCampaignInput {
  projectId?: string;
  assetIds: string[];
  platform: "instagram" | "twitter" | "linkedin" | "newsletter";
  tone: "professional" | "emotional" | "data-driven";
}

export const createCampaign = (body: CreateCampaignInput) =>
  fetcher<Report>("/api/campaign", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Semantic Search -----------------
export interface SearchHit {
  asset: MediaAsset;
  score: number;
  reason: string;
}

export interface SearchResponse {
  hits: SearchHit[];
}

export const semanticSearch = (query: string, limit = 24) =>
  fetcher<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  });

// ----------------- Saved Searches -----------------
export const fetchSavedSearches = () =>
  fetcher<SavedSearch[]>("/api/searches");

export const saveSearch = (body: {
  query: string;
  label?: string;
  results: { assetId: string; score: number; reason: string }[];
}) =>
  fetcher<SavedSearch>("/api/searches", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteSavedSearch = (id: string) =>
  fetcher<{ ok: true }>(`/api/searches/${id}`, { method: "DELETE" });

// ----------------- Report PDF -----------------
export const reportPdfUrl = (id: string) => `/api/report-pdf?id=${encodeURIComponent(id)}`;

// ----------------- Media CSV Export -----------------
export function mediaExportUrl(q: MediaQuery = {}): string {
  return `/api/media/export${buildMediaQuery(q)}`;
}

// ----------------- Campaign Variants -----------------
export interface CampaignVariant {
  angle: string;
  headline: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export interface CampaignVariantsResponse {
  variants: CampaignVariant[];
}

export const generateCampaignVariants = (body: {
  projectId?: string;
  assetIds: string[];
  platform: "instagram" | "twitter" | "linkedin" | "newsletter";
  tone: "professional" | "emotional" | "data-driven";
}) =>
  fetcher<CampaignVariantsResponse>("/api/campaign/variants", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Project Comparison -----------------
export interface ProjectComparisonStats {
  assetCount: number;
  analyzed: number;
  verified: number;
  avgConfidence: number | null;
  uniqueCategories: number;
}

export interface ProjectComparisonResponse {
  a: Project;
  b: Project;
  aAssets: MediaAsset[];
  bAssets: MediaAsset[];
  sharedSdgs: string[];
  sharedCategories: string[];
  sharedLocations: string[];
  aOnlyCategories: string[];
  bOnlyCategories: string[];
  stats: { a: ProjectComparisonStats; b: ProjectComparisonStats };
  summary: string;
}

export const compareProjects = (body: { projectIdA: string; projectIdB: string }) =>
  fetcher<ProjectComparisonResponse>("/api/projects/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----------------- Project Leaderboard -----------------
export interface LeaderboardTrend {
  direction: "up" | "down" | "flat";
  delta: number;
  current: number;
  previous: number;
  periodDays: number;
}

export interface LeaderboardEntry {
  project: Project;
  rank: number;
  score: number;
  breakdown: {
    total: number;
    volume: number;
    analysis: number;
    verification: number;
    sdg: number;
  };
  assetCount: number;
  analyzedCount: number;
  verifiedCount: number;
  sdgCount: number;
  trend: LeaderboardTrend;
}

export const fetchLeaderboard = (limit = 10) =>
  fetcher<LeaderboardEntry[]>(`/api/projects/leaderboard?limit=${limit}`);

// ----------------- Asset Notes -----------------
export interface AssetNote {
  id: string;
  assetId: string;
  body: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchNotes = (assetId: string) =>
  fetcher<AssetNote[]>(`/api/notes?assetId=${encodeURIComponent(assetId)}`);

export const createNote = (body: { assetId: string; body: string; author?: string }) =>
  fetcher<AssetNote>("/api/notes", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateNote = (id: string, body: string) =>
  fetcher<AssetNote>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });

export const deleteNote = (id: string) =>
  fetcher<{ ok: true }>(`/api/notes/${id}`, { method: "DELETE" });

// ----------------- Report Clone -----------------
export const cloneReport = (id: string) =>
  fetcher<Report>("/api/report/clone", {
    method: "POST",
    body: JSON.stringify({ id }),
  });

// ----------------- Seed -----------------
export const seedSampleData = () =>
  fetcher<{ ok: true; count: number }>("/api/seed", { method: "POST" });
