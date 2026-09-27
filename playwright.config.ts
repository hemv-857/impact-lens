import { defineConfig } from "@playwright/test";

// ImpactLens audit suite. Expects the production server on :3002:
//   NODE_ENV=production PORT=3002 bun .next/standalone/server.js
// (port 3001 is owned by another project's dev server — keep them apart)
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // IPv4 literal: a stray dev server on another project can bind [::1]:<port>;
    // "localhost" resolves there first and 404s every route.
    baseURL: "http://127.0.0.1:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
