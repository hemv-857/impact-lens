import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
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

  test("committed fixture carries no invite codes or share tokens", () => {
    // Read the fixture file itself: the running server's DB mints codes during other tests.
    const out = execFileSync("python3", [
      "-c",
      "import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);print(c.execute('select (select count(*) from Organization where inviteCode is not null)+(select count(*) from Report where shareToken is not null)').fetchone()[0])",
      path.join(process.cwd(), "e2e/fixtures/seed.db"),
    ]).toString().trim();
    expect(out).toBe("0");
  });
});
