// Smoke check for email delivery (src/lib/email.ts) and Slack notifications
// (src/lib/slack.ts): exact provider contracts + skip-when-unset behavior.
// Stubs global fetch; no network.
// Run: bun scripts/notify-smoke.ts
import assert from "node:assert";
import { isEmailConfigured, sendMail } from "../src/lib/email";
import { isSlackConfigured, notifySlack } from "../src/lib/slack";

interface Call {
  url: string;
  headers: Record<string, string>;
  body: string;
}
const calls: Call[] = [];
(globalThis as { fetch: unknown }).fetch = async (
  url: string,
  init?: { headers?: Record<string, string>; body?: string }
) => {
  calls.push({ url: String(url), headers: init?.headers ?? {}, body: init?.body ?? "" });
  return { ok: true, status: 200, text: async () => "{}" };
};

async function main() {
  // 1. email unconfigured → skipped, never throws, no call made
  delete process.env.EMAIL_API_BASE_URL;
  delete process.env.EMAIL_API_KEY;
  assert.equal(isEmailConfigured(), false);
  let r = await sendMail({ to: "x@y.z", subject: "s", text: "t" });
  assert.equal(r.sent, false);
  assert.match(r.reason ?? "", /not configured/);
  assert.equal(calls.length, 0);

  // 2. email configured → POST {base}/emails, Bearer key, exact envelope
  process.env.EMAIL_API_BASE_URL = "https://mail.test/";
  process.env.EMAIL_API_KEY = "k-123";
  process.env.EMAIL_FROM = "ImpactLens <reports@x.org>";
  assert.equal(isEmailConfigured(), true);
  r = await sendMail({ to: "a@b.c", subject: "Hello", text: "body" });
  assert.equal(r.sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://mail.test/emails"); // trailing slash trimmed
  assert.equal(calls[0].headers.Authorization, "Bearer k-123");
  const payload = JSON.parse(calls[0].body);
  assert.deepEqual(payload.to, ["a@b.c"]);
  assert.equal(payload.subject, "Hello");
  assert.equal(payload.text, "body");
  assert.equal(payload.from, "ImpactLens <reports@x.org>");
  assert.ok(payload.html.includes("body"));

  // 3. slack unconfigured → skipped, no call made
  delete process.env.SLACK_WEBHOOK_URL;
  assert.equal(isSlackConfigured(), false);
  let s = await notifySlack("runs: 3/3");
  assert.equal(s.sent, false);
  assert.match(s.reason ?? "", /not set/);
  assert.equal(calls.length, 1);

  // 4. slack configured → POST {webhook} {text}
  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/services/x";
  s = await notifySlack("runs: 3/3");
  assert.equal(s.sent, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://hooks.slack.test/services/x");
  assert.equal(JSON.parse(calls[1].body).text, "runs: 3/3");

  console.log("notify-smoke: all assertions passed");
}

await main();
