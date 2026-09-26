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
