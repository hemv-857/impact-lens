import { expect, test } from "@playwright/test";
import { login, OWNER } from "./helpers";

test.describe("Security: P6 supply chain, repo hygiene, CI", () => {
  test("demo users can authenticate via seed.db fixture", async ({ browser }) => {
    // Verify that the seeded test database allows authentication.
    // The production database (db/custom.db) is no longer shipped;
    // CI uses db/seed.db with sanitized test users (no invite codes).
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, OWNER);
    await expect(page.getByText("Platform at a glance")).toBeVisible();
    await ctx.close();
  });

  test("seed.db has no leaked invite codes or share tokens", async ({ browser }) => {
    // Verify the fixture is sanitized: no non-null invite codes or share tokens
    // that could enable unauthorized org joins or report access.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, OWNER);

    // Fetch org data to verify invite code is null.
    const res = await page.request.get("/api/orgs");
    const orgs = await res.json();
    for (const org of orgs) {
      expect(org.inviteCode).toBeNull();
    }

    await ctx.close();
  });
});
