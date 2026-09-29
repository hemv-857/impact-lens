import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { apiLogin } from "./helpers";

const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

function srcHits(term: string): string[] {
  const files = readdirSync(path.join(root, "src"), { recursive: true }) as string[];
  return files.filter(
    (f) =>
      /\.(ts|tsx)$/.test(f) &&
      readFileSync(path.join(root, "src", f), "utf8").toLowerCase().includes(term)
  );
}

test("PASS: Cloudinary integrated (PS 02 mandate) with local fallback", () => {
  expect(Object.keys(deps).filter((d) => d.includes("cloudinary")).length).toBeGreaterThan(0);
  expect(srcHits("cloudinary").length).toBeGreaterThan(0);
});

test("PASS: uploads/ is git-ignored (user media never committed)", () => {
  expect(read(".gitignore")).toMatch(/^\/uploads\/$/m);
});

test("PASS: .env files are git-ignored (secrets stay local)", () => {
  expect(read(".gitignore")).toMatch(/\.env/);
});

test("uploads/ is live local storage with files present", () => {
  // prod standalone server chdirs into .next/standalone; dev writes to ./uploads
  const dir = [".next/standalone/uploads", "uploads"].map((d) => path.join(root, d)).find(existsSync);
  expect(dir).toBeTruthy();
  expect(readdirSync(dir!).length).toBeGreaterThan(0);
});

test("GAP: repo ships no video fixtures — video path never exercised by seed", () => {
  const files = readdirSync(path.join(root, "public/field-media"));
  expect(files.filter((f) => /\.(mp4|webm|mov|mkv)$/i.test(f))).toEqual([]);
});

test("PASS: build fails on type errors (typescript.ignoreBuildErrors disabled)", () => {
  expect(read("next.config.ts")).toMatch(/ignoreBuildErrors:\s*false/);
});

test("PASS: start script pins absolute DATABASE_URL for standalone build", () => {
  expect(pkg.scripts.start).toContain("file:$(pwd)/db/custom.db");
});

test("GAP: single-file SQLite DB — no external DB / horizontal scale path", () => {
  expect(read("prisma/schema.prisma")).toMatch(/provider\s*=\s*"sqlite"/);
  expect(Object.keys(deps).join(",")).not.toMatch(/postgres|mysql|mariadb|@supabase/);
});

test("GAP: no job queue — AI analysis runs inside the HTTP request", () => {
  expect(Object.keys(deps).join(",")).not.toMatch(/bullmq|bee-queue|graphile|pg-boss/);
});

test("app shell responds within 3s (local hosting feasibility)", async ({ request }) => {
  for (const url of ["/auth", "/"]) {
    const t0 = Date.now();
    const res = await request.get(url);
    expect([200, 307]).toContain(res.status());
    expect(Date.now() - t0, url).toBeLessThan(3000);
  }
});

test("PASS: server rejects >10MB inline uploads with 413", async ({ request }) => {
  await apiLogin(request);
  // >14,000,000 base64 chars ≈ 10MB binary — past the server's cap.
  const payload = "data:image/png;base64," + "A".repeat(14 * 1024 * 1024);
  const res = await request.post("/api/media", {
    data: { url: payload, title: "Audit oversize probe" },
  });
  expect(res.status(), `body: ${await res.text()}`).toBe(413);
});
