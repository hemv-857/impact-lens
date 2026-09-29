// Smoke check for the OpenAI-compatible AI client (src/lib/ai.ts).
// Stubs global fetch and asserts request shape, size fallback, and response parsing.
// Run: bun scripts/ai-smoke.ts
import assert from "node:assert";
import { analyzeMedia, chat, compareImages, generateImage, generateReport, lexicalHits, semanticSearch } from "../src/lib/ai";
import { assertAiBudget, withAiScope } from "../src/lib/ai-usage";
import { parseExifDate } from "../src/lib/cloudinary";
import { cdnThumbnail } from "../src/lib/serialize";

process.env.AI_PROVIDER = "openai"; // steps 1-4 exercise the OpenAI-style path; default (gemini) is step 8
process.env.AI_BASE_URL = "https://example.test/v1/";
process.env.AI_API_KEY = "test-key";
process.env.AI_TEXT_MODEL = "text-model";
process.env.AI_VISION_MODEL = "vision-model";
process.env.AI_IMAGE_MODEL = "image-model";

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}
const calls: Call[] = [];
const queue: { status?: number; json?: unknown; text?: string }[] = [];

(globalThis as { fetch: unknown }).fetch = async (
  url: string,
  init: { headers: Record<string, string>; body: string }
) => {
  calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
  const next = queue.shift() ?? { json: { choices: [{ message: { content: "ok" } }] } };
  const status = next.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => next.text ?? JSON.stringify(next.json ?? {}),
  };
};

