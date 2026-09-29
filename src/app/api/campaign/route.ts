// POST /api/campaign — generate a platform-specific campaign Report.
// Body: { projectId?, assetIds[], platform, tone }
// platform ∈ [instagram, twitter, linkedin, newsletter]
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReport, type ReportInput } from "@/lib/ai";
import { serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { withAiScope } from "@/lib/ai-usage";

const VALID_PLATFORMS = ["instagram", "twitter", "linkedin", "newsletter"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

const PLATFORM_AUDIENCE: Record<(typeof VALID_PLATFORMS)[number], string> = {
  instagram: "Instagram followers — visual-first, hashtag-aware, casual but inspirational tone",
  twitter: "Twitter/X audience — concise, punchy, quotable, under 280 chars where possible",
  linkedin: "LinkedIn professional network — credible, metrics-led, partner-facing tone",
  newsletter: "Email newsletter subscribers — long-form, narrative, personal sign-off friendly",
};

const PLATFORM_LABEL: Record<(typeof VALID_PLATFORMS)[number], string> = {
  instagram: "Instagram",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  newsletter: "Newsletter",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { projectId, assetIds = [], platform, tone = "emotional" } = body as {
      projectId?: string;
      assetIds?: string[];
      platform?: string;
      tone?: string;
    };

    if (!platform || !VALID_PLATFORMS.includes(platform as (typeof VALID_PLATFORMS)[number])) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
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

    const p = platform as (typeof VALID_PLATFORMS)[number];
    const t = tone as (typeof VALID_TONES)[number];

    const [project, assets] = await Promise.all([
      projectId
        ? db.project.findFirst({ where: { id: projectId, orgId: auth.orgId } })
        : null,
      db.mediaAsset.findMany({ where: { id: { in: assetIds }, orgId: auth.orgId } }),
    ]);

    if (assets.length === 0) {
      return NextResponse.json({ error: "None of the assetIds matched" }, { status: 404 });
    }

    const input: ReportInput = {
      type: "campaign",
      tone: t,
      projectName: project?.name,
      projectDescription: project?.description || undefined,
      audience: PLATFORM_AUDIENCE[p],
      assets: assets.map((a) => ({
        caption: a.aiCaption || a.title,
        summary: a.aiSummary || "",
        tags: (a.tagsCsv || "").split(",").map((s) => s.trim()).filter(Boolean),
        location: a.location || undefined,
      })),
    };

    let output: Awaited<ReturnType<typeof generateReport>>;
    try {
      output = await withAiScope(auth, () => generateReport(input));
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "LLM campaign generation failed" }, { status: 500 });
    }

    // Prepend platform context to the title so reports are scannable in the UI.
    const title = `[${PLATFORM_LABEL[p]}] ${output.title}`;
    const callToAction = `${output.callToAction} (Channel: ${PLATFORM_LABEL[p]})`;
    const metrics = { ...(output.metrics || {}), platform: p, channel: PLATFORM_LABEL[p] };

    const report = await db.report.create({
      data: {
        title,
        type: "campaign",
        projectId: project?.id || null,
        headline: output.headline,
        summary: output.summary,
        narrative: output.narrative,
        metrics: JSON.stringify(metrics),
        mediaIds: JSON.stringify(assets.map((a) => a.id)),
        callToAction,
        tone: t,
        orgId: auth.orgId,
      },
    });

    return NextResponse.json(serializeReport(report), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
