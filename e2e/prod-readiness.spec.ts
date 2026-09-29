// Production-readiness audit (Rev. 4): health probe, search that survives a dead AI
// provider, evidence in the printable report, login throttling.
// The fixture DB + a keyless test server exercise the degraded paths deterministically.
import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

test("GET /api/health is public and reports DB reachability without detail", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
  expect(res.headers()["cache-control"]).toContain("no-store");
});

test("semantic search validates input and still answers when the AI ranker is unavailable", async ({ request }) => {
  await apiLogin(request);
  for (const query of [undefined, "", "   ", 42, { $ne: "" }]) {
    expect((await request.post("/api/search", { data: { query } })).status()).toBe(400);
  }

  const res = await request.post("/api/search", { data: { query: "solar energy installation" } });
  expect(res.status()).toBe(200); // never a 500 just because the provider is down / keyless / over budget
  const body = await res.json();
  expect(typeof body.degraded).toBe("boolean");
  expect(body.hits.length).toBeGreaterThan(0);
  if (body.degraded) {
    // keyword fallback: ranked, explained, org-scoped assets
    expect(body.hits[0].asset.title).toMatch(/solar/i);
    expect(body.hits[0].reason).toMatch(/^keyword match/);
    expect(body.hits[0].score).toBeGreaterThan(0);
  }
});

test("printable report carries the evidence it was written from, in citation order", async ({ request }) => {
  await apiLogin(request);
  const reports = (await (await request.get("/api/reports")).json()) as { id: string; mediaIds: string[] }[];
  const withEvidence = reports.find((r) => r.mediaIds.length >= 2);
  expect(withEvidence, "fixture has a report citing 2+ assets").toBeTruthy();

  const res = await request.get(`/api/report-pdf?id=${withEvidence!.id}`);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("<h2>Evidence</h2>");
  expect(html.match(/<figure class="ev">/g)?.length).toBe(withEvidence!.mediaIds.length);
  expect(html.indexOf("Asset 1")).toBeGreaterThan(-1);
  expect(html.indexOf("Asset 1")).toBeLessThan(html.indexOf("Asset 2"));
  expect(html).toMatch(/ref [\w/.-]+/); // provenance id per asset
  expect(html).toMatch(/human-verified|not yet verified/);
});

test("report evidence never leaks another org's assets", async ({ browser, request }) => {
  await apiLogin(request);
  const reports = (await (await request.get("/api/reports")).json()) as { id: string }[];
  const other = await browser.newContext();
  await apiLogin(other.request, { email: "bob@example.org", password: "password123" });
  expect((await other.request.get(`/api/report-pdf?id=${reports[0].id}`)).status()).toBe(404);
  await other.close();
});

test("repeated wrong passwords lock that IP+email out, even for the right password", async ({ browser, request }) => {
  // fresh account so the shared fixture users are never locked for later tests
  const email = `throttle-${Date.now()}@example.org`;
  const signup = await request.post("/api/auth/signup", {
    data: { email, password: "password123", name: "Throttle", orgName: `Throttle Org ${Date.now()}` },
  });
  expect(signup.status()).toBe(201);

  const ctx = await browser.newContext();
  const signedIn = async (password: string) => {
    const csrf = await (await ctx.request.get("/api/auth/csrf")).json();
    await ctx.request.post("/api/auth/callback/credentials", {
      form: { csrfToken: csrf.csrfToken, email, password, json: "true" },
    });
    return !!(await (await ctx.request.get("/api/auth/session")).json()).user;
  };

  for (let i = 0; i < 10; i++) expect(await signedIn("wrong-password")).toBe(false);
  expect(await signedIn("password123")).toBe(false); // locked out
  await ctx.close();
});
