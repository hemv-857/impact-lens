// Smoke check for the OpenAI-compatible AI client (src/lib/ai.ts).
// Stubs global fetch and asserts request shape, size fallback, and response parsing.
// Run: bun scripts/ai-smoke.ts
import assert from "node:assert";
import { chat, generateImage } from "../src/lib/ai";

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

  console.log("ai-smoke: all assertions passed");
}

main().catch((err) => {
  console.error("ai-smoke FAILED:", err);
  process.exit(1);
});
