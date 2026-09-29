// Email/password auth (scrypt, node:crypto — no extra dependency) + org scoping.
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

export const PASSWORD_MIN_LENGTH = 8;

/** F9: 8-char join code, ambiguous chars excluded so it survives being read aloud. */
export function generateInviteCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email ? normalizeEmail(credentials.email) : "";
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // Throttle guessing (and the blocking scrypt it triggers): 10 failures per
        // IP+email per 15 min. Only failures count, so normal sign-ins never trip it.
        const failKey = `login-fail:${clientIp(new Headers(req?.headers as Record<string, string> | undefined))}:${email}`;
        if (!rateLimit(failKey, 10, 15 * 60_000, false)) return null;

        try {
          const user = await db.user.findUnique({ where: { email } });
          if (!user || !verifyPassword(password, user.passwordHash)) {
            rateLimit(failKey, 10, 15 * 60_000);
            return null;
          }

          const membership = await db.membership.findFirst({ where: { userId: user.id } });
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            orgId: membership?.orgId ?? "",
          };
        } catch {
          // Never surface storage/driver errors to the client — generic failure only.
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.orgId = user.orgId ?? "";
      }
      // Org switch from the client — re-check membership before trusting it.
      if (trigger === "update" && session?.orgId && token.uid) {
        const membership = await db.membership.findUnique({
          where: { userId_orgId: { userId: token.uid, orgId: session.orgId } },
        });
        if (membership) token.orgId = session.orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid ?? "";
        session.user.orgId = token.orgId ?? "";
      }
      return session;
    },
  },
};

export interface AuthContext {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

/** Returns null when unauthenticated or the token's org membership was revoked. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const orgId = session?.user?.orgId;
  if (!userId || !email || !orgId) return null;

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) return null;

  return { userId, email, orgId, role: membership.role };
}

/** Adopt pre-auth rows (created before any org existed) into the given org. */
export async function adoptOrphanData(orgId: string): Promise<number> {
  const results = await Promise.all([
    db.project.updateMany({ where: { orgId: null }, data: { orgId } }),
    db.mediaAsset.updateMany({ where: { orgId: null }, data: { orgId } }),
    db.report.updateMany({ where: { orgId: null }, data: { orgId } }),
    db.comparison.updateMany({ where: { orgId: null }, data: { orgId } }),
    db.savedSearch.updateMany({ where: { orgId: null }, data: { orgId } }),
    db.assetNote.updateMany({ where: { orgId: null }, data: { orgId } }),
  ]);
  return results.reduce((sum, r) => sum + r.count, 0);
}

/** 401 response for API routes — pair with getAuthContext(). */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
