import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error"], // no query+params in prod logs
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** True when the project exists inside the given org — used before any { connect: projectId }. */
export async function orgOwnsProject(orgId: string, projectId: string): Promise<boolean> {
  const p = await db.project.findFirst({ where: { id: projectId, orgId }, select: { id: true } });
  return !!p;
}
