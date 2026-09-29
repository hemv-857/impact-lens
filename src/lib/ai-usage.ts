import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "./db";

export interface AiUsageEntry {
  kind: string;
  model?: string | null;
  provider?: string | null;
  durationMs: number;
  ok: boolean;
  status?: number | null;
  error?: string | null;
}

export interface AiActor {
  userId?: string | null;
  orgId?: string | null;
}

// Request-scoped actor for AI metering. Explicit als.run() at the AI call
// site (never enterWith — its store does not cross the caller's await
// boundary, and enterWith in shared contexts can leak between requests).
const als = new AsyncLocalStorage<AiActor>();

/** Attribute every AI call made inside fn to this user/org. */
export function withAiScope<T>(actor: AiActor, fn: () => Promise<T>): Promise<T> {
  return als.run(actor, fn);
}

/**
 * Per-org rolling-24h cap on provider calls (AI_DAILY_CALL_CAP, default 2000, 0 = off) so one
 * bulk job or a leaked session can't run up the provider bill. Unattributed (system) calls skip it.
 * ponytail: counts logged calls, not tokens — switch to a token/$ budget if prices per call diverge.
 */
export async function assertAiBudget(): Promise<void> {
  const orgId = als.getStore()?.orgId;
  const cap = Number(process.env.AI_DAILY_CALL_CAP ?? 2000);
  if (!orgId || !(cap > 0)) return;
  const used = await db.aiUsageLog.count({ where: { orgId, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } });
  if (used >= cap) throw new Error("AI usage limit reached for this organization. Try again later.");
}

/**
 * Fire-and-forget metering: never awaited, never throws — an analytics write
 * must not be able to fail an AI request.
 */
export function logAiUsage(e: AiUsageEntry): void {
  const actor = als.getStore();
  void db.aiUsageLog
    .create({
      data: {
        ...e,
        userId: actor?.userId ?? null,
        orgId: actor?.orgId ?? null,
        error: e.error ? e.error.slice(0, 500) : null,
      },
    })
    .catch(() => {});
}
