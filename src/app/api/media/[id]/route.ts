// GET    /api/media/[id]  — fetch a single asset (with project relation)
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
