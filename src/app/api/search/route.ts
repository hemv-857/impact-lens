// POST /api/search — semantic search over analyzed assets via LLM scoring.
// Body: { query, limit? }
// Returns: { hits: [{ asset: MediaAsset, score, reason }, ...] }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lexicalHits, semanticSearch } from "@/lib/ai";
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
    const { query: rawQuery, limit: limitRaw } = body as { query: unknown; limit?: number };
    if (typeof rawQuery !== "string" || !rawQuery.trim()) {
      return NextResponse.json({ error: "query must be a non-empty string" }, { status: 400 });
    }
    const query = rawQuery.trim().slice(0, 300);
    const limit =
      typeof limitRaw === "number"
        ? Math.max(1, Math.min(50, Math.floor(limitRaw)))
        : 20;

    const analyzed = await db.mediaAsset.findMany({
      where: { orgId: auth.orgId, analyzedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, aiCaption: true, aiSummary: true, tagsCsv: true, location: true, activity: true, category: true },
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

    // The LLM reads the whole catalog in one prompt, so cap it: on big libraries it only
    // sees the keyword-shortlisted candidates (plus the newest, so a purely conceptual
    // query still has something to rank). ponytail: real embeddings/vector index is the
    // upgrade path past a few thousand assets — needs an embeddings provider decision.
    const CANDIDATES = 120;
    let candidates = catalog;
    if (catalog.length > CANDIDATES) {
      const shortlist = new Set(lexicalHits(query, catalog, CANDIDATES - 20).map((h) => h.assetId));
      for (const c of catalog) if (shortlist.size < CANDIDATES) shortlist.add(c.id); // catalog is newest-first
      candidates = catalog.filter((c) => shortlist.has(c.id));
    }

    let hits: Awaited<ReturnType<typeof semanticSearch>>;
    let degraded = false;
    try {
      hits = await withAiScope(auth, () => semanticSearch(query, candidates));
    } catch (e) {
      // AI down / no key / over budget / garbled reply: keyword results beat an error page
      console.error(e);
      degraded = true;
      hits = lexicalHits(query, catalog, limit);
    }

    const top = hits.slice(0, limit);
    if (top.length === 0) return NextResponse.json({ hits: [], degraded });

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

    return NextResponse.json({ hits: resultHits, degraded });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
