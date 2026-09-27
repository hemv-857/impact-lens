import { defineConfig } from "@playwright/test";

// ImpactLens audit suite. Expects the production server on :3001:
//   NODE_ENV=production PORT=3001 bun .next/standalone/server.js
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // IPv4 literal: a dev server from another project can bind [::1]:3001;
    // "localhost" resolves there first and 404s every route.
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
