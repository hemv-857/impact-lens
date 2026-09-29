// Phase 3 (tenant isolation / data API) regression checks — one per fix.
// Local-only: no AI provider, Cloudinary, or email calls (data-URL uploads fall
// back to ./uploads when CLOUDINARY_URL is unset).
import { existsSync, readFileSync } from "node:fs";
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { apiLogin, OWNER, OTHER_OWNER } from "./helpers";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Browser-free API contexts: one cookie jar per user.
async function as(who: typeof OWNER): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: test.info().project.use.baseURL });
  await apiLogin(ctx, who);
  return ctx;
}

test("sec-p3 uploads: another org's session cannot read or claim an uploaded file", async () => {
  const ada = await as(OWNER);
  const bob = await as(OTHER_OWNER);
  const up = await ada.post("/api/media", { data: { url: PNG, title: "sec-p3 upload probe" } });
  expect(up.status()).toBe(201);
  const asset = (await up.json()) as { id: string; url: string };
  try {
    expect(asset.url).toMatch(/^\/uploads\/upload_/);
    expect((await ada.get(asset.url)).status()).toBe(200);
    // cross-org read of the file itself
    expect((await bob.get(asset.url)).status()).toBe(404);
    // cross-org claim of the path (would feed analyze/delete/read), incl. case + traversal spellings
    for (const url of [asset.url, asset.url.replace("/uploads/", "/Uploads/"), `/x/..${asset.url}`]) {
      const claim = await bob.post("/api/media", { data: { url, title: "sec-p3 claim probe" } });
      if (claim.status() === 201) await bob.delete(`/api/media/${(await claim.json()).id}`);
      expect(claim.status(), url).toBe(400);
    }
    expect((await ada.get(asset.url)).status()).toBe(200);
  } finally {
    await ada.delete(`/api/media/${asset.id}`);
  }
});

test("sec-p3 delete: removing an asset never unlinks shared or out-of-uploads files", async () => {
  const bob = await as(OTHER_OWNER);
  // repo-shipped seed media shared by every org, and a traversal that normalizes out of /uploads/
  for (const [url, check] of [
    ["/field-media/beach_cleanup.jpg", "/field-media/beach_cleanup.jpg"],
    ["/uploads/../logo.svg", "/logo.svg"],
  ]) {
    const res = await bob.post("/api/media", { data: { url, title: "sec-p3 delete probe" } });
    expect(res.status(), url).toBe(201);
    expect((await bob.delete(`/api/media/${(await res.json()).id}`)).status()).toBe(200);
    expect((await bob.get(check)).status(), check).toBe(200);
  }
});

test("sec-p3 bulk delete: removes the uploaded file like single delete does", async () => {
  const ada = await as(OWNER);
  const up = await ada.post("/api/media", { data: { url: PNG, title: "sec-p3 bulk probe" } });
  expect(up.status()).toBe(201);
  const asset = (await up.json()) as { id: string; url: string };
  // prod standalone server chdirs into .next/standalone; dev writes to ./uploads
  const onDisk = () => [".next/standalone", "."].some((root) => existsSync(root + asset.url));
  expect(onDisk()).toBe(true);
  const del = await ada.post("/api/media/bulk", { data: { ids: [asset.id], action: "delete" } });
  expect((await del.json()).processed).toBe(1);
  expect(onDisk()).toBe(false);
});

test("sec-p3 inline upload: non-media data-URL subtypes are rejected", async ({ request }) => {
  await apiLogin(request);
  const html = "data:image/html;base64," + Buffer.from("<script>alert(1)</script>").toString("base64");
  const res = await request.post("/api/media", { data: { url: html, title: "sec-p3 html probe" } });
  if (res.status() === 201) await request.delete(`/api/media/${(await res.json()).id}`);
  expect(res.status()).toBe(400);
});

test("sec-p3 schedules: emailTo is limited to org members on create and edit", async ({ request }) => {
  await apiLogin(request);
  const outsider = await request.post("/api/schedules", { data: { emailTo: "outsider@evil.example" } });
  if (outsider.status() === 201) await request.delete(`/api/schedules/${(await outsider.json()).id}`);
  expect(outsider.status()).toBe(400);

  const ok = await request.post("/api/schedules", { data: { emailTo: OWNER.email } });
  expect(ok.status()).toBe(201);
  const { id } = (await ok.json()) as { id: string };
  try {
    for (const emailTo of ["outsider@evil.example", `${OWNER.email}, outsider@evil.example`]) {
      expect((await request.patch(`/api/schedules/${id}`, { data: { emailTo } })).status(), emailTo).toBe(400);
    }
    expect((await request.patch(`/api/schedules/${id}`, { data: { emailTo: "cara@example.org" } })).status()).toBe(200);
  } finally {
    await request.delete(`/api/schedules/${id}`);
  }
});

test("sec-p3 errors: 500s return a generic message, not the internal error text", async ({ request }) => {
  await apiLogin(request);
  const res = await request.post("/api/projects", { data: { name: { not: "a string" } } });
  expect(res.status()).toBe(500);
  expect(await res.json()).toEqual({ error: "Internal error" });
});

test("sec-p3 seed: every AI call is attributed to the caller's org (withAiScope)", () => {
  // Static check — running /api/seed would call the paid AI provider.
  const src = readFileSync("src/app/api/seed/route.ts", "utf8");
  const calls = src.match(/await [\w(), =>]*analyzeImage\(/g) ?? [];
  const scoped = src.match(/withAiScope\(auth, \(\) => analyzeImage\(/g) ?? [];
  expect(calls.length).toBeGreaterThan(0);
  expect(scoped.length).toBe(calls.length);
});
