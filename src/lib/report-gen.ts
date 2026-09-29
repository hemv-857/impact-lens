// Shared report generation used by POST /api/report and the scheduled cron runner.
import type { Report } from "@prisma/client";
import { db } from "@/lib/db";
import { generateReport, type ReportInput } from "@/lib/ai";

// Distinct slants used when the client asks for multiple variants without naming them.
export const DEFAULT_ANGLES = [
  "Evidence-led: lead with verifiable field-media proof and measurable outcomes",
  "Story-driven: centre one human moment and let the numbers support it",
  "Data-first: open with KPIs, benchmarks and quantified impact",
  "Urgency: frame what is at stake now and what the reader can do about it",
];

/** Error carrying the HTTP status the API route should answer with. */
export class ReportGenError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "ReportGenError";
  }
}

export interface ReportRequest {
  type: ReportInput["type"];
  tone: ReportInput["tone"];
  projectId?: string;
  /** Omit/empty → the org's most recent assets are used (needed by cron runs). */
  assetIds?: string[];
  audience?: string;
  comparisonId?: string;
  variantCount?: number;
  angles?: string[];
}

/**
 * Numbers a reader can trust because we count them, not the model: they go on every
 * report next to whatever figures the model quotes from the evidence.
 */
export function evidenceFacts(
  assets: { verified: boolean; captureDate: Date | null; createdAt: Date }[]
): Record<string, string | number> {
  const days = assets.map((a) => (a.captureDate ?? a.createdAt).toISOString().slice(0, 10)).sort();
  return {
    evidence_assets: assets.length,
    human_verified: assets.filter((a) => a.verified).length,
    period: days[0] === days[days.length - 1] ? days[0] : `${days[0]} → ${days[days.length - 1]}`,
  };
}

export interface GeneratedReports {
  reports: Report[];
  warning: string | null;
}

export async function generateReportsForOrg(
  orgId: string,
  req: ReportRequest
): Promise<GeneratedReports> {
  const variants = Math.max(1, Math.min(4, parseInt(String(req.variantCount ?? 1), 10) || 1));
  // strings only, and a hard cap: every asset becomes prompt text (and provider spend)
  const assetIds = (Array.isArray(req.assetIds) ? req.assetIds : []).filter((x): x is string => typeof x === "string").slice(0, 60);

  const [project, comparison, explicitAssets] = await Promise.all([
    req.projectId
      ? db.project.findFirst({ where: { id: req.projectId, orgId } })
      : null,
    req.comparisonId
      ? db.comparison.findFirst({ where: { id: req.comparisonId, orgId } })
      : null,
    assetIds.length
      ? db.mediaAsset.findMany({ where: { id: { in: assetIds }, orgId } })
      : null,
  ]);

  const assets =
    explicitAssets ??
    (await db.mediaAsset.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 20 }));

  if (assetIds.length > 0 && assets.length === 0) {
    throw new ReportGenError("None of the assetIds matched", 404);
  }
  if (assets.length === 0) {
    throw new ReportGenError("No media assets in this organization yet", 400);
  }

  const input: ReportInput = {
    type: req.type,
    tone: req.tone,
    projectName: project?.name,
    projectDescription: project?.description || undefined,
    audience: req.audience || undefined,
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
    Array.isArray(req.angles) && req.angles.length > 0
      ? req.angles.slice(0, 4)
      : variants > 1
        ? DEFAULT_ANGLES.slice(0, variants)
        : [];

  const reports: Report[] = [];
  let warning: string | null = null;
  for (let i = 0; i < variants; i++) {
    try {
      const output = await generateReport({ ...input, angle: slants[i] });
      reports.push(
        await db.report.create({
          data: {
            title: output.title,
            type: req.type,
            projectId: project?.id || null,
            headline: output.headline,
            summary: output.summary,
            narrative: output.narrative,
            metrics: JSON.stringify({ ...output.metrics, ...evidenceFacts(assets) }),
            mediaIds: JSON.stringify(assets.map((a) => a.id)),
            callToAction: output.callToAction,
            tone: req.tone,
            orgId,
          },
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "LLM report generation failed";
      // First draft must succeed; later drafts degrade to partial success.
      if (reports.length === 0) throw new ReportGenError(message, 500);
      warning = message;
      break;
    }
  }

  return { reports, warning };
}
