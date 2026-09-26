// POST /api/projects/compare — compare two projects side by side.
// Body: { projectIdA, projectIdB }
// Returns: { a, b, sharedSdgs, sharedCategories, sharedLocations, summary }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProject, serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { projectIdA, projectIdB } = body as { projectIdA?: string; projectIdB?: string };
    if (!projectIdA || !projectIdB) {
      return NextResponse.json({ error: "projectIdA and projectIdB are required" }, { status: 400 });
    }
    if (projectIdA === projectIdB) {
      return NextResponse.json({ error: "Pick two different projects to compare" }, { status: 400 });
    }

    const [projA, projB] = await Promise.all([
      db.project.findFirst({
        where: { id: projectIdA, orgId: auth.orgId },
        include: { _count: { select: { assets: true } }, assets: { take: 50 } },
      }),
      db.project.findFirst({
        where: { id: projectIdB, orgId: auth.orgId },
        include: { _count: { select: { assets: true } }, assets: { take: 50 } },
      }),
    ]);

    if (!projA) return NextResponse.json({ error: `Project ${projectIdA} not found` }, { status: 404 });
    if (!projB) return NextResponse.json({ error: `Project ${projectIdB} not found` }, { status: 404 });

    const aSdgs = (projA.sdgGoals || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const bSdgs = (projB.sdgGoals || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const sharedSdgs = aSdgs.filter((s) => bSdgs.includes(s));

    const aCats = new Set((projA.assets || []).map((a) => a.category).filter(Boolean));
    const bCats = new Set((projB.assets || []).map((a) => a.category).filter(Boolean));
    const sharedCategories = Array.from(aCats).filter((c) => bCats.has(c));
    const aOnlyCats = Array.from(aCats).filter((c) => !bCats.has(c));
    const bOnlyCats = Array.from(bCats).filter((c) => !aCats.has(c));

    const aLocs = new Set((projA.assets || []).map((a) => a.location).filter(Boolean));
    const bLocs = new Set((projB.assets || []).map((a) => a.location).filter(Boolean));
    const sharedLocations = Array.from(aLocs).filter((l) => bLocs.has(l));

    // Analyzed + verified counts
    const aAnalyzed = (projA.assets || []).filter((a) => a.analyzedAt).length;
    const bAnalyzed = (projB.assets || []).filter((a) => a.analyzedAt).length;
    const aVerified = (projA.assets || []).filter((a) => a.verified).length;
    const bVerified = (projB.assets || []).filter((a) => a.verified).length;

    // Avg confidence
    const aConfs = (projA.assets || []).filter((a) => typeof a.confidence === "number").map((a) => a.confidence!);
    const bConfs = (projB.assets || []).filter((a) => typeof a.confidence === "number").map((a) => a.confidence!);
    const aAvgConf = aConfs.length > 0 ? aConfs.reduce((s, c) => s + c, 0) / aConfs.length : null;
    const bAvgConf = bConfs.length > 0 ? bConfs.reduce((s, c) => s + c, 0) / bConfs.length : null;

    return NextResponse.json({
      a: serializeProject(projA),
      b: serializeProject(projB),
      aAssets: (projA.assets || []).map(serializeAsset),
      bAssets: (projB.assets || []).map(serializeAsset),
      sharedSdgs,
      sharedCategories,
      sharedLocations,
      aOnlyCategories: aOnlyCats,
      bOnlyCategories: bOnlyCats,
      stats: {
        a: {
          assetCount: projA._count.assets,
          analyzed: aAnalyzed,
          verified: aVerified,
          avgConfidence: aAvgConf,
          uniqueCategories: aCats.size,
        },
        b: {
          assetCount: projB._count.assets,
          analyzed: bAnalyzed,
          verified: bVerified,
          avgConfidence: bAvgConf,
          uniqueCategories: bCats.size,
        },
      },
      summary: `${projA.name} and ${projB.name} share ${sharedSdgs.length} SDG${sharedSdgs.length === 1 ? "" : "s"}${
        sharedSdgs.length > 0 ? ` (${sharedSdgs.join(", ")})` : ""
      } and ${sharedCategories.length} categor${sharedCategories.length === 1 ? "y" : "ies"}${
        sharedCategories.length > 0 ? ` (${sharedCategories.join(", ")})` : ""
      }.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
