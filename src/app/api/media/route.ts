// GET  /api/media        — list/filter media assets
// POST /api/media        — create a media asset (optionally analyze immediately)
import { NextRequest, NextResponse } from "next/server";
import { db, orgOwnsProject } from "@/lib/db";
import { analyzeMedia, isVideoMedia, saveUpload } from "@/lib/ai";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { serializeAsset } from "@/lib/serialize";
import { withAiScope } from "@/lib/ai-usage";
import type { Prisma } from "@prisma/client";
import { posix } from "node:path";

function rand(len: number) {
  return Math.random().toString(36).slice(2, 2 + len);
}

// Decode a data: URL into a buffer + extension (images and videos).
const MIME_EXT: Record<string, string> = {
  jpeg: "jpg",
  quicktime: "mov",
  "x-matroska": "mkv",
  "3gpp": "3gp",
  "x-msvideo": "avi",
  "mp2t": "mpg",
};
const UPLOAD_EXTS = new Set(["png", "jpg", "webp", "gif", "avif", "bmp", "heic", "heif", "tiff", "mp4", "webm", "mov", "m4v", "mkv", "avi", "3gp", "mpg"]);
function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = dataUrl.match(/^data:((?:image|video)\/([a-zA-Z0-9.+-]+));base64,(.+)$/);
  if (!m) return null;
  const mimeSub = m[2].toLowerCase();
  // SECURITY: the subtype becomes the saved file's extension — allowlist media only.
  // SVG carries script, and `data:image/html` would land as upload_*.html, which
  // the static layer serves as text/html after a restart (stored XSS).
  const ext = MIME_EXT[mimeSub] || mimeSub;
  if (!UPLOAD_EXTS.has(ext)) return null;
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
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

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

    const where: Prisma.MediaAssetWhereInput = { orgId: auth.orgId };
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
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    // reject oversized payloads before buffering the body
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > 15_000_000) {
      return NextResponse.json({ error: "File too large — maximum 10MB" }, { status: 413 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.url || typeof body.url !== "string") {
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

    if (projectId && !(await orgOwnsProject(auth.orgId, projectId))) {
      return NextResponse.json({ error: "Unknown project" }, { status: 400 });
    }

    // SECURITY: /uploads/* files belong to the org whose upload created them; a
    // client-supplied path there would let another org read (analyze, /uploads
    // route) or unlink them. Normalized + lowercased: the FS may be case-insensitive.
    if (posix.normalize("/" + rawUrl).toLowerCase().startsWith("/uploads/")) {
      return NextResponse.json({ error: "url must be a data: or http(s) URL" }, { status: 400 });
    }

    let finalUrl = rawUrl;
    let bytes: number | null = null;
    let format: string | null = null;
    let cloudPublicId: string | null = null;

    if (rawUrl.startsWith("data:")) {
      // ponytail: cap inline uploads at ~10MB binary (base64 ≈ 4/3 + prefix);
      // remote URLs are not size-checked here.
      if (rawUrl.length > 14_000_000) {
        return NextResponse.json({ error: "File too large — maximum 10MB" }, { status: 413 });
      }
      const decoded = decodeDataUrl(rawUrl);
      if (!decoded) {
        return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
      }
      // F2: Cloudinary first (f_auto,q_auto CDN URL); local public/uploads is the fallback.
      const cdn = await uploadToCloudinary(decoded.buffer, decoded.ext);
      if (cdn) {
        finalUrl = cdn.url;
        cloudPublicId = cdn.publicId;
      } else {
        finalUrl = saveUpload(decoded.buffer, decoded.ext).url;
      }
      bytes = decoded.buffer.length;
      format = decoded.ext;
    } else {
      // Try to derive format from URL (images and videos)
      const m = rawUrl.match(/\.(png|jpe?g|webp|gif|svg|bmp|avif|mp4|webm|mov|m4v|mkv|avi|3gp|mpg)(?:\?|$)/i);
      if (m) format = m[1].toLowerCase().replace("jpeg", "jpg");
    }

    const publicId = cloudPublicId ?? `impactlens/${Date.now()}-${rand(6)}`;
    const now = new Date();

    const transforms = [
      { type: "upload", at: now.toISOString(), note: source || (rawUrl.startsWith("data:") ? "browser upload" : "external url") },
    ];

    // Detect video from format/extension
    const isVideo = isVideoMedia(finalUrl, format);
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
      org: { connect: { id: auth.orgId } },
    };

    let asset = await db.mediaAsset.create({ data: createData, include: { project: true } });

    if (autoAnalyze) {
      try {
        const analysis = await withAiScope(auth, () => analyzeMedia(finalUrl, mediaType as "image" | "video"));
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
        console.error(e);
        await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: "failed" },
            ]),
          },
        });
      }
    }

    return NextResponse.json(serializeAsset(asset), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
