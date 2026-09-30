import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import fs from 'node:fs'
import path from 'node:path'
import { destroyCloudinary } from './cloudinary'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * TURSO_DATABASE_URL set ⇒ queries run over libSQL (Turso), because Vercel's
 * filesystem is read-only and can't hold db/custom.db. Unset ⇒ the plain local
 * SQLite file (dev, Render, e2e) exactly as before. unixepoch-ms keeps
 * timestamps byte-compatible with the native driver, so a local db/custom.db
 * restored into Turso reads back unchanged.
 */
function makeClient(): PrismaClient {
  const log: Prisma.PrismaClientOptions["log"] = process.env.NODE_ENV === "production" ? ["error"] : ["query", "error"]; // no query+params in prod logs
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return new PrismaClient({ log });
  return new PrismaClient({
    log,
    adapter: new PrismaLibSQL(
      { url, authToken: process.env.TURSO_AUTH_TOKEN },
      { timestampFormat: "unixepoch-ms" }
    ),
  });
}

export const db = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** True when the project exists inside the given org — used before any { connect: projectId }. */
export async function orgOwnsProject(orgId: string, projectId: string): Promise<boolean> {
  const p = await db.project.findFirst({ where: { id: projectId, orgId }, select: { id: true } });
  return !!p;
}

/** True when the email belongs to a member of the org — scheduled reports only go to members. */
export async function orgHasMemberEmail(orgId: string, email: string): Promise<boolean> {
  const m = await db.membership.findFirst({
    where: { orgId, user: { email: email.trim().toLowerCase() } },
    select: { id: true },
  });
  return !!m;
}

/**
 * Best-effort storage cleanup after a MediaAsset row is deleted: its Cloudinary object,
 * or a plain /uploads/<name> file (the shape saveUpload writes; the regex rules out `..`)
 * that no other row still references. /field-media/* is repo-shipped seed media shared
 * by every org — never removed.
 */
export async function removeAssetStorage(asset: { url: string; publicId: string; type: string }): Promise<void> {
  try {
    if (asset.url.includes("res.cloudinary.com")) {
      await destroyCloudinary(asset.publicId, asset.type === "video" ? "video" : "image");
    }
  } catch {
    // CDN cleanup is best-effort
  }
  try {
    if (/^\/uploads\/[\w-]+\.[a-z0-9]+$/.test(asset.url) && !(await db.mediaAsset.count({ where: { url: asset.url } }))) {
      fs.rmSync(path.join(process.cwd(), asset.url), { force: true });
    }
  } catch {
    // file cleanup is best-effort
  }
}
