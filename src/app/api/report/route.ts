// POST /api/report — generate an impact / summary / comparison report via LLM
// Body: { type, tone, projectId?, assetIds[], audience?, comparisonId? }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReport, type ReportInput } from "@/lib/ai";
import { serializeReport } from "@/lib/serialize";

const VALID_TYPES = ["impact", "summary", "campaign", "comparison"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      type = "impact",
      tone = "professional",
      projectId,
      assetIds = [],
      audience,
      comparisonId,
    } = body as {
      type?: string;
      tone?: string;
      projectId?: string;
      assetIds?: string[];
      audience?: string;
      comparisonId?: string;
    };

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
    }
    if (!VALID_TONES.includes(tone as (typeof VALID_TONES)[number])) {
      return NextResponse.json({ error: `Invalid tone: ${tone}` }, { status: 400 });
    }
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: "assetIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const [project, assets, comparison] = await Promise.all([
      projectId ? db.project.findUnique({ where: { id: projectId } }) : null,
      db.mediaAsset.findMany({
        where: { id: { in: assetIds } },
      }),
      comparisonId ? db.comparison.findUnique({ where: { id: comparisonId } }) : null,
    ]);

    if (assetIds.length > 0 && assets.length === 0) {
      return NextResponse.json({ error: "None of the assetIds matched" }, { status: 404 });
    }

    const input: ReportInput = {
      type: type as ReportInput["type"],
      tone: tone as ReportInput["tone"],
      projectName: project?.name,
      projectDescription: project?.description || undefined,
      audience: audience || undefined,
      comparisonNarrative: comparison?.narrative || undefined,
      assets: assets.map((a) => ({
        caption: a.aiCaption || a.title,
        summary: a.aiSummary || "",
        tags: (a.tagsCsv || "").split(",").map((t) => t.trim()).filter(Boolean),
        location: a.location || undefined,
      })),
    };

    let output: Awaited<ReturnType<typeof generateReport>>;
    try {
      output = await generateReport(input);
    } catch (e) {
      const message = e instanceof Error ? e.message : "LLM report generation failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const report = await db.report.create({
      data: {
        title: output.title,
        type,
        projectId: project?.id || null,
        headline: output.headline,
        summary: output.summary,
        narrative: output.narrative,
        metrics: JSON.stringify(output.metrics || {}),
        mediaIds: JSON.stringify(assets.map((a) => a.id)),
        callToAction: output.callToAction,
        tone,
      },
    });

    return NextResponse.json(serializeReport(report), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
