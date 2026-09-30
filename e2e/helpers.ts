import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const OWNER = { email: "ada@example.org", password: "password123" };
export const OTHER_OWNER = { email: "bob@example.org", password: "password123" };

export function envLocal(key: string): string {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    return text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
  } catch {
    return ""; // no .env.local (CI) — every key reads as unset
  }
}

export async function login(page: Page, who = OWNER) {
  await page.goto("/auth");
  await page.locator("#email").fill(who.email);
  await page.locator("#password").fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/");
}

export async function apiLogin(ctx: APIRequestContext, who = OWNER) {
  const csrf = await (await ctx.get("/api/auth/csrf")).json();
  const res = await ctx.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrf.csrfToken,
      email: who.email,
      password: who.password,
      json: "true",
    },
  });
  expect([200, 302]).toContain(res.status());
}

/** "Section" or "Section/View", e.g. "Home", "Library/Search". */
export async function gotoTab(page: Page, name: string) {
  const i = name.indexOf("/");
  const [section, view] = i < 0 ? [name, ""] : [name.slice(0, i), name.slice(i + 1)];
  await page.locator("header nav").getByRole("button", { name: section, exact: true }).click();
  if (view) await page.getByRole("tab", { name: view, exact: true }).click();
}
