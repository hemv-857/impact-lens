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

/**
 * Fire-and-forget metering: never awaited, never throws — an analytics write
 * must not be able to fail an AI request.
 * ponytail: covers OpenAI-compatible calls (aiFetch); the native Gemini image
 * path bypasses it — hook there if that provider becomes the default.
 */
export function logAiUsage(e: AiUsageEntry): void {
  void db.aiUsageLog
    .create({
      data: { ...e, error: e.error ? e.error.slice(0, 500) : null },
    })
    .catch(() => {});
}
