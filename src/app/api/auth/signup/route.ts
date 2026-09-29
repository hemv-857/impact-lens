// POST /api/auth/signup — create user + their organization (owner membership).
// The first account also adopts any pre-auth rows into its org.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adoptOrphanData,
  generateInviteCode,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    // JSON can carry any type: non-strings become "" so they fail validation (400), not .trim() (500).
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const { email, password, name, orgName } = Object.fromEntries(
      ["email", "password", "name", "orgName"].map((k) => [k, str((body as Record<string, unknown>)[k])])
    );

    const normalizedEmail = email ? normalizeEmail(email) : "";
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    // 30 valid signups/hour/IP — after validation so malformed requests get real 400s;
    // protects the only branch that creates user + org rows
    if (!rateLimit(`signup:${clientIp(req.headers)}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many signups — try again later" }, { status: 429 });
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const preferredOrgName = (orgName || "").trim() || "My workspace";
    // F9: an existing slug joins that org only with a valid invite code;
    // otherwise a brand-new org is created (creator becomes owner).
    const inviteCode = String((body as { inviteCode?: unknown }).inviteCode ?? "")
      .trim()
      .toLowerCase();
    const existingOrg = await db.organization.findUnique({
      where: { slug: slugify(preferredOrgName) },
    });
    if (existingOrg && (!existingOrg.inviteCode || existingOrg.inviteCode !== inviteCode)) {
      return NextResponse.json(
        { error: "This workspace requires a valid invite code — ask an owner for one" },
        { status: 403 }
      );
    }

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: (name || "").trim() || null,
        passwordHash: hashPassword(password),
      },
    });

    let org;
    let adopted = 0;
    if (existingOrg) {
      org = existingOrg;
      await db.membership.create({
        data: { userId: user.id, orgId: org.id, role: "member" },
      });
    } else {
      const slug = await uniqueSlug(slugify(preferredOrgName));
      org = await db.organization.create({
        data: { name: preferredOrgName, slug, inviteCode: generateInviteCode() },
      });
      await db.membership.create({
        data: { userId: user.id, orgId: org.id, role: "owner" },
      });
      adopted = await adoptOrphanData(org.id);
    }

    return NextResponse.json(
      { ok: true, email: user.email, orgId: org.id, joined: !!existingOrg, adopted },
      { status: 201 }
    );
  } catch (err) {
    // duplicate email race → 409, never leak the Prisma message
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
