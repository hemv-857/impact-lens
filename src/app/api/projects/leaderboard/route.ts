// GET /api/projects/leaderboard — rank all projects by a composite health score.
// Returns projects sorted by score (desc), each with: rank, score, breakdown,
// assetCount, analyzedCount, verifiedCount, sdgCount, and a trend (assets added
// in the current ?days window vs the equally long window before it).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProject } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

function computeScore(total: number, analyzed: number, verified: number, sdgCount: number) {
  const volumePts = total === 0 ? 0 : Math.min(20, Math.round(Math.log2(total + 1) * 6));
  const analysisPts = total === 0 ? 0 : Math.round((analyzed / total) * 25);
  const verificationPts = total === 0 ? 0 : Math.round((verified / total) * 25);
  const sdgPts = Math.min(sdgCount, 6) * 5;
  return {
    total: Math.min(100, volumePts + analysisPts + verificationPts + sdgPts),
    volume: volumePts,
    analysis: analysisPts,
    verification: verificationPts,
    sdg: sdgPts,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const sp = req.nextUrl.searchParams;
    const limitRaw = sp.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(50, parseInt(limitRaw, 10) || 10)) : 10;
    const daysRaw = sp.get("days");
    const periodDays = daysRaw ? Math.max(1, Math.min(365, parseInt(daysRaw, 10) || 30)) : 30;

    const now = Date.now();
    const periodStart = new Date(now - periodDays * 86_400_000);
    const prevStart = new Date(now - 2 * periodDays * 86_400_000);

    // One pass over recent assets buckets them into current vs previous period.
    const recent = await db.mediaAsset.findMany({
      where: {
        orgId: auth.orgId,
        createdAt: { gte: prevStart },
        projectId: { not: null },
      },
      select: { projectId: true, createdAt: true },
    });
    const activity = new Map<string, { current: number; previous: number }>();
    for (const a of recent) {
      const bucket = activity.get(a.projectId as string) ?? { current: 0, previous: 0 };
      if (a.createdAt >= periodStart) bucket.current += 1;
      else bucket.previous += 1;
      activity.set(a.projectId as string, bucket);
    }

    const projects = await db.project.findMany({
      where: { orgId: auth.orgId },
      include: {
        _count: { select: { assets: true } },
        assets: {
          select: { analyzedAt: true, verified: true },
          take: 500,
        },
      },
    });

    const ranked = projects
      .map((p) => {
        const total = p._count.assets;
        const analyzed = p.assets.filter((a) => a.analyzedAt).length;
        const verified = p.assets.filter((a) => a.verified).length;
        const sdgs = (p.sdgGoals || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const score = computeScore(total, analyzed, verified, sdgs.length);
        const a = activity.get(p.id) ?? { current: 0, previous: 0 };
        const delta = a.current - a.previous;
        return {
          project: serializeProject(p),
          rank: 0, // filled after sort
          score: score.total,
          breakdown: score,
          assetCount: total,
          analyzedCount: analyzed,
          verifiedCount: verified,
          sdgCount: sdgs.length,
          trend: {
            direction: (delta > 0 ? "up" : delta < 0 ? "down" : "flat") as
              | "up"
              | "down"
              | "flat",
            delta,
            current: a.current,
            previous: a.previous,
            periodDays,
          },
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json(ranked);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
