import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { login, OWNER } from "./helpers";

test.describe.configure({ mode: "serial" });

let page: Page;
let ctx: BrowserContext;
const consoleErrors: string[] = [];

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext();
  page = await ctx.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location()?.url ?? "";
    // Benign for this journey: the deliberate wrong-password attempt (401),
    // the missing favicon, and the sign-out port-hop to localhost:3000
    // (NEXTAUTH_URL default — a GAP asserted in the sign-out test above).
    if (m.text().includes("status of 401") || url.includes("favicon") || url.includes(":3000"))
      return;
    consoleErrors.push(`console: ${m.text()} @ ${url}`);
  });
});

test.afterAll(async () => {
  await ctx.close();
});

test("unauthenticated / redirects to sign-in with callback preserved", async () => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\?callbackUrl=%2F/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("you@organization.org")).toBeVisible();
});

test("invalid credentials surface a visible error", async () => {
  await page.goto("/auth");
  await page.locator("#email").fill(OWNER.email);
  await page.locator("#password").fill("wrong-password-999");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/Sign in failed/).first()).toBeVisible();
});

test("signup form documents and enforces 8-char password policy", async () => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Create one" }).click();
  await expect(page.getByPlaceholder("At least 8 characters")).toBeVisible();
  const pw = page.locator("#password");
  expect(await pw.getAttribute("minlength")).toBe("8");
  // Short password is blocked client-side: the form never navigates.
  await page.locator("#email").fill("audit-probe@example.org");
  await pw.fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page).toHaveURL(/\/auth/);
});

test("login lands on overview with signed-in org context", async () => {
  await login(page);
  await expect(page.getByText("GreenShoots").first()).toBeVisible();
  await expect(page.getByText("Turn field media into measurable impact.")).toBeVisible();
});

test("Quick actions opens the command palette via ⌘K", async () => {
  await page.keyboard.press("Meta+k");
  // Palette is a bare motion.div (no role=dialog) — assert via its input.
  await expect(page.getByPlaceholder("Search commands or jump to a tab…")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Search commands or jump to a tab…")).toHaveCount(0);
});

test("Analyze media dialog accepts images AND videos", async () => {
  await page.getByRole("button", { name: "Analyze media", exact: true }).first().click();
  const file = page.locator('input[type="file"]');
  await expect(file).toBeAttached();
  expect(await file.getAttribute("accept")).toContain("video/mp4");
  await expect(page.getByText("Paste URL")).toBeVisible();
  await expect(page.getByText("Generate", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(file).toHaveCount(0);
});

test("account menu exposes org actions and sign out", async () => {
  await page.locator("header").getByText("GreenShoots").click();
  await expect(page.getByText(/New organization/).first()).toBeVisible();
  await expect(page.getByText("Sign out").first()).toBeVisible();
  await page.getByText("Sign out").click();
  // GAP: sign-out resolves NEXTAUTH_URL default (localhost:3000) instead of
  // the current origin — lands on a foreign server when the app runs elsewhere.
  await expect(page).toHaveURL("http://localhost:3000/auth");
});

test("no console or page errors across the whole journey", async () => {
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
