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
  try {
    expect(asset.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/upload\/f_auto,q_auto\//);
    expect(asset.publicId).toMatch(/^impactlens\//);
    // external CDN fetch — can flake; cleanup below must run regardless
    expect((await request.get(asset.url)).status()).toBe(200);
    expect((await request.delete(`/api/media/${asset.id}`)).status()).toBe(200);
  } finally {
    // a leaked probe asset breaks the exact verified-count test below
    await request.delete(`/api/media/${asset.id}`);
  }
});

test("security: DELETE refuses path traversal outside public/ and leaves the file intact", async ({ request }) => {
  await apiLogin(request);
  const res = await request.post("/api/media", {
    data: { url: "/uploads/../../.env.local", title: "traversal probe" },
  });
  expect(res.status()).toBe(201);
  const asset = (await res.json()) as { id: string };
  try {
    const del = await request.delete(`/api/media/${asset.id}`);
    // the DB row is removed, but the escaped path must never be unlinked
    expect(del.status(), JSON.stringify(await del.json())).toBe(200);
    expect(existsSync(resolve(process.cwd(), ".env.local"))).toBe(true);
    expect((await request.get(`/api/media/${asset.id}`)).status()).toBe(404);
  } finally {
    // never leak a probe row — it would shift the exact verified-count test
    await request.delete(`/api/media/${asset.id}`);
  }
});

test("topic tags: PATCH validates, adds/removes, and is org-scoped", async ({ request, browser }) => {
  // unauthenticated → 401
  const anon = await browser.newContext();
  expect((await anon.request.patch("/api/media/x", { data: { tags: ["t"] } })).status()).toBe(401);
  await anon.close();

  await apiLogin(request);
  const list = (await (await request.get("/api/media?limit=1")).json()) as Array<{ id: string; tags: string[] }>;
  const target = list[0];
  const url = `/api/media/${target.id}`;
  const orig = target.tags;

  try {
    // validation
    expect((await request.patch(url, { data: {} })).status()).toBe(400);
    expect((await request.patch(url, { data: { tags: "x" } })).status()).toBe(400);
    expect((await request.patch(url, { data: { tags: [42] } })).status()).toBe(400);
    expect((await request.patch(url, { data: { tags: ["x".repeat(41)] } })).status()).toBe(400);

    // add — trimmed + case-insensitive dedupe keeps the first spelling
    const add = await request.patch(url, { data: { tags: [...orig, "Manual Topic Alpha", "manual topic alpha "] } });
    expect(add.status()).toBe(200);
    const added = (await add.json()) as { tags: string[] };
    expect(added.tags).toContain("Manual Topic Alpha");
    expect(added.tags.filter((t) => t.toLowerCase() === "manual topic alpha")).toHaveLength(1);

    // remove → exactly the original list
    const back = await request.patch(url, { data: { tags: orig } });
    expect(back.status()).toBe(200);
    expect(((await back.json()) as { tags: string[] }).tags).toEqual(orig);
  } finally {
    await request.patch(url, { data: { tags: orig } });
  }

  // cross-org (bob on ada's asset) → 404
  const other = await browser.newContext();
  await apiLogin(other.request, { email: "bob@example.org", password: "password123" });
  expect((await other.request.patch(url, { data: { tags: ["hijack"] } })).status()).toBe(404);
  await other.close();
});

