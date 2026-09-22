// GET /api/projects/leaderboard — rank all projects by a composite health score.
// Returns projects sorted by score (desc), each with: rank, score, breakdown,
// assetCount, analyzedCount, verifiedCount, sdgCount.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProject } from "@/lib/serialize";

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
    const sp = req.nextUrl.searchParams;
    const limitRaw = sp.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(50, parseInt(limitRaw, 10) || 10)) : 10;

    const projects = await db.project.findMany({
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
        return {
          project: serializeProject(p),
          rank: 0, // filled after sort
          score: score.total,
          breakdown: score,
          assetCount: total,
          analyzedCount: analyzed,
          verifiedCount: verified,
          sdgCount: sdgs.length,
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
