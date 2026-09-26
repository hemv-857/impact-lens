// POST /api/orgs — create a new organization for the signed-in user (owner).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInviteCode, getAuthContext, unauthorized } from "@/lib/auth";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    const name = body && typeof body === "object" ? String(body.name || "").trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    let slug = slugify(name);
    let suffix = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      suffix++;
      slug = `${slugify(name)}-${suffix}`;
    }

    const org = await db.organization.create({
      data: { name, slug, inviteCode: generateInviteCode() },
    });
    await db.membership.create({
      data: { userId: auth.userId, orgId: org.id, role: "owner" },
    });

    return NextResponse.json(
      { id: org.id, name: org.name, slug: org.slug, role: "owner" },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
