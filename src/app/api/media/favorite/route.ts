// POST /api/media/favorite — toggle the favorite flag on a single asset.
// Body: { id: string, favorite?: boolean }  (favorite omitted → toggle current)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const id: string = body.id;
    const existing = await db.mediaAsset.findFirst({
      where: { id, orgId: auth.orgId },
      include: { project: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const next = typeof body.favorite === "boolean" ? body.favorite : !existing.favorite;
    const updated = await db.mediaAsset.update({
      where: { id },
      data: { favorite: next },
      include: { project: true },
    });
    return NextResponse.json(serializeAsset(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
