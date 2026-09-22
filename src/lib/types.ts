// Shared types for ImpactLens media intelligence platform

export type MediaType = "image" | "video";
export type AssetSource = "upload" | "generated" | "web-search";
export type PairRole = "before" | "after" | null;
export type ProjectStatus = "active" | "completed" | "planning";

export interface VisualSignal {
  label: string;
  confidence: number;
  category: "environment" | "infrastructure" | "people" | "activity" | "condition";
}

export interface DetectedObject {
  name: string;
  count?: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
}

export interface TransformStep {
  type: string; // upload, resize, ai-analyze, enhance, crop
  at: string; // ISO timestamp
  params?: Record<string, unknown>;
  note?: string;
}

export interface MediaAsset {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;

  aiCaption: string | null;
  aiSummary: string | null;
  aiDescription: string | null;
  projectName: string | null;
  location: string | null;
  activity: string | null;
  category: string | null;
  signals: VisualSignal[];
  objects: DetectedObject[];
  tags: string[];
  mood: string | null;
  confidence: number | null;
  ocrText: string | null;
  qualityScore: number | null;

  source: AssetSource | null;
  originalUrl: string | null;
  transformations: TransformStep[];
  captureDate: string | null;
  verified: boolean;
  favorite: boolean;
  analyzedAt: string | null;

  projectId: string | null;
  pairGroup: string | null;
  pairRole: PairRole;

  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  region: string | null;
  category: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  sdgGoals: string | null;
  coverUrl: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  assetCount?: number;
}

export interface SavedSearch {
  id: string;
  query: string;
  label: string | null;
  hitCount: number;
  results: { assetId: string; score: number; reason: string }[];
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  type: "impact" | "summary" | "campaign" | "comparison";
  projectId: string | null;
  headline: string | null;
  summary: string;
  narrative: string | null;
  metrics: Record<string, string | number> | null;
  mediaIds: string[];
  callToAction: string | null;
  tone: string | null;
  createdAt: string;
}

export interface ComparisonResult {
  id: string;
  beforeId: string;
  afterId: string;
  projectId: string | null;
  narrative: string | null;
  changes: ChangeItem[];
  impactScore: number | null;
  createdAt: string;
}

export interface ChangeItem {
  aspect: string;
  before: string;
  after: string;
  direction: "improved" | "declined" | "unchanged";
  magnitude: "minor" | "moderate" | "major";
}

export interface Analytics {
  totalAssets: number;
  analyzedAssets: number;
  totalProjects: number;
  activeProjects: number;
  totalReports: number;
  comparisons: number;
  verifiedAssets: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  recentActivity: { id: string; label: string; at: string; kind: string }[];
}
