// Phase 1 (edge, proxy, deployment config) regression checks. The e2e server
// runs without Caddy, so the proxy fix is checked in the Caddyfile itself.
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const read = (p: string) => readFileSync(p, "utf8");

test("P1-001: Caddyfile has no client-chosen upstream port (XTransformPort loopback proxy)", () => {
  const caddy = read("Caddyfile");
  expect(caddy).not.toMatch(/XTransformPort/);
  expect(caddy).not.toMatch(/\{query\./); // no upstream built from the query string
});

test("P1-002: release scripts never ship or default to the seed database", () => {
  expect(read(".zscripts/database-runtime-build.sh")).not.toMatch(/cp .*SOURCE_DB/);
  expect(read(".zscripts/start.sh")).not.toMatch(/DEFAULT_PACKAGED_DB/);
  expect(read(".zscripts/start.sh")).not.toMatch(/echo .*\$DATABASE_URL/); // never print the DB URL
});

test("P1-003: security headers on every response", async ({ request }) => {
  const res = await request.get("/auth");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
});
