// db-smoke — contract check for the TURSO_DATABASE_URL (libSQL) branch in src/lib/db.ts:
// applies prisma/turso-init.sql to a scratch libSQL DB, then round-trips a row
// through Prisma so a broken adapter/timestampFormat fails here, not in prod.
//   TURSO_DATABASE_URL=file:./db/smoke.db bun scripts/db-smoke.ts   # local file works
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... bun scripts/db-smoke.ts
import { mkdirSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:./db/smoke.db";
mkdirSync("db", { recursive: true });

const setup = createClient({ url });
try {
  await setup.executeMultiple(readFileSync("prisma/turso-init.sql", "utf8"));
} catch {
  // already applied — the round-trip below is the real check
}

const { db } = await import("../src/lib/db");
const slug = `smoke-${Date.now()}`;
const created = await db.organization.create({ data: { name: "Smoke", slug } });
const read = await db.organization.findUnique({ where: { id: created.id } });

assert(read, "row not found after create");
assert(read.createdAt instanceof Date, `createdAt came back as ${typeof read.createdAt}, not Date`);
assert(read.createdAt.getTime() <= Date.now(), "createdAt is in the future");
await db.organization.delete({ where: { id: created.id } });

console.log(`db-smoke ok: ${url} — create/read/delete, Date round-trip`);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`db-smoke FAIL: ${msg}`);
    process.exit(1);
  }
}
