import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { apiLogin, envLocal, OWNER, OTHER_OWNER } from "./helpers";

test.describe.configure({ mode: "serial" });

test("every core API rejects unauthenticated requests", async ({ request }) => {
  for (const p of [
    "/api/media",
    "/api/projects",
    "/api/reports",
    "/api/analytics",
    "/api/searches",
    "/api/comparisons",
  ]) {
    expect((await request.get(p)).status(), p).toBe(401);
  }
  expect((await request.post("/api/search", { data: { query: "x" } })).status()).toBe(401);
  expect((await request.post("/api/analyze/nope", { data: {} })).status()).toBe(401);
  expect(
    (await request.post("/api/report", { data: { type: "summary" } })).status()
  ).toBe(401);
});

test("owner session sees the org-scoped dataset", async ({ request }) => {
  await apiLogin(request);
  const session = await (await request.get("/api/auth/session")).json();
  expect(session.user?.email).toBe(OWNER.email);

  const media = await (await request.get("/api/media?limit=100")).json();
  const projects = await (await request.get("/api/projects")).json();
  const reports = await (await request.get("/api/reports")).json();
  expect(media.length).toBeGreaterThanOrEqual(13);
  expect(projects.length).toBeGreaterThanOrEqual(10);
  expect(reports.length).toBeGreaterThanOrEqual(9);
});

test("server-side verified filter matches DB reality (12/1)", async ({ request }) => {
  await apiLogin(request);
  const verified = await (await request.get("/api/media?verified=true&limit=100")).json();
  const unverified = await (await request.get("/api/media?verified=false&limit=100")).json();
  expect(verified.length).toBe(12);
  expect(unverified.length).toBe(1);
});

test("cross-org isolation: other owner gets zero rows, 404 on ids", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  await apiLogin(ownerCtx.request);
  const someAsset = (await (await ownerCtx.request.get("/api/media?limit=1")).json())[0];

  const otherCtx = await browser.newContext();
  await apiLogin(otherCtx.request, OTHER_OWNER);
  expect((await (await otherCtx.request.get("/api/media?limit=100")).json()).length).toBe(0);
  expect((await (await otherCtx.request.get("/api/projects")).json()).length).toBe(0);
  expect((await otherCtx.request.get(`/api/media/${someAsset.id}`)).status()).toBe(404);
  expect((await otherCtx.request.post(`/api/analyze/${someAsset.id}`, { data: {} })).status()).toBe(404);

  await ownerCtx.close();
  await otherCtx.close();
});

test("project create/delete round-trip", async ({ request }) => {
  await apiLogin(request);
  const before = (await (await request.get("/api/projects")).json()).length;
  const created = await request.post("/api/projects", { data: { name: "Audit Temp Project" } });
  expect([200, 201]).toContain(created.status());
  const body = await created.json();
  const id = body.id ?? body.project?.id;
  expect(id).toBeTruthy();
  const del = await request.delete(`/api/projects/${id}`);
  expect([200, 204]).toContain(del.status());
  expect((await (await request.get("/api/projects")).json()).length).toBe(before);
});

test("media export CSV carries traceability columns", async ({ request }) => {
  await apiLogin(request);
  const res = await request.get("/api/media/export?limit=100");
  expect(res.status()).toBe(200);
  const csv = await res.text();
  expect(csv).toContain("originalUrl");
  expect(csv).toContain("publicId");
  expect(csv.split("\n").length).toBeGreaterThan(10);
});

test("cron endpoint requires the shared secret", async ({ request }) => {
  expect((await request.post("/api/cron/reports", { data: {} })).status()).toBe(401);
  expect(
    (
      await request.post("/api/cron/reports", {
        data: {},
        headers: { "x-cron-secret": "wrong-secret" },
      })
    ).status()
  ).toBe(401);
  const res = await request.post("/api/cron/reports", {
    data: {},
    headers: { "x-cron-secret": envLocal("CRON_SECRET") },
  });
  expect(res.status()).toBe(200);
});

test("forged session cookie is rejected", async ({ request }) => {
  const res = await request.get("/api/media", {
    headers: { cookie: "next-auth.session-token=forged" },
  });
  expect(res.status()).toBe(401);
});

test("signup rejects weak passwords before any DB write", async ({ request }) => {
  const res = await request.post("/api/auth/signup", {
    data: { email: "audit-probe@example.org", password: "short", name: "Audit", orgName: "Audit Org" },
  });
  expect(res.status()).toBe(400);
});

