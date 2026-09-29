// PATCH /api/schedules/[id] — toggle active / edit interval + recipient
// DELETE /api/schedules/[id] — remove a schedule
import { NextRequest, NextResponse } from "next/server";
import { db, orgHasMemberEmail } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const { id } = await params;
    const existing = await db.reportSchedule.findFirst({
      where: { id, orgId: auth.orgId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.everyDays !== undefined) {
      data.everyDays = Math.max(1, Math.min(90, parseInt(String(body.everyDays), 10) || 7));
    }
    if (body.emailTo !== undefined) {
      // same members-only rule as POST /api/schedules
      if (body.emailTo && (typeof body.emailTo !== "string" || !(await orgHasMemberEmail(auth.orgId, body.emailTo)))) {
        return NextResponse.json({ error: "emailTo must be the email of a member of this organization" }, { status: 400 });
      }
      data.emailTo = body.emailTo ? body.emailTo.trim().toLowerCase() : null;
    }
    if (body.name !== undefined) data.name = body.name ? String(body.name).slice(0, 120) : null;
    if (body.audience !== undefined) data.audience = body.audience ? String(body.audience) : null;

    const updated = await db.reportSchedule.update({ where: { id }, data });
    return NextResponse.json({
      ...updated,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
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
    const existing = await db.reportSchedule.findFirst({
      where: { id, orgId: auth.orgId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.reportSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
