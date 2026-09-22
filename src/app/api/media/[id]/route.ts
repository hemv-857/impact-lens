// GET    /api/media/[id]  — fetch a single asset (with project relation)
// DELETE /api/media/[id]  — delete an asset (and its local file if uploaded)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/serialize";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.mediaAsset.findUnique({
      where: { id },
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
    const { id } = await params;
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.mediaAsset.delete({ where: { id } });

    // Delete local file if it's an uploaded/generated file under /uploads or /field-media
    try {
      if (asset.url.startsWith("/uploads/") || asset.url.startsWith("/field-media/")) {
        const filePath = path.join(process.cwd(), "public", asset.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch {
      // file cleanup is best-effort
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
