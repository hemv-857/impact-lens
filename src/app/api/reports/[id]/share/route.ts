// GET    /api/reports/[id]/share — current link state (for the share dialog)
// POST   /api/reports/[id]/share — mint (or rotate) a public read-only token, optional viewer note
// DELETE /api/reports/[id]/share — revoke the link
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

const MAX_NOTE = 500;

async function findOwnedReport(orgId: string, id: string) {
  return db.report.findFirst({ where: { id, orgId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;

    const report = await findOwnedReport(auth.orgId, id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json({
      active: Boolean(report.shareToken),
      url: report.shareToken ? `/share/${report.shareToken}` : null,
      note: report.shareNote ?? "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;

    const report = await findOwnedReport(auth.orgId, id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    let note: string | null | undefined;
    const body = (await req.json().catch(() => null)) as { note?: unknown } | null;
    if (body && body.note !== undefined) {
      if (typeof body.note !== "string") {
        return NextResponse.json({ error: "note must be a string" }, { status: 400 });
      }
      const trimmed = body.note.trim();
      if (trimmed.length > MAX_NOTE) {
        return NextResponse.json({ error: `note must be at most ${MAX_NOTE} characters` }, { status: 400 });
      }
      note = trimmed || null;
    }

    const token = randomBytes(16).toString("hex");
    const updated = await db.report.update({
      where: { id: report.id },
      data: { shareToken: token, ...(note !== undefined ? { shareNote: note } : {}) },
    });
    return NextResponse.json({
      token,
      url: `/share/${token}`,
      note: updated.shareNote ?? "",
    });
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

    const report = await findOwnedReport(auth.orgId, id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await db.report.update({ where: { id: report.id }, data: { shareToken: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
