// GET /api/org/invite — owner: current invite code (minted on first access, for legacy orgs).
// POST /api/org/invite — owner: rotate the code (old code stops working).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInviteCode, getAuthContext, unauthorized } from "@/lib/auth";

async function ownerOrg() {
  const auth = await getAuthContext();
  if (!auth) return { res: unauthorized() };
  if (auth.role !== "owner") {
    return { res: NextResponse.json({ error: "Only an owner can manage invite codes" }, { status: 403 }) };
  }
  const org = await db.organization.findUnique({ where: { id: auth.orgId } });
  if (!org) return { res: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  return { org };
}

export async function GET() {
  try {
    const { res, org } = await ownerOrg();
    if (res) return res;
    const code =
      org!.inviteCode ??
      (await db.organization.update({ where: { id: org!.id }, data: { inviteCode: generateInviteCode() } })).inviteCode;
    return NextResponse.json({ code, slug: org!.slug, name: org!.name });
  } catch (err) {
    console.error("[org-invite] Unexpected error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { res, org } = await ownerOrg();
    if (res) return res;
    const code = generateInviteCode();
    await db.organization.update({ where: { id: org!.id }, data: { inviteCode: code } });
    return NextResponse.json({ code, slug: org!.slug, name: org!.name });
  } catch (err) {
    console.error("[org-invite] Unexpected error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
