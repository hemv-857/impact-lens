import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

test("GAP: Cloudinary mandated by PS 02 but not integrated anywhere", () => {
  expect(Object.keys(deps).filter((d) => d.includes("cloudinary"))).toEqual([]);
  expect(srcHits("cloudinary")).toEqual([]);
});

test("GAP: public/uploads not git-ignored — user media would be committed", () => {
  expect(read(".gitignore")).not.toMatch(/public\/uploads/);
});

test("PASS: .env files are git-ignored (secrets stay local)", () => {
  expect(read(".gitignore")).toMatch(/\.env/);
});

test("uploads/ is live local storage with files present", () => {
  const dir = path.join(root, "public/uploads");
  expect(existsSync(dir)).toBe(true);
  expect(readdirSync(dir).length).toBeGreaterThan(0);
});

test("GAP: repo ships no video fixtures — video path never exercised by seed", () => {
  const files = readdirSync(path.join(root, "public/field-media"));
  expect(files.filter((f) => /\.(mp4|webm|mov|mkv)$/i.test(f))).toEqual([]);
});

test("GAP: type errors ignored at build (next.config ignoreBuildErrors)", () => {
  expect(read("next.config.ts")).toContain("ignoreBuildErrors");
});

test("PASS: start script pins absolute DATABASE_URL for standalone build", () => {
  expect(pkg.scripts.start).toContain("file:$(pwd)/db/custom.db");
});

test("GAP: single-file SQLite DB — no external DB / horizontal scale path", () => {
  const db = path.join(root, "db/custom.db");
  expect(existsSync(db)).toBe(true);
  expect(statSync(db).size).toBeGreaterThan(10_000);
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

test("GAP: no server-side upload size cap — 10MB data URL accepted", async ({ request }) => {
  await apiLogin(request);
  const payload = "data:image/png;base64," + "A".repeat(10 * 1024 * 1024);
  const res = await request.post("/api/media", {
    data: { url: payload, title: "Audit oversize probe" },
  });
  expect([200, 201], `status ${res.status()} body: ${await res.text()}`).toContain(res.status());
  const asset = await res.json();
  const del = await request.delete(`/api/media/${asset.id}`);
  expect([200, 204]).toContain(del.status());
});
