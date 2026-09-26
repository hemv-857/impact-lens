// POST /api/report — generate an impact / summary / comparison report via LLM
// Body: { type, tone, projectId?, assetIds[], audience?, comparisonId? }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReport, type ReportInput } from "@/lib/ai";
import { serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

const VALID_TYPES = ["impact", "summary", "campaign", "comparison"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

// Distinct slants used when the client asks for multiple variants without naming them.
const DEFAULT_ANGLES = [
  "Evidence-led: lead with verifiable field-media proof and measurable outcomes",
  "Story-driven: centre one human moment and let the numbers support it",
  "Data-first: open with KPIs, benchmarks and quantified impact",
  "Urgency: frame what is at stake now and what the reader can do about it",
];

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

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
      variantCount = 1,
      angles,
    } = body as {
      type?: string;
      tone?: string;
      projectId?: string;
      assetIds?: string[];
      audience?: string;
      comparisonId?: string;
      variantCount?: number;
      angles?: string[];
    };

    const variants = Math.max(1, Math.min(4, parseInt(String(variantCount), 10) || 1));

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
      projectId
        ? db.project.findFirst({ where: { id: projectId, orgId: auth.orgId } })
        : null,
      db.mediaAsset.findMany({
        where: { id: { in: assetIds }, orgId: auth.orgId },
      }),
      comparisonId
        ? db.comparison.findFirst({ where: { id: comparisonId, orgId: auth.orgId } })
        : null,
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

    // Multi-variant: generate up to 4 drafts, each pushed through a distinct angle.
    const slants =
      Array.isArray(angles) && angles.length > 0
        ? angles.slice(0, 4)
        : variants > 1
          ? DEFAULT_ANGLES.slice(0, variants)
          : [];

    const reports: ReturnType<typeof serializeReport>[] = [];
    let warning: string | null = null;
    for (let i = 0; i < variants; i++) {
      try {
        const output = await generateReport({ ...input, angle: slants[i] });
        const created = await db.report.create({
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
            orgId: auth.orgId,
          },
        });
        reports.push(serializeReport(created));
      } catch (e) {
        const message = e instanceof Error ? e.message : "LLM report generation failed";
        // First draft must succeed; later drafts degrade to partial success.
        if (reports.length === 0) return NextResponse.json({ error: message }, { status: 500 });
        warning = message;
        break;
      }
    }

    if (variants === 1) return NextResponse.json(reports[0], { status: 201 });
    return NextResponse.json(
      warning ? { reports, warning } : { reports },
      { status: 201 }
    );  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
