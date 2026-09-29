// DELETE /api/notes/[id] — delete a note
// PATCH /api/notes/[id] — update a note's body
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const existing = await db.assetNote.findFirst({ where: { id, orgId: auth.orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.assetNote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.body) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }
    const existing = await db.assetNote.findFirst({ where: { id, orgId: auth.orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await db.assetNote.update({
      where: { id },
      data: { body: String(body.body).slice(0, 2000) },
    });
    return NextResponse.json({
      id: updated.id,
      assetId: updated.assetId,
      body: updated.body,
      author: updated.author,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