test("AI usage meter: 401 unauth, org-scoped rows, per-user breakdown", async ({ request, browser }) => {
  // unauthenticated → 401
  expect((await request.get("/api/ai/usage")).status()).toBe(401);

  // owner: shape + rows scoped to the caller's org only
  await apiLogin(request);
  const session = await (await request.get("/api/auth/session")).json();
  const orgId = session.user?.orgId as string;
  expect(typeof orgId).toBe("string");
  const res = await request.get("/api/ai/usage");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
  for (const k of ["total", "ok", "failed", "avgMs"]) {
    expect(typeof body.summary[k], k).toBe("number");
  }
  expect(Array.isArray(body.summary.byUser)).toBe(true);
  for (const u of body.summary.byUser) {
    expect(typeof u.email).toBe("string");
    expect(typeof u.count).toBe("number");
  }
  expect(body.items.every((i: { orgId: string | null }) => i.orgId === orgId)).toBe(true);

  // cross-org: a different owner's meter only ever holds their own rows
  const otherCtx = await browser.newContext();
  await apiLogin(otherCtx.request, OTHER_OWNER);
  const other = await (await otherCtx.request.get("/api/ai/usage")).json();
  expect(other.items.every((i: { orgId: string | null }) => i.orgId !== orgId)).toBe(true);
  expect(other.summary.total).toBe(other.items.length); // OtherOrg never called the AI
  expect(other.summary.total).toBe(0);
  await otherCtx.close();
});

test("share links: note, org branding, anon read, revoke, cross-org 404", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  await apiLogin(ownerCtx.request);
  const reports = await (await ownerCtx.request.get("/api/reports")).json();
  expect(reports.length).toBeGreaterThan(0);
  const id = reports[0].id as string;

  const orgs = await (await ownerCtx.request.get("/api/auth/orgs")).json();
  const orgName = ((orgs.find((o: { active?: boolean }) => o.active) ?? orgs[0]) as { name: string }).name;
  expect(orgName).toBeTruthy();

  const anonCtx = await browser.newContext(); // no session — a stranger with the link

  // initial state: no link yet
  const st0 = await (await ownerCtx.request.get(`/api/reports/${id}/share`)).json();
  expect(st0.active).toBe(false);
  expect(st0.url).toBeNull();

  // invalid notes are rejected before anything is minted
  expect(
    (await ownerCtx.request.post(`/api/reports/${id}/share`, { data: { note: "x".repeat(501) } })).status()
  ).toBe(400);
  expect(
    (await ownerCtx.request.post(`/api/reports/${id}/share`, { data: { note: 42 } })).status()
  ).toBe(400);

  // mint with a viewer note
  const mint = await ownerCtx.request.post(`/api/reports/${id}/share`, {
    data: { note: "For the board deck" },
  });
  expect(mint.status(), JSON.stringify(await mint.json())).toBe(200);
  const { token, url, note } = await mint.json();
  expect(token).toMatch(/^[0-9a-f]{32}$/);
  expect(url).toBe(`/share/${token}`);
  expect(note).toBe("For the board deck");

  // state reflects the active link + note
  const st1 = await (await ownerCtx.request.get(`/api/reports/${id}/share`)).json();
  expect(st1).toEqual({ active: true, url, note: "For the board deck" });

  // read WITHOUT any session — org branding + note are on the public view
  const view = await anonCtx.request.get(url);
  expect(view.status()).toBe(200);
  const html = await view.text();
  expect(html).toContain("Read-only");
  expect(html).toContain("For the board deck");
  expect(html).toContain(orgName);
  expect(html).toContain("presented with ImpactLens");

  // unknown / malformed tokens → 404, not a redirect to sign-in
  expect((await anonCtx.request.get("/share/00000000000000000000000000000000")).status()).toBe(404);
  expect((await anonCtx.request.get("/share/not-a-token")).status()).toBe(404);

  // another org's owner cannot mint a link for this report
  const otherCtx = await browser.newContext();
  await apiLogin(otherCtx.request, OTHER_OWNER);
  expect((await otherCtx.request.post(`/api/reports/${id}/share`, { data: {} })).status()).toBe(404);
  expect((await otherCtx.request.get(`/api/reports/${id}/share`)).status()).toBe(404);

  // revoke → the previously shared link dies immediately
  expect((await ownerCtx.request.delete(`/api/reports/${id}/share`)).status()).toBe(200);
  expect((await anonCtx.request.get(url)).status()).toBe(404);
  const st2 = await (await ownerCtx.request.get(`/api/reports/${id}/share`)).json();
  expect(st2.active).toBe(false);

  await ownerCtx.close();
  await anonCtx.close();
  await otherCtx.close();
});