async function main() {
  // 1. chat(): endpoint, trailing-slash trim, auth, model selection
  const text = await chat([{ role: "user", content: "hi" }]);
  assert.equal(text, "ok");
  assert.equal(calls[0].url, "https://example.test/v1/chat/completions");
  assert.equal(calls[0].headers.Authorization, "Bearer test-key");
  assert.equal(calls[0].body.model, "text-model");

  // 2. vision=true picks the vision model, keeps multimodal parts
  await chat(
    [
      {
        role: "user",
        content: [
          { type: "text", text: "look" },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA" } },
        ],
      },
    ],
    true
  );
  assert.equal(calls[1].body.model, "vision-model");
  const parts = (calls[1].body.messages as { content: { type: string }[] }[])[0].content;
  assert.deepEqual(
    parts.map((p) => p.type),
    ["text", "image_url"]
  );

  // 3. generateImage: unsupported size falls back to "auto"
  queue.push({ status: 400, text: `{"error":{"message":"Invalid value for 'size'"}}` });
  queue.push({ json: { data: [{ b64_json: Buffer.from("img").toString("base64") }] } });
  const img = await generateImage("a forest", "1344x768");
  assert.equal(img.buffer.toString(), "img");
  assert.equal(calls[2].body.size, "1344x768"); // first attempt: requested size
  assert.equal(calls[3].body.size, "auto"); // rejected -> fallback
  assert.equal(calls[3].body.model, "image-model");
  assert.equal(calls.length, 4);

  // 4. url-shaped image response is downloaded
  calls.length = 0;
  (globalThis as { fetch: unknown }).fetch = async (
    url: string,
    init?: { headers: Record<string, string>; body?: string; redirect?: string }
  ) => {
    if (init?.body) {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ url: "https://example.test/img.png" }] }) };
    }
    assert.equal(init?.redirect, "error"); // download never follows redirects
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode("png-bytes").buffer,
    };
  };
  const downloaded = await generateImage("a river");
  assert.equal(downloaded.buffer.toString(), "png-bytes");
  assert.equal(calls[0].url, "https://example.test/v1/images/generations");
  assert.equal(calls[0].body.size, "1344x768"); // default size, no fallback needed

  // 5. clear error when no key
  delete process.env.AI_API_KEY;
  await assert.rejects(() => chat([{ role: "user", content: "hi" }]), /AI_API_KEY \(or OPENAI_API_KEY\) is not set/);

  // 6. AI_PROVIDER preset: base URL + models from preset, provider key alias, no-image error
  calls.length = 0;
  (globalThis as { fetch: unknown }).fetch = async (
    url: string,
    init: { headers: Record<string, string>; body: string }
  ) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: "groq" } }] }) };
  };
  delete process.env.AI_BASE_URL;
  delete process.env.AI_TEXT_MODEL;
  delete process.env.AI_VISION_MODEL;
  delete process.env.AI_IMAGE_MODEL;
  process.env.AI_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "gsk_test";
  assert.equal(await chat([{ role: "user", content: "hi" }]), "groq");
  assert.equal(calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(calls[0].headers.Authorization, "Bearer gsk_test");
  assert.equal(calls[0].body.model, "openai/gpt-oss-120b");
  await assert.rejects(() => generateImage("x"), /has no image generation/);

  // 7. unknown provider fails fast
  process.env.AI_PROVIDER = "bogus";
  await assert.rejects(() => chat([{ role: "user", content: "hi" }]), /Unknown AI_PROVIDER "bogus"/);

  // 8. default provider is gemini: compat chat + native :generateContent image path
  delete process.env.AI_PROVIDER;
  delete process.env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = "gm-test-key";
  calls.length = 0;
  let gimgCalls = 0;
  (globalThis as { fetch: unknown }).fetch = async (
    url: string,
    init: { headers: Record<string, string>; body: string }
  ) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    if (url.includes(":generateContent")) {
      gimgCalls++;
      if (gimgCalls === 2) {
        return { ok: false, status: 400, text: async () => JSON.stringify({ error: { message: "Invalid image_config.aspect_ratio" } }) };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }, { inlineData: { data: Buffer.from("gimg").toString("base64") } }] } }] }),
      };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: "gemini-ok" } }] }) };
  };
  assert.equal(await chat([{ role: "user", content: "hi" }]), "gemini-ok");
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assert.equal(calls[0].headers.Authorization, "Bearer gm-test-key");
  assert.equal(calls[0].body.model, "gemini-3.8-flash");

  const g = await generateImage("a forest", "1344x768");
  assert.equal(g.buffer.toString(), "gimg");
  assert.equal(calls[1].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent");
  assert.equal(calls[1].headers["x-goog-api-key"], "gm-test-key");
  assert.equal(calls[1].headers.Authorization, undefined); // native endpoint uses the goog key header, not bearer
  const gcfg = calls[1].body.generationConfig as { responseModalities: string[]; imageConfig?: { aspectRatio: string } };
  assert.deepEqual(gcfg.responseModalities, ["TEXT", "IMAGE"]);
  assert.equal(gcfg.imageConfig?.aspectRatio, "16:9"); // nearest ratio for 1344x768

  // 9. aspect rejection retries once without imageConfig
  const g2 = await generateImage("a river", "1344x768"); // attempt 1 -> 400, retry -> success
  assert.equal(g2.buffer.toString(), "gimg");
  assert.equal((calls[3].body.generationConfig as { imageConfig?: unknown }).imageConfig, undefined);
  assert.equal(calls.length, 4);

  // 10. model output is validated, never invented: junk throws, partial JSON is normalized
  let reply = "";
  let lastPrompt = "";
  (globalThis as { fetch: unknown }).fetch = async (_url: string, init: { body: string }) => {
    lastPrompt = JSON.stringify(JSON.parse(init.body).messages);
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: reply } }] }) };
  };
  const IMG = "https://example.test/a.jpg";

  reply = "Sorry, I can't help with that.";
  await assert.rejects(() => analyzeMedia(IMG, "image"), /unparseable/);
  await assert.rejects(() => compareImages(IMG, IMG), /unparseable/);
  await assert.rejects(() => generateReport({ type: "impact", tone: "professional", assets: [] }), /unparseable/);
  await assert.rejects(() => semanticSearch("q", [{ id: "a", caption: "c", summary: "", tags: [] }]), /unparseable/);

  reply = JSON.stringify({ caption: "Saplings in rows", confidence: 7, qualityScore: -2, category: "made-up", tags: ["Tree, Planting", 5, " "], signals: [{ label: "canopy", confidence: 3 }, "junk"] });
  const an = await analyzeMedia(IMG, "image");
  assert.equal(an.caption, "Saplings in rows");
  assert.equal(an.confidence, 1); // clamped, not stored as 7
  assert.equal(an.qualityScore, 0);
  assert.equal(an.category, "other"); // off-list category
  assert.deepEqual(an.tags, ["tree planting"]); // comma would split the CSV column; non-strings dropped
  assert.deepEqual(an.signals, [{ label: "canopy", confidence: 1, category: "environment" }]);
  assert.deepEqual(an.objects, []); // missing array -> [], callers never see undefined

  reply = JSON.stringify({ narrative: "Visible regrowth.", impactScore: 9, changes: [{ aspect: "cover" }, 3] });
  const cmp = await compareImages(IMG, IMG);
  assert.equal(cmp.impactScore, 1);
  assert.equal(cmp.changes.length, 1);

  // 11. reports: grounded prompt, primitive-only metrics, no filler defaults
  reply = JSON.stringify({ title: "T", narrative: "N", metrics: { trees: 250, nested: { a: 1 }, list: [1], ok: "12 ha", nan: null } });
  const rep = await generateReport({ type: "impact", tone: "professional", assets: [{ caption: "c", summary: "s", tags: [] }] });
  assert.deepEqual(rep.metrics, { trees: 250, ok: "12 ha" });
  assert.equal(rep.headline, ""); // not a fabricated "Impact report generated."
  assert.match(lastPrompt, /never estimate, extrapolate or invent a number/);
  assert.match(lastPrompt, /GROUNDING/);

  // 12. semantic search: invented/duplicate ids dropped, scores clamped
  reply = JSON.stringify({ hits: [{ assetId: "ghost", score: 1 }, { assetId: "a", score: 5, reason: "r" }, { assetId: "a", score: 0.1 }, { assetId: "b" }] });
  const sr = await semanticSearch("q", [
    { id: "a", caption: "c", summary: "", tags: [] },
    { id: "b", caption: "c", summary: "", tags: [] },
  ]);
  assert.deepEqual(sr, [{ assetId: "a", score: 1, reason: "r" }, { assetId: "b", score: 0, reason: "" }]);

  // 13. keyword ranking (the no-AI / oversized-library path)
  const cat = [
    { id: "solar", caption: "Rooftop panels", summary: "", tags: ["solar", "energy"], activity: "solar installation" },
    { id: "trees", caption: "Volunteers planting saplings", summary: "", tags: ["reforestation"], location: "hillside" },
    { id: "misc", caption: "Office", summary: "", tags: [] },
  ];
  assert.deepEqual(lexicalHits("solar energy", cat).map((h) => h.assetId), ["solar"]);
  assert.deepEqual(lexicalHits("plant", cat).map((h) => h.assetId), ["trees"]); // substring: plant ⊂ planting
  assert.deepEqual(lexicalHits("!", cat), []);
  assert.deepEqual(lexicalHits("the of for", cat), []); // filler words alone match nothing
  assert.deepEqual(lexicalHits("photos of solar", cat).map((h) => h.assetId), ["solar"]);
  assert.match(lexicalHits("solar", cat)[0].reason, /solar/);

  // 14. Cloudinary helpers: EXIF dates, preview URLs
  assert.equal(parseExifDate("2024:03:09 14:05:59")?.toISOString(), "2024-03-09T14:05:59.000Z");
  assert.equal(parseExifDate("0000:00:00 00:00:00"), null); // unset camera clock
  assert.equal(parseExifDate("2999:01:01 00:00:00"), null);
  assert.equal(parseExifDate(undefined), null);
  const base = "https://res.cloudinary.com/demo/";
  assert.equal(cdnThumbnail(`${base}image/upload/f_auto,q_auto/v1/impactlens/a.jpg`, "image"), `${base}image/upload/c_limit,w_640,f_auto,q_auto/v1/impactlens/a.jpg`);
  assert.equal(cdnThumbnail(`${base}video/upload/f_auto,q_auto/v1/impactlens/a.mp4`, "video"), `${base}video/upload/so_0,c_limit,w_640,f_jpg,q_auto/v1/impactlens/a.jpg`);
  assert.equal(cdnThumbnail("/uploads/upload_x.jpg", "image"), null); // local media has no CDN preview

  // 15. spend cap is a no-op without an org scope or when disabled (DB path is covered in e2e/prod-readiness)
  await assertAiBudget();
  process.env.AI_DAILY_CALL_CAP = "0";
  await withAiScope({ orgId: "org" }, () => assertAiBudget());

  console.log("ai-smoke: all assertions passed");
}

main().catch((err) => {
  console.error("ai-smoke FAILED:", err);
  process.exit(1);
});
