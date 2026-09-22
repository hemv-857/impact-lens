// GET /api/reports — list all reports, newest first
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReport } from "@/lib/serialize";

export async function GET() {
  try {
    const reports = await db.report.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reports.map(serializeReport));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
