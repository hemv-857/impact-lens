import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { apiLogin } from "./helpers";

test.describe.configure({ mode: "serial" });

let browserCtx: BrowserContext;
let req: APIRequestContext;

test.beforeAll(async ({ browser }) => {
  browserCtx = await browser.newContext();
  req = browserCtx.request;
  await apiLogin(req);
});

test.afterAll(async () => {
  await browserCtx.close();
});

type AIRes = { status: number; body: string };

// Live LLM calls hit transient provider capacity errors (503 high demand).
// Retry those; fail fast on everything else (including expected 429 quota).
async function postAI(path: string, data: unknown): Promise<AIRes> {
  let last: AIRes = { status: 0, body: "" };
  for (let i = 0; i < 4; i++) {
    const res = await req.post(path, { data });
    const body = await res.text();
    last = { status: res.status(), body };
    const transient =
      last.status >= 500 && /503|high demand|UNAVAILABLE|overloaded|try again later/i.test(body);
    if (!transient) return last;
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return last;
}

const json = (r: AIRes) => JSON.parse(r.body);

// Gemini free tier is 20 requests; once exhausted, live capability tests
// self-skip instead of failing (capability verified in earlier green runs).
function skipIfQuota(r: AIRes) {
  const quota = /exceeded your current quota|RESOURCE_EXHAUSTED|quota exceeded for metric/i.test(
    r.body
  );
  test.skip(quota, "Gemini free-tier quota exhausted — see AUDIT.md capability evidence");
}

test("semantic search ranks assets with scores and reasons (LIVE)", async () => {
  const r = await postAI("/api/search", { query: "renewable energy infrastructure" });
  skipIfQuota(r);
  expect(r.status, r.body).toBe(200);
  const { hits } = json(r) as { hits: Array<{ score: number; reason: string }> };
  expect(hits.length).toBeGreaterThan(0);
  expect(typeof hits[0].score).toBe("number");
  expect(hits[0].reason.length).toBeGreaterThan(10);
});

test("AI report generation returns a full narrative (LIVE)", async () => {
  const media = (await (await req.get("/api/media?limit=2")).json()) as Array<{ id: string }>;
  const r = await postAI("/api/report", {
    type: "summary",
    tone: "professional",
    variantCount: 1,
    assetIds: media.map((m) => m.id),
  });
  skipIfQuota(r);
  expect(r.status, r.body).toBe(201);
  const report = json(r) as { id: string; narrative: string };
  expect(report.id).toBeTruthy();
  expect(report.narrative.length).toBeGreaterThan(200);
});

test("before/after comparison scores visual change (LIVE vision)", async () => {
  const media = (await (await req.get("/api/media?limit=100")).json()) as Array<{
    id: string;
    url: string;
  }>;
  const images = media.filter((m) => /^data:image|\.(png|jpe?g|webp|gif)(\?|$)/i.test(m.url));
  expect(images.length).toBeGreaterThanOrEqual(2);
  const r = await postAI("/api/compare", { beforeId: images[0].id, afterId: images[1].id });
  skipIfQuota(r);
  expect(r.status, r.body).toBe(201);
  const cmp = json(r) as { impactScore: number; narrative: string };
  expect(typeof cmp.impactScore).toBe("number");
  expect(cmp.narrative.length).toBeGreaterThan(50);
});

test("GAP: default Gemini provider cannot analyze video (video_url rejected)", async () => {
  const created = await req.post("/api/media", {
    data: { url: "data:video/mp4;base64,AAAA", title: "Audit video probe" },
  });
  expect(created.status()).toBe(201);
  const asset = (await created.json()) as { id: string };
  const r = await postAI(`/api/analyze/${asset.id}`, {});
  const deleted = await req.delete(`/api/media/${asset.id}`);
  expect([200, 204]).toContain(deleted.status());
  skipIfQuota(r);
  expect([500, 502], r.body).toContain(r.status);
  expect(r.body).toMatch(/video_url|content part|video/i);
});

test("GAP: image generation blocked by free-tier quota (billing needed)", async () => {
  const r = await postAI("/api/media/generate", { prompt: "aerial view of community solar panels" });
  if (r.status === 201) {
    const asset = json(r) as { id: string };
    expect([200, 204]).toContain((await req.delete(`/api/media/${asset.id}`)).status());
    return;
  }
  expect(r.status, r.body).toBe(502);
  // gemini free tier → quota; openrouter preset → no image endpoint (imageModel "")
  expect(r.body).toMatch(/no image generation|quota|RESOURCE_EXHAUSTED|billing|429/i);
});

test("campaign content generation for a platform (LIVE)", async () => {
  const media = (await (await req.get("/api/media?limit=2")).json()) as Array<{ id: string }>;
  const r = await postAI("/api/campaign", {
    platform: "instagram",
    tone: "emotional",
    assetIds: media.map((m) => m.id),
  });
  skipIfQuota(r);
  expect(r.status, r.body).toBe(201);
  const report = json(r) as { narrative: string };
  expect(report.narrative.length).toBeGreaterThan(100);
});
