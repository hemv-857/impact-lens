// Smoke check for the OpenAI-compatible AI client (src/lib/ai.ts).
// Stubs global fetch and asserts request shape, size fallback, and response parsing.
// Run: bun scripts/ai-smoke.ts
import assert from "node:assert";
import { chat, generateImage } from "../src/lib/ai";

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
    init?: { headers: Record<string, string>; body: string }
  ) => {
    if (init) {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ url: "https://example.test/img.png" }] }) };
    }
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
  await assert.rejects(() => chat([{ role: "user", content: "hi" }]), /AI_API_KEY is not set/);

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

  console.log("ai-smoke: all assertions passed");
}

main().catch((err) => {
  console.error("ai-smoke FAILED:", err);
  process.exit(1);
});
