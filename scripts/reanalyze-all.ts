// Robustly re-analyze all unanalyzed media assets, one at a time.
// Verifies each call actually succeeded by checking the response JSON.
// Waits between calls to avoid VLM API 429 rate-limits.
// Usage: bun run scripts/reanalyze-all.ts
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const WAIT_MS = 65_000; // 65s between calls
const MAX_ITERS = 50;

interface MediaAsset {
  id: string;
  url: string;
  aiCaption?: string | null;
  analyzedAt?: string | null;
  title?: string;
}

function fetchMedia(): MediaAsset[] {
  try {
    const out = execSync(`curl -s --max-time 15 "${BASE}/api/media?limit=200"`, {
      encoding: "utf8",
      timeout: 20000,
    });
    return JSON.parse(out) as MediaAsset[];
  } catch {
    return [];
  }
}

function analyzeOne(id: string): { ok: boolean; caption?: string; error?: string } {
  try {
    const out = execSync(
      `curl -s --max-time 250 -X POST "${BASE}/api/analyze/${id}"`,
      { encoding: "utf8", timeout: 260000 }
    );
    const parsed = JSON.parse(out);
    if (parsed.analyzedAt && parsed.aiCaption) {
      return { ok: true, caption: String(parsed.aiCaption).slice(0, 60) };
    }
    return { ok: false, error: parsed.error || "no analyzedAt in response" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "curl failed" };
  }
}

async function main() {
  console.log(`[reanalyze-all] starting at ${new Date().toISOString()}`);
  let totalOk = 0;
  let totalFail = 0;
  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    const all = fetchMedia();
    if (all.length === 0) {
      console.log(`[${iter}] server returned no media — is dev server up?`);
      await sleep(5_000);
      continue;
    }
    const miss = all.find((a) => !a.analyzedAt);
    if (!miss) {
      console.log(`[${iter}] ✅ All ${all.length} assets analyzed!`);
      break;
    }
    console.log(`[${iter}] analyzing ${miss.id} (${miss.url})`);
    const r = analyzeOne(miss.id);
    if (r.ok) {
      totalOk++;
      console.log(`[${iter}]   ✅ OK: ${r.caption}`);
    } else {
      totalFail++;
      console.log(`[${iter}]   ❌ FAIL: ${r.error}`);
      // If the failure was a hard rate-limit, wait extra before next try
      if (r.error && /429|Too many|rate/i.test(r.error)) {
        console.log(`[${iter}]   ⏳ rate-limited, sleeping extra 90s`);
        await sleep(90_000);
      }
    }
    await sleep(WAIT_MS);
  }
  console.log(`\n[reanalyze-all] DONE. ok=${totalOk} fail=${totalFail}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
