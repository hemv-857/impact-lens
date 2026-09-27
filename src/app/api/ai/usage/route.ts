// GET /api/ai/usage — org-scoped AI metering (last 50 + summary + per-user breakdown)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const where = { orgId: auth.orgId };
    const [items, total, ok, avg, byUserRows] = await Promise.all([
      db.aiUsageLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
      db.aiUsageLog.count({ where }),
      db.aiUsageLog.count({ where: { ...where, ok: true } }),
      db.aiUsageLog.aggregate({ where, _avg: { durationMs: true } }),
      db.aiUsageLog.groupBy({ by: ["userId"], where, _count: { _all: true } }),
    ]);

    const userIds = byUserRows
      .map((r) => r.userId)
      .filter((id): id is string => Boolean(id));
    const users = userIds.length
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
      : [];
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const byUser = byUserRows
      .map((r) => ({
        email: r.userId ? (emailById.get(r.userId) ?? "unknown user") : "system",
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      items,
      summary: {
        total,
        ok,
        failed: total - ok,
        avgMs: Math.round(avg._avg.durationMs ?? 0),
        byUser,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
