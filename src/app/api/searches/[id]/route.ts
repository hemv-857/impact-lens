// DELETE /api/searches/[id] — remove a saved search
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
    const existing = await db.savedSearch.findFirst({ where: { id, orgId: auth.orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.savedSearch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
