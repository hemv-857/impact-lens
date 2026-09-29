// POST /api/report — generate an impact / summary / comparison report via LLM
// Body: { type, tone, projectId?, assetIds[], audience?, comparisonId? }
import { NextRequest, NextResponse } from "next/server";
import { serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { generateReportsForOrg, ReportGenError, type ReportRequest } from "@/lib/report-gen";
import { withAiScope } from "@/lib/ai-usage";

const VALID_TYPES = ["impact", "summary", "campaign", "comparison"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

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

    try {
      const { reports, warning } = await withAiScope(auth, () =>
        generateReportsForOrg(auth.orgId, {
          type: type as ReportRequest["type"],
          tone: tone as ReportRequest["tone"],
          projectId,
          assetIds,
          audience,
          comparisonId,
          variantCount,
          angles,
        })
      );

      if (variants === 1) return NextResponse.json(serializeReport(reports[0]), { status: 201 });
      return NextResponse.json(
        warning ? { reports: reports.map(serializeReport), warning } : { reports: reports.map(serializeReport) },
        { status: 201 }
      );
    } catch (e) {
      if (e instanceof ReportGenError) {
        // 4xx messages are our own; 5xx wrap provider errors — log, don't echo
        if (e.status >= 500) console.error(e);
        return NextResponse.json({ error: e.status < 500 ? e.message : "Report generation failed" }, { status: e.status });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
