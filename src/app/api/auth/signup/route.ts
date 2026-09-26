// POST /api/auth/signup — create user + their organization (owner membership).
// The first account also adopts any pre-auth rows into its org.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adoptOrphanData,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth";

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
    const { email, password, name, orgName } = body as {
      email?: string;
      password?: string;
      name?: string;
      orgName?: string;
    };

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

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const preferredOrgName = (orgName || "").trim() || "My workspace";
    // Organization field doubles as a join code: an existing slug joins that org
    // as a member, otherwise a brand-new org is created.
    // ponytail: open join-by-name; swap for invite tokens if this ships publicly.
    const existingOrg = await db.organization.findUnique({
      where: { slug: slugify(preferredOrgName) },
    });

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
      org = await db.organization.create({ data: { name: preferredOrgName, slug } });
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
