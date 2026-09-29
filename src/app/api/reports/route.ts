// GET /api/reports — list all reports, newest first
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const reports = await db.report.findMany({
      where: { orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reports.map(serializeReport));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
