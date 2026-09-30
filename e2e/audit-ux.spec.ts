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
    // Benign for this journey: the deliberate wrong-password attempt (401)
    // and the deliberate unknown-route probe (document 404).
    if (m.text().includes("status of 401")) return;
    if (url.includes("/definitely-not-a-page")) return;
    consoleErrors.push(`console: ${m.text()} @ ${url}`);
  });
});

test.afterAll(async () => {
  await ctx.close();
});

test("unauthenticated / renders the public landing page", async () => {
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("heading", { name: /evidence of impact/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
});

test("unauthenticated deep link redirects to sign-in with callback preserved", async () => {
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/auth\?callbackUrl=%2Freports/);
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
  await expect(page.getByRole("heading", { level: 1, name: /what’s happening/ })).toBeVisible();
});

test("Quick actions opens the command palette via ⌘K", async () => {
  await page.keyboard.press("Meta+k");
  // Palette carries role=dialog (a11y) — assert via accessible role + input.
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await expect(page.getByPlaceholder("Search commands or jump to a tab…")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Search commands or jump to a tab…")).toHaveCount(0);
});

test("Add media dialog accepts images AND videos", async () => {
  await page.getByRole("button", { name: "Add media", exact: true }).first().click();
  const file = page.locator('input[type="file"]');
  await expect(file).toBeAttached();
  expect(await file.getAttribute("accept")).toContain("video/mp4");
  await expect(page.getByText("Paste URL")).toBeVisible();
  await expect(page.getByText("Generate", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(file).toHaveCount(0);
});

test("custom 404 page renders for unknown routes while signed in", async () => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("heading", { name: /404 — page not found/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to overview" })).toBeVisible();
  await page.goto("/"); // subsequent serial tests expect the app shell
});

test("dark mode toggle applies and persists across reload", async () => {
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  const before = await isDark();
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect.poll(isDark).toBe(!before);
  await page.reload();
  await expect.poll(isDark).toBe(!before); // persisted via storageKey
  // restore the original theme for the rest of the journey
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect.poll(isDark).toBe(before);
});

test("account menu exposes org actions and sign out", async () => {
  await page.locator("aside").getByText("GreenShoots").click();
  await expect(page.getByText(/New organization/).first()).toBeVisible();
  await expect(page.getByText("Sign out").first()).toBeVisible();
  await page.getByText("Sign out").click();
  // Sign-out must resolve on the current origin (127.0.0.1:3002), not the
  // NEXTAUTH_URL default of :3000 — enforced by redirect:false + relative nav.
  await expect(page).toHaveURL("http://127.0.0.1:3002/auth");
});

test("no console or page errors across the whole journey", async () => {
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
