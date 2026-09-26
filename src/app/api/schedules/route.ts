// GET  /api/schedules — list the org's report schedules
// POST /api/schedules — create one { type?, tone?, projectId?, audience?, everyDays?, emailTo? }
import { NextRequest, NextResponse } from "next/server";
import { db, orgOwnsProject } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

const VALID_TYPES = ["impact", "summary", "campaign", "comparison"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

function serialize(row: {
  id: string;
  name: string | null;
  type: string;
  tone: string;
  projectId: string | null;
  audience: string | null;
  everyDays: number;
  emailTo: string | null;
  active: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
}) {
  return { ...row, lastRunAt: row.lastRunAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const rows = await db.reportSchedule.findMany({
      where: { orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map(serialize));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      name,
      type = "impact",
      tone = "professional",
      projectId,
      audience,
      everyDays = 7,
      emailTo,
    } = body as {
      name?: string;
      type?: string;
      tone?: string;
      projectId?: string;
      audience?: string;
      everyDays?: number;
      emailTo?: string;
    };

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
    }
    if (!VALID_TONES.includes(tone as (typeof VALID_TONES)[number])) {
      return NextResponse.json({ error: `Invalid tone: ${tone}` }, { status: 400 });
    }
    if (projectId && !(await orgOwnsProject(auth.orgId, projectId))) {
      return NextResponse.json({ error: "Unknown project" }, { status: 400 });
    }
    const days = Math.max(1, Math.min(90, parseInt(String(everyDays), 10) || 7));
    if (emailTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
      return NextResponse.json({ error: "emailTo must be a valid email" }, { status: 400 });
    }

    const row = await db.reportSchedule.create({
      data: {
        orgId: auth.orgId,
        name: (name || "").trim() || null,
        type,
        tone,
        projectId: projectId || null,
        audience: audience || null,
        everyDays: days,
        emailTo: emailTo || null,
      },
    });
    return NextResponse.json(serialize(row), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