test("F9: joining an existing org requires a valid invite code", async ({ request }) => {
  await apiLogin(request);
  const invite = await (await request.get("/api/org/invite")).json();
  expect(invite.code).toMatch(/^[a-z0-9]{8}$/);

  // fresh email per attempt — signup 409s once an address exists
  let attempt = 0;
  const join = (data: Record<string, unknown>) =>
    request.post("/api/auth/signup", {
      data: { email: `audit-joiner-${Date.now()}-${++attempt}@example.org`, password: "password123", orgName: "GreenShoots", ...data },
    });

  expect((await join({})).status()).toBe(403);
  expect((await join({ inviteCode: "deadbeef" })).status()).toBe(403);

  const ok = await join({ inviteCode: invite.code });
  expect(ok.status()).toBe(201);
  expect((await ok.json()).joined).toBe(true);

  // rotating revokes the old code for future joins
  const rotated = await (await request.post("/api/org/invite")).json();
  expect(rotated.code).not.toBe(invite.code);
  const reuse = await request.post("/api/auth/signup", {
    data: { email: `audit-joiner2-${Date.now()}@example.org`, password: "password123", orgName: "GreenShoots", inviteCode: invite.code },
  });
  expect(reuse.status()).toBe(403);
});

test("F9: non-owners cannot read the invite code", async ({ browser }) => {
  const ctx = await browser.newContext();
  await apiLogin(ctx.request, { email: "cara@example.org", password: "password123" });
  expect((await ctx.request.get("/api/org/invite")).status()).toBe(403);
  expect((await ctx.request.post("/api/org/invite")).status()).toBe(403);
  await ctx.close();
});

test("F2: data-URL upload lands on Cloudinary with a deliverable CDN URL", async ({ request }) => {
  test.skip(!envLocal("CLOUDINARY_URL"), "CLOUDINARY_URL not configured");
  await apiLogin(request);
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const res = await request.post("/api/media", {
    data: { url: `data:image/png;base64,${png}`, title: "F2 probe" },
  });
  expect(res.status()).toBe(201);
  const asset = (await res.json()) as { id: string; url: string; publicId: string };
  expect(asset.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/upload\/f_auto,q_auto\//);
  expect(asset.publicId).toMatch(/^impactlens\//);
  expect((await request.get(asset.url)).status()).toBe(200);
  expect((await request.delete(`/api/media/${asset.id}`)).status()).toBe(200);
});

test("security: DELETE refuses path traversal outside public/ and leaves the file intact", async ({ request }) => {
  await apiLogin(request);
  const res = await request.post("/api/media", {
    data: { url: "/uploads/../../.env.local", title: "traversal probe" },
  });
  expect(res.status()).toBe(201);
  const asset = (await res.json()) as { id: string };
  const del = await request.delete(`/api/media/${asset.id}`);
  // the DB row is removed, but the escaped path must never be unlinked
  expect(del.status(), JSON.stringify(await del.json())).toBe(200);
  expect(existsSync(resolve(process.cwd(), ".env.local"))).toBe(true);
  expect((await request.get(`/api/media/${asset.id}`)).status()).toBe(404);
});

test("AI usage meter: 401 unauthenticated, summary shape when authed", async ({ request }) => {
  expect((await request.get("/api/ai/usage")).status()).toBe(401);
  await apiLogin(request);
  const res = await request.get("/api/ai/usage");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
  for (const k of ["total", "ok", "failed", "avgMs"]) {
    expect(typeof body.summary[k], k).toBe("number");
  }
  if (body.items.length > 0) {
    expect(typeof body.items[0].kind).toBe("string");
    expect(typeof body.items[0].ok).toBe("boolean");
    expect(typeof body.items[0].durationMs).toBe("number");
  }
});

test("share links: mint, anonymous public read, revoke, cross-org 404", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  await apiLogin(ownerCtx.request);
  const reports = await (await ownerCtx.request.get("/api/reports")).json();
  expect(reports.length).toBeGreaterThan(0);
  const id = reports[0].id as string;

  const anonCtx = await browser.newContext(); // no session — a stranger with the link

  // mint (or rotate) the token
  const mint = await ownerCtx.request.post(`/api/reports/${id}/share`);
  expect(mint.status(), JSON.stringify(await mint.json())).toBe(200);
  const { token, url } = await mint.json();
  expect(token).toMatch(/^[0-9a-f]{32}$/);
  expect(url).toBe(`/share/${token}`);

  // read WITHOUT any session — the public share view
  const view = await anonCtx.request.get(url);
  expect(view.status()).toBe(200);
  const html = await view.text();
  expect(html).toContain("Read-only");
  expect(html).toContain("ImpactLens");

  // unknown / malformed tokens → 404, not a redirect to sign-in
  expect((await anonCtx.request.get("/share/00000000000000000000000000000000")).status()).toBe(404);
  expect((await anonCtx.request.get("/share/not-a-token")).status()).toBe(404);

  // another org's owner cannot mint a link for this report
  const otherCtx = await browser.newContext();
  await apiLogin(otherCtx.request, OTHER_OWNER);
  expect((await otherCtx.request.post(`/api/reports/${id}/share`)).status()).toBe(404);

  // revoke → the previously shared link dies immediately
  expect((await ownerCtx.request.delete(`/api/reports/${id}/share`)).status()).toBe(200);
  expect((await anonCtx.request.get(url)).status()).toBe(404);

  await ownerCtx.close();
  await anonCtx.close();
  await otherCtx.close();
});
