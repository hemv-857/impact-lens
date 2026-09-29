// GET /api/comparisons — list all comparisons (newest first), with before/after assets.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAsset, serializeComparison } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const rows = await db.comparison.findMany({
      where: { orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
    });

    // The Comparison model doesn't declare @relation fields back to MediaAsset,
    // so we fetch referenced assets in a second query and stitch them client-side.
    const ids = new Set<string>();
    for (const r of rows) {
      ids.add(r.beforeId);
      ids.add(r.afterId);
    }
    const assets = ids.size
      ? await db.mediaAsset.findMany({
          where: { id: { in: Array.from(ids) }, orgId: auth.orgId },
          include: { project: true },
        })
      : [];
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return NextResponse.json(
      rows.map((r) => {
        const before = assetMap.get(r.beforeId);
        const after = assetMap.get(r.afterId);
        return {
          ...serializeComparison(r),
          before: before ? serializeAsset(before) : null,
          after: after ? serializeAsset(after) : null,
        };
      })
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
