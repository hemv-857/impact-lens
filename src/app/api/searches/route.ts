// GET  /api/searches — list saved searches, newest first
// POST /api/searches — save a search { query, label?, results } → SavedSearch
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SavedSearch } from "@/lib/types";

function serializeSavedSearch(row: {
  id: string;
  query: string;
  label: string | null;
  hitCount: number;
  results: string | null;
  createdAt: Date;
}): SavedSearch {
  let results: { assetId: string; score: number; reason: string }[] = [];
  if (row.results) {
    try {
      const v = JSON.parse(row.results);
      if (Array.isArray(v)) results = v;
    } catch {
      /* ignore */
    }
  }
  return {
    id: row.id,
    query: row.query,
    label: row.label,
    hitCount: row.hitCount,
    results,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await db.savedSearch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(rows.map(serializeSavedSearch));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.query || typeof body.query !== "string") {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }
    const { query, label, results } = body as {
      query: string;
      label?: string;
      results?: { assetId: string; score: number; reason: string }[];
    };
    const hitCount = Array.isArray(results) ? results.length : 0;
    const row = await db.savedSearch.create({
      data: {
        query: query.trim().slice(0, 300),
        label: label ? String(label).slice(0, 100) : null,
        hitCount,
        results: Array.isArray(results) ? JSON.stringify(results.slice(0, 50)) : null,
      },
    });
    return NextResponse.json(serializeSavedSearch(row), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
