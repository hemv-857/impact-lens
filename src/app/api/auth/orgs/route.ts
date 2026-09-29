// GET /api/auth/orgs — organizations the signed-in user belongs to (for the switcher).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await db.membership.findMany({
      where: { userId: auth.userId },
      include: { org: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      memberships.map((m) => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        role: m.role,
        active: m.org.id === auth.orgId,
      }))
    );
  } catch (err) {
    console.error("[auth/orgs] Unexpected error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
