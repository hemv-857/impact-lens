import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

// P5: the public share page must not be indexed and must not leak its token via Referer.
test("share page sets noindex and no-referrer", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  await apiLogin(ownerCtx.request);
  const reports = await (await ownerCtx.request.get("/api/reports")).json();
  expect(reports.length).toBeGreaterThan(0);
  const id = reports[reports.length - 1].id as string;

  const mint = await ownerCtx.request.post(`/api/reports/${id}/share`, { data: {} });
  expect(mint.status()).toBe(200);
  const { url } = await mint.json();
  try {
    const anonCtx = await browser.newContext();
    const res = await anonCtx.request.get(url);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(html).toMatch(/<meta name="referrer" content="no-referrer"/);
    await anonCtx.close();
  } finally {
    await ownerCtx.request.delete(`/api/reports/${id}/share`);
    await ownerCtx.close();
  }
});
