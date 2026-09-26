// POST   /api/reports/[id]/share — mint (or rotate) a public read-only token
// DELETE /api/reports/[id]/share — revoke the link
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

async function findOwnedReport(orgId: string, id: string) {
  return db.report.findFirst({ where: { id, orgId } });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;

    const report = await findOwnedReport(auth.orgId, id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const token = randomBytes(16).toString("hex");
    await db.report.update({ where: { id: report.id }, data: { shareToken: token } });
    return NextResponse.json({ token, url: `/share/${token}` });
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

    const report = await findOwnedReport(auth.orgId, id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await db.report.update({ where: { id: report.id }, data: { shareToken: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
