// GET /api/ai/usage — metering for AI calls (last 50 + summary)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const [items, total, ok, avg] = await Promise.all([
      db.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.aiUsageLog.count(),
      db.aiUsageLog.count({ where: { ok: true } }),
      db.aiUsageLog.aggregate({ _avg: { durationMs: true } }),
    ]);
    return NextResponse.json({
      items,
      summary: {
        total,
        ok,
        failed: total - ok,
        avgMs: Math.round(avg._avg.durationMs ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
