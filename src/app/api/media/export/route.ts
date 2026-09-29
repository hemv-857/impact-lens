// GET /api/media/export — export filtered media library as a CSV file.
// Accepts the same query params as /api/media (projectId, category, source,
// search, verified, sort, dateFrom, dateTo) so the export matches the
// currently-applied filters.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getAuthContext, unauthorized } from "@/lib/auth";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  // neutralize spreadsheet formulas (=,+,-,@,tab,CR) — CSV injection
  const s = String(v).replace(/^[=+\-@\t\r]/, (m) => `'${m}`);
  // Quote if it contains comma, quote, newline, or leading/trailing space
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS = [
  "id",
  "publicId",
  "title",
  "type",
  "url",
  "format",
  "width",
  "height",
  "bytes",
  "category",
  "activity",
  "location",
  "projectName",
  "projectId",
  "aiCaption",
  "aiSummary",
  "mood",
  "confidence",
  "qualityScore",
  "ocrText",
  "tags",
  "signals",
  "objects",
  "verified",
  "analyzedAt",
  "captureDate",
  "source",
  "originalUrl",
  "pairGroup",
  "pairRole",
  "createdAt",
  "updatedAt",
] as const;

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
    const sort = sp.get("sort") || "newest";
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;

    const where: Prisma.MediaAssetWhereInput = { orgId: auth.orgId };
    if (projectId) where.projectId = projectId;
    if (category) where.category = category;
    if (source) where.source = source;
    if (verified === "true") where.verified = true;
    if (verified === "false") where.verified = false;
    if (dateFrom || dateTo) {
      const range: { gte?: Date; lte?: Date } = {};
      if (dateFrom) range.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
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
      take: 5000, // hard cap for export
      include: { project: true },
    });

    // Build CSV
    const header = CSV_COLUMNS.join(",");
    const bodyLines = rows.map((r) => {
      const signals = (() => {
        try {
          const v = JSON.parse(r.signals || "[]");
          return Array.isArray(v) ? v.map((s: { label?: string }) => s.label ?? "").filter(Boolean).join("; ") : "";
        } catch {
          return "";
        }
      })();
      const objects = (() => {
        try {
          const v = JSON.parse(r.objects || "[]");
          return Array.isArray(v) ? v.map((o: { name?: string }) => o.name ?? "").filter(Boolean).join("; ") : "";
        } catch {
          return "";
        }
      })();
      const row: Record<string, unknown> = {
        id: r.id,
        publicId: r.publicId,
        title: r.title,
        type: r.type,
        url: r.url,
        format: r.format,
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        category: r.category,
        activity: r.activity,
        location: r.location,
        projectName: r.projectName ?? r.project?.name,
        projectId: r.projectId,
        aiCaption: r.aiCaption,
        aiSummary: r.aiSummary,
        mood: r.mood,
        confidence: r.confidence,
        qualityScore: r.qualityScore,
        ocrText: r.ocrText,
        tags: r.tagsCsv,
        signals,
        objects,
        verified: r.verified ? "yes" : "no",
        analyzedAt: r.analyzedAt?.toISOString() ?? "",
        captureDate: r.captureDate?.toISOString().slice(0, 10) ?? "",
        source: r.source,
        originalUrl: r.originalUrl,
        pairGroup: r.pairGroup,
        pairRole: r.pairRole,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
      return CSV_COLUMNS.map((c) => csvEscape(row[c])).join(",");
    });

    const csv = [header, ...bodyLines].join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="impactlens-media-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
