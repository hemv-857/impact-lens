// POST /api/compare — create a Comparison record between two assets using VLM.
// Body: { beforeId, afterId, projectId? }
// Returns: { ...ComparisonResult, before: MediaAsset, after: MediaAsset }
import { NextRequest, NextResponse } from "next/server";
import { db, orgOwnsProject } from "@/lib/db";
import { compareImages } from "@/lib/ai";
import { serializeAsset, serializeComparison } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { withAiScope } from "@/lib/ai-usage";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { beforeId, afterId, projectId } = body as {
      beforeId?: string;
      afterId?: string;
      projectId?: string;
    };
    if (!beforeId || !afterId) {
      return NextResponse.json(
        { error: "Missing required fields: beforeId, afterId" },
        { status: 400 }
      );
    }
    if (beforeId === afterId) {
      return NextResponse.json(
        { error: "beforeId and afterId must differ" },
        { status: 400 }
      );
    }
    if (projectId && !(await orgOwnsProject(auth.orgId, projectId))) {
      return NextResponse.json({ error: "Unknown project" }, { status: 400 });
    }

    const [before, after] = await Promise.all([
      db.mediaAsset.findFirst({
        where: { id: beforeId, orgId: auth.orgId },
        include: { project: true },
      }),
      db.mediaAsset.findFirst({
        where: { id: afterId, orgId: auth.orgId },
        include: { project: true },
      }),
    ]);
    if (!before) return NextResponse.json({ error: `before asset ${beforeId} not found` }, { status: 404 });
    if (!after) return NextResponse.json({ error: `after asset ${afterId} not found` }, { status: 404 });

    let result: Awaited<ReturnType<typeof compareImages>>;
    try {
      const context = before.project || after.project
        ? `Project: ${(before.project || after.project)?.name}. Activity: ${before.activity || after.activity || "unknown"}.`
        : undefined;
      result = await withAiScope(auth, () => compareImages(before.url, after.url, context));
    } catch (e) {
      const message = e instanceof Error ? e.message : "VLM comparison failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const comparison = await db.comparison.create({
      data: {
        beforeId: before.id,
        afterId: after.id,
        projectId: projectId || null,
        narrative: result.narrative,
        changes: JSON.stringify(result.changes),
        impactScore: result.impactScore,
        orgId: auth.orgId,
      },
    });

    return NextResponse.json(
      {
        ...serializeComparison(comparison),
        before: serializeAsset(before),
        after: serializeAsset(after),
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
