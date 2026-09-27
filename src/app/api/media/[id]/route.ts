// GET    /api/media/[id]  — fetch a single asset (with project relation)
// PATCH  /api/media/[id]  — update topic tags (manual, on top of AI tags)
// DELETE /api/media/[id]  — delete an asset (and its local file if uploaded)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import { destroyCloudinary } from "@/lib/cloudinary";
import { publicFilePath } from "@/lib/ai";
import fs from "fs";

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    // F2: destroy the CDN object when the asset lives on Cloudinary (best-effort)
    try {
      if (asset.url.includes("res.cloudinary.com")) {
        await destroyCloudinary(asset.publicId, asset.type === "video" ? "video" : "image");
      }
    } catch {
      // CDN cleanup is best-effort
    }

    // Delete local file if it's an uploaded/generated file under /uploads or /field-media
    // (resolve + containment check — asset.url is user-influenced, `..` must not escape public/)
    try {
      const local = asset.url.startsWith("/uploads/") || asset.url.startsWith("/field-media/") ? publicFilePath(asset.url) : null;
      if (local && fs.existsSync(local)) fs.unlinkSync(local);
    } catch {
      // file cleanup is best-effort
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
