// POST /api/cron/reports — run every active report schedule that is due.
// Guarded by CRON_SECRET (gitignored .env.local): send it as `x-cron-secret: <secret>`
// or `Authorization: Bearer <secret>`. Point an external scheduler (GitHub Actions
// cron, Vercel Cron, system crontab) at this endpoint.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReportsForOrg, ReportGenError, type ReportRequest } from "@/lib/report-gen";
import { isEmailConfigured, renderReportEmail, sendMail } from "@/lib/email";
import { notifySlack } from "@/lib/slack";
import { withAiScope } from "@/lib/ai-usage";

const DAY_MS = 86_400_000;

function checkSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured (set it in .env.local)" },
      { status: 503 }
    );
  }
  const provided =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

interface RunResult {
  id: string;
  ok: boolean;
  reportId?: string;
  email?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const denied = checkSecret(req);
    if (denied) return denied;

    const now = Date.now();
    const schedules = await db.reportSchedule.findMany({ where: { active: true } });
    const due = schedules.filter(
      (s) => !s.lastRunAt || now - s.lastRunAt.getTime() >= s.everyDays * DAY_MS
    );

    const results: RunResult[] = [];
    for (const schedule of due) {
      try {
        let assetIds: string[] | undefined;
        if (schedule.assetIds) {
          try {
            const parsed = JSON.parse(schedule.assetIds);
            if (Array.isArray(parsed)) assetIds = parsed;
          } catch {
            assetIds = undefined;
          }
        }

        const { reports } = await withAiScope(
          { orgId: schedule.orgId }, // cron is a system actor: org yes, user no
          () =>
            generateReportsForOrg(schedule.orgId, {
              type: schedule.type as ReportRequest["type"],
              tone: schedule.tone as ReportRequest["tone"],
              projectId: schedule.projectId || undefined,
              assetIds,
              audience: schedule.audience || undefined,
            })
        );

        let email = "skipped: no recipient";
        if (schedule.emailTo) {
          const { subject, text } = renderReportEmail(reports[0]);
          const res = await sendMail({ to: schedule.emailTo, subject, text });
          email = res.sent ? "sent" : `skipped: ${res.reason}`;
        }

        await db.reportSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date() },
        });
        results.push({ id: schedule.id, ok: true, reportId: reports[0].id, email });
      } catch (e) {
        // Leave lastRunAt untouched so the next tick retries this schedule.
        const message =
          e instanceof ReportGenError || e instanceof Error ? e.message : "run failed";
        results.push({ id: schedule.id, ok: false, error: message });
      }
    }

    const ran = results.filter((r) => r.ok).length;
    // Fire-and-forget: a Slack outage must not fail the cron run.
    if (results.length > 0) {
      void notifySlack(
        `ImpactLens scheduled reports: ${ran}/${results.length} schedule(s) ran, ${results.length - ran} failed (${due.length} due)`
      );
    }

    return NextResponse.json({
      ok: true,
      checked: schedules.length,
      due: due.length,
      ran,
      emailConfigured: isEmailConfigured(),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
