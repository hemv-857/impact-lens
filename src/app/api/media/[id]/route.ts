// GET    /api/media/[id]  — fetch a single asset (with project relation)
// PATCH  /api/media/[id]  — update topic tags (manual, on top of AI tags)
// DELETE /api/media/[id]  — delete an asset (and its local file if uploaded)
import { NextRequest, NextResponse } from "next/server";
import { db, removeAssetStorage } from "@/lib/db";
import { serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const asset = await db.mediaAsset.findFirst({
      where: { id, orgId: auth.orgId },
      include: { project: true },
    });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeAsset(asset));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { tags?: unknown } | null;
    const raw = body?.tags;
    if (!Array.isArray(raw) || raw.some((t) => typeof t !== "string")) {
      return NextResponse.json(
        { error: "tags must be an array of strings" },
        { status: 400 }
      );
    }
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const item of raw) {
      const v = (item as string).trim();
      if (!v) continue;
      if (v.length > 40) {
        return NextResponse.json(
          { error: "Tag too long (max 40 characters)" },
          { status: 400 }
        );
      }
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(v);
      if (tags.length > 25) {
        return NextResponse.json(
          { error: "Too many tags (max 25)" },
          { status: 400 }
        );
      }
    }
    const asset = await db.mediaAsset.findFirst({
      where: { id, orgId: auth.orgId },
    });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await db.mediaAsset.update({
      where: { id },
      data: { tagsCsv: tags.join(", ") },
    });
    return NextResponse.json(serializeAsset(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const asset = await db.mediaAsset.findFirst({ where: { id, orgId: auth.orgId } });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.mediaAsset.delete({ where: { id } });
    await removeAssetStorage(asset);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
