// Serializer: Prisma records → frontend-facing types (types.ts)
// Centralizes JSON parsing (signals/objects/transformations), tagsCsv splitting,
// Date→ISO conversion, and assetCount aggregation so every API route returns
// consistent shapes the frontend (and TanStack Query) can rely on.

import type {
  MediaAsset,
  Project,
  Report,
  VisualSignal,
  DetectedObject,
  TransformStep,
  ComparisonResult,
  ChangeItem,
  PairRole,
  AssetSource,
  MediaType,
  ProjectStatus,
} from "@/lib/types";

type PrismaMedia = {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  type: string;
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
  signals: string | null;
  objects: string | null;
  tagsCsv: string | null;
  mood: string | null;
  confidence: number | null;
  ocrText: string | null;
  qualityScore: number | null;

  source: string | null;
  originalUrl: string | null;
  transformations: string | null;
  captureDate: Date | null;
  verified: boolean;
  analyzedAt: Date | null;

  projectId: string | null;
  pairGroup: string | null;
  pairRole: string | null;

  createdAt: Date;
  updatedAt: Date;
};

type PrismaProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  region: string | null;
  category: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  sdgGoals: string | null;
  coverUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  assets?: unknown[];
  _count?: { assets: number };
  assetCount?: number;
};

type PrismaReport = {
  id: string;
  title: string;
  type: string;
  projectId: string | null;
  headline: string | null;
  summary: string;
  narrative: string | null;
  metrics: string | null;
  mediaIds: string | null;
  callToAction: string | null;
  tone: string | null;
  createdAt: Date;
};

type PrismaComparison = {
  id: string;
  beforeId: string;
  afterId: string;
  projectId: string | null;
  narrative: string | null;
  changes: string | null;
  impactScore: number | null;
  createdAt: Date;
};

function safeParseArray<T>(raw: string | null, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseTags(csv: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function serializeAsset(p: PrismaMedia): MediaAsset {
  const signals = safeParseArray<VisualSignal>(p.signals, []);
  const objects = safeParseArray<DetectedObject>(p.objects, []);
  const transformations = safeParseArray<TransformStep>(p.transformations, []);
  const tags = parseTags(p.tagsCsv);

  return {
    id: p.id,
    publicId: p.publicId,
    title: p.title,
    description: p.description,
    type: (p.type as MediaType) ?? "image",
    url: p.url,
    thumbnailUrl: p.thumbnailUrl,
    format: p.format,
    width: p.width,
    height: p.height,
    bytes: p.bytes,

    aiCaption: p.aiCaption,
    aiSummary: p.aiSummary,
    aiDescription: p.aiDescription,
    projectName: p.projectName,
    location: p.location,
    activity: p.activity,
    category: p.category,
    signals,
    objects,
    tags,
    mood: p.mood,
    confidence: p.confidence,
    ocrText: p.ocrText,
    qualityScore: p.qualityScore,

    source: (p.source as AssetSource) ?? null,
    originalUrl: p.originalUrl,
    transformations,
    captureDate: iso(p.captureDate),
    verified: p.verified,
    analyzedAt: iso(p.analyzedAt),

    projectId: p.projectId,
    pairGroup: p.pairGroup,
    pairRole: (p.pairRole as PairRole) ?? null,

    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeProject(p: PrismaProject): Project {
  let assetCount: number | undefined;
  if (typeof p.assetCount === "number") assetCount = p.assetCount;
  else if (p._count && typeof p._count.assets === "number")
    assetCount = p._count.assets;
  else if (Array.isArray(p.assets)) assetCount = p.assets.length;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    location: p.location,
    region: p.region,
    category: p.category,
    status: (p.status as ProjectStatus) ?? "active",
    startDate: iso(p.startDate),
    endDate: iso(p.endDate),
    sdgGoals: p.sdgGoals,
    coverUrl: p.coverUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    assetCount,
  };
}

export function serializeReport(p: PrismaReport): Report {
  let metrics: Record<string, string | number> | null = null;
  if (p.metrics) {
    try {
      const v = JSON.parse(p.metrics);
      if (v && typeof v === "object" && !Array.isArray(v))
        metrics = v as Record<string, string | number>;
    } catch {
      metrics = null;
    }
  }
  const mediaIds = safeParseArray<string>(p.mediaIds, []);
  return {
    id: p.id,
    title: p.title,
    type: (p.type as Report["type"]) ?? "impact",
    projectId: p.projectId,
    headline: p.headline,
    summary: p.summary,
    narrative: p.narrative,
    metrics,
    mediaIds,
    callToAction: p.callToAction,
    tone: p.tone,
    createdAt: p.createdAt.toISOString(),
  };
}

export function serializeComparison(p: PrismaComparison): ComparisonResult {
  const changes = safeParseArray<ChangeItem>(p.changes, []);
  return {
    id: p.id,
    beforeId: p.beforeId,
    afterId: p.afterId,
    projectId: p.projectId,
    narrative: p.narrative,
    changes,
    impactScore: p.impactScore,
    createdAt: p.createdAt.toISOString(),
  };
}
