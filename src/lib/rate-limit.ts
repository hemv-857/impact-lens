// In-memory fixed-window rate limit. ponytail: single-process only — swap for
// a shared store (Redis/Upstash) if the app ever runs multi-instance.
const hits = new Map<string, number[]>();

/** Returns false when the key exhausted `max` hits inside `windowMs`. `record: false` only checks. */
export function rateLimit(key: string, max: number, windowMs: number, record = true): boolean {
  const now = Date.now();
  if (hits.size > 10_000) hits.clear(); // ponytail: crude memory bound against key spraying; a shared store replaces it
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  if (record) arr.push(now);
  if (arr.length) hits.set(key, arr);
  else hits.delete(key); // don't keep empty keys alive (unbounded map under a spray of emails)
  return true;
}

/** Best-effort client IP behind a proxy; "local" when headers are absent. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
