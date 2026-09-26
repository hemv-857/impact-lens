// GET /api/analytics
// Returns the Analytics object: counts, byCategory, bySource, recentActivity.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Analytics } from "@/lib/types";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const where = { orgId: auth.orgId };

    const [
      totalAssets,
      analyzedAssets,
      totalProjects,
      activeProjects,
      totalReports,
      comparisons,
      verifiedAssets,
      assets,
      recentAssets,
      recentReports,
      recentComparisons,
    ] = await Promise.all([
      db.mediaAsset.count({ where }),
      db.mediaAsset.count({ where: { ...where, analyzedAt: { not: null } } }),
      db.project.count({ where }),
      db.project.count({ where: { ...where, status: "active" } }),
      db.report.count({ where }),
      db.comparison.count({ where }),
      db.mediaAsset.count({ where: { ...where, verified: true } }),
      db.mediaAsset.findMany({ where, select: { category: true, source: true } }),
      db.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, createdAt: true, analyzedAt: true },
      }),
      db.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, type: true, createdAt: true },
      }),
      db.comparison.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, createdAt: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const a of assets) {
      const cat = a.category || "other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      const src = a.source || "upload";
      bySource[src] = (bySource[src] || 0) + 1;
    }

    // Recent activity — merge assets, reports, comparisons, sort by date desc, take 10.
    type Event = { id: string; label: string; at: Date; kind: string };
    const events: Event[] = [];

    for (const a of recentAssets) {
      const label = a.analyzedAt
        ? `Analyzed: ${a.title}`
        : `Uploaded: ${a.title}`;
      events.push({
        id: a.id,
        label,
        at: a.createdAt,
        kind: a.analyzedAt ? "asset-analyzed" : "asset-uploaded",
      });
    }
    for (const r of recentReports) {
      const verb =
        r.type === "campaign"
          ? "Generated campaign:"
          : r.type === "comparison"
            ? "Generated comparison report:"
            : "Generated report:";
      events.push({
        id: r.id,
        label: `${verb} ${r.title}`,
        at: r.createdAt,
        kind: "report",
      });
    }
    for (const c of recentComparisons) {
      events.push({
        id: c.id,
        label: "New comparison saved",
        at: c.createdAt,
        kind: "comparison",
      });
    }

    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    const recentActivity = events.slice(0, 10).map((e) => ({
      id: e.id,
      label: e.label,
      at: e.at.toISOString(),
      kind: e.kind,
    }));

    const payload: Analytics = {
      totalAssets,
      analyzedAssets,
      totalProjects,
      activeProjects,
      totalReports,
      comparisons,
      verifiedAssets,
      byCategory,
      bySource,
      recentActivity,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
