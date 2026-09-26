// GET  /api/media        — list/filter media assets
// POST /api/media        — create a media asset (optionally analyze immediately)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeMedia, saveUpload } from "@/lib/ai";
import { serializeAsset } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";

function rand(len: number) {
  return Math.random().toString(36).slice(2, 2 + len);
}

// Decode a data: URL into a buffer + extension.
function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/([a-zA-Z0-9.+-]+));base64,(.+)$/);
  if (!m) return null;
  const mimeSub = m[2].toLowerCase();
  const ext = mimeSub === "jpeg" ? "jpg" : mimeSub === "svg+xml" ? "svg" : mimeSub;
  return { buffer: Buffer.from(m[3], "base64"), ext };
}

// Apply VLM analysis result to a Prisma update payload.
function analysisToData(a: Awaited<ReturnType<typeof analyzeMedia>>) {
  return {
    aiCaption: a.caption,
    aiSummary: a.summary,
    aiDescription: a.description,
    projectName: a.projectName,
    location: a.location,
    activity: a.activity,
    category: a.category,
    signals: JSON.stringify(a.signals),
    objects: JSON.stringify(a.objects),
    tagsCsv: a.tags.join(", "),
    mood: a.mood,
    confidence: a.confidence,
    ocrText: a.ocrText || null,
    qualityScore: a.qualityScore,
    analyzedAt: new Date(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const projectId = sp.get("projectId") || undefined;
    const category = sp.get("category") || undefined;
    const source = sp.get("source") || undefined;
    const search = sp.get("search") || undefined;
    const verified = sp.get("verified");
    const favorite = sp.get("favorite");
    const sort = sp.get("sort") || "newest";
    const limitRaw = sp.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 50)) : 50;
    const idsParam = sp.get("ids");
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;

    const where: Prisma.MediaAssetWhereInput = {};
    if (projectId) where.projectId = projectId;
    if (category) where.category = category;
    if (source) where.source = source;
    if (verified === "true") where.verified = true;
    if (verified === "false") where.verified = false;
    if (favorite === "true") where.favorite = true;
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length) where.id = { in: ids };
    }
    // Date-range filter: prefer captureDate, fall back to createdAt.
    if (dateFrom || dateTo) {
      const range: { gte?: Date; lte?: Date } = {};
      if (dateFrom) range.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        // include the whole day
        end.setUTCHours(23, 59, 59, 999);
        range.lte = end;
      }
      where.OR = [
        { captureDate: { ...range } },
        { captureDate: null, createdAt: { ...range } },
      ];
    }
    if (search && !where.OR) {
      where.OR = [
        { title: { contains: search } },
        { tagsCsv: { contains: search } },
        { location: { contains: search } },
        { activity: { contains: search } },
        { projectName: { contains: search } },
        { aiCaption: { contains: search } },
      ];
    } else if (search) {
      // combine: search must match AND date range must match. Prisma doesn't allow
      // two OR clauses on the same level, so nest search into AND.
      const dateOr = where.OR;
      where.OR = undefined;
      where.AND = [
        { OR: dateOr },
        {
          OR: [
            { title: { contains: search } },
            { tagsCsv: { contains: search } },
            { location: { contains: search } },
            { activity: { contains: search } },
            { projectName: { contains: search } },
            { aiCaption: { contains: search } },
          ],
        },
      ];
    }

    const orderBy: Prisma.MediaAssetOrderByWithRelationInput =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "confidence"
          ? { confidence: "desc" }
          : sort === "quality"
            ? { qualityScore: "desc" }
            : { createdAt: "desc" };

    const rows = await db.mediaAsset.findMany({
      where,
      orderBy,
      take: limit,
      include: { project: true },
    });

    return NextResponse.json(rows.map(serializeAsset));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.url) {
      return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
    }
    const {
      url: rawUrl,
      title,
      source,
      projectId,
      pairGroup,
      pairRole,
      captureDate,
      autoAnalyze,
    } = body as {
      url: string;
      title?: string;
      source?: string;
      projectId?: string;
      pairGroup?: string;
      pairRole?: "before" | "after";
      captureDate?: string;
      autoAnalyze?: boolean;
    };

    let finalUrl = rawUrl;
    let bytes: number | null = null;
    let format: string | null = null;

    if (rawUrl.startsWith("data:")) {
      const decoded = decodeDataUrl(rawUrl);
      if (!decoded) {
        return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
      }
      const saved = saveUpload(decoded.buffer, decoded.ext);
      finalUrl = saved.url;
      bytes = decoded.buffer.length;
      format = decoded.ext;
    } else {
      // Try to derive format from URL
      const m = rawUrl.match(/\.(png|jpe?g|webp|gif|svg|bmp|avif)(?:\?|$)/i);
      if (m) format = m[1].toLowerCase().replace("jpeg", "jpg");
    }

    const publicId = `impactlens/${Date.now()}-${rand(6)}`;
    const now = new Date();

    const transforms = [
      { type: "upload", at: now.toISOString(), note: source || (rawUrl.startsWith("data:") ? "browser upload" : "external url") },
    ];

    // Detect video from format/extension
    const isVideo = ["mp4", "avi", "mov", "webm", "mkv", "flv", "wmv", "m4v", "3gp"].includes(format || "");
    const mediaType = isVideo ? "video" : "image";

    const createData: Prisma.MediaAssetCreateInput = {
      publicId,
      title: title || "Untitled asset",
      type: mediaType,
      url: finalUrl,
      format,
      bytes,
      source: source || "upload",
      originalUrl: rawUrl.startsWith("data:") ? null : rawUrl,
      transformations: JSON.stringify(transforms),
      verified: false,
      captureDate: captureDate ? new Date(captureDate) : null,
      pairGroup: pairGroup || null,
      pairRole: pairRole || null,
      project: projectId ? { connect: { id: projectId } } : undefined,
    };

    let asset = await db.mediaAsset.create({ data: createData, include: { project: true } });

    if (autoAnalyze) {
      try {
        const analysis = await analyzeMedia(finalUrl, mediaType as "image" | "video");
        const updated = await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            ...analysisToData(analysis),
            title: title ? asset.title : analysis.caption.slice(0, 80),
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: "VLM analysis on upload" },
            ]),
          },
          include: { project: true },
        });
        asset = updated;
      } catch (e) {
        // Swallow analysis error — asset still exists. Mark as failed transform.
        const msg = e instanceof Error ? e.message : "analyze failed";
        await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: `failed: ${msg}` },
            ]),
          },
        });
      }
    }

    return NextResponse.json(serializeAsset(asset), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
