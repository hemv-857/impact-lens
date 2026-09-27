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
 * Fire-and-forget metering: never awaited, never throws — an analytics write
 * must not be able to fail an AI request.
 * ponytail: covers OpenAI-compatible calls (aiFetch); the native Gemini image
 * path bypasses it — hook there if that provider becomes the default.
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
