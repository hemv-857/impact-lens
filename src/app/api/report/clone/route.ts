// POST /api/report/clone — duplicate an existing report so users can iterate.
// Body: { id: string }  → returns a new Report with "(copy)" suffix.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReport } from "@/lib/serialize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const id: string = body.id;
    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const cloned = await db.report.create({
      data: {
        title: `${existing.title} (copy)`,
        type: existing.type,
        projectId: existing.projectId,
        headline: existing.headline,
        summary: existing.summary,
        narrative: existing.narrative,
        metrics: existing.metrics,
        mediaIds: existing.mediaIds,
        callToAction: existing.callToAction,
        tone: existing.tone,
      },
    });

    return NextResponse.json(serializeReport(cloned), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
