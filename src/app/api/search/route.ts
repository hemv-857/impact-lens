// POST /api/search — semantic search over analyzed assets via LLM scoring.
// Body: { query, limit? }
// Returns: { hits: [{ asset: MediaAsset, score, reason }, ...] }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/ai";
import { serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { withAiScope } from "@/lib/ai-usage";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.query) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }
    const { query, limit: limitRaw } = body as { query: string; limit?: number };
    const limit =
      typeof limitRaw === "number"
        ? Math.max(1, Math.min(50, Math.floor(limitRaw)))
        : 20;

    // Fetch ALL analyzed assets and reduce to the lightweight shape semanticSearch expects.
    const analyzed = await db.mediaAsset.findMany({
      where: { orgId: auth.orgId, analyzedAt: { not: null } },
    });
    if (analyzed.length === 0) {
      return NextResponse.json({ hits: [] });
    }

    const catalog = analyzed.map((a) => ({
      id: a.id,
      caption: a.aiCaption || a.title,
      summary: a.aiSummary || "",
      tags: (a.tagsCsv || "").split(",").map((t) => t.trim()).filter(Boolean),
      location: a.location || undefined,
      activity: a.activity || undefined,
      category: a.category || undefined,
    }));

    let hits: Awaited<ReturnType<typeof semanticSearch>>;
    try {
      hits = await withAiScope(auth, () => semanticSearch(query, catalog));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Semantic search failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const top = hits.slice(0, limit);
    if (top.length === 0) return NextResponse.json({ hits: [] });

    // Fetch full MediaAsset records for the top hit ids.
    const topIds = top.map((h) => h.assetId);
    const full = await db.mediaAsset.findMany({
      where: { id: { in: topIds }, orgId: auth.orgId },
      include: { project: true },
    });
    const assetMap = new Map(full.map((a) => [a.id, a]));

    // Preserve score-order from the LLM.
    const resultHits = top
      .map((h) => {
        const asset = assetMap.get(h.assetId);
        if (!asset) return null;
        return {
          asset: serializeAsset(asset),
          score: h.score,
          reason: h.reason,
        };
      })
      .filter((x): x is { asset: ReturnType<typeof serializeAsset>; score: number; reason: string } => x !== null);

    return NextResponse.json({ hits: resultHits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
