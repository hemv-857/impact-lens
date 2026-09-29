// POST /api/report/clone — duplicate an existing report so users can iterate.
// Body: { id: string }  → returns a new Report with "(copy)" suffix.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const id: string = body.id;
    const existing = await db.report.findFirst({ where: { id, orgId: auth.orgId } });
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
        orgId: auth.orgId,
      },
    });

    return NextResponse.json(serializeReport(cloned), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
