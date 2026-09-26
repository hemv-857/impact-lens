// In-memory fixed-window rate limit. ponytail: single-process only — swap for
// a shared store (Redis/Upstash) if the app ever runs multi-instance.
const hits = new Map<string, number[]>();

/** Returns false when the key exhausted `max` hits inside `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

/** Best-effort client IP behind a proxy; "local" when headers are absent. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
