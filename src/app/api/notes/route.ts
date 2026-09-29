// GET  /api/notes?assetId=... — list notes for an asset (newest first)
// POST /api/notes — create a note { assetId, body, author? }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, unauthorized } from "@/lib/auth";

function serialize(row: {
  id: string;
  assetId: string;
  body: string;
  author: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    assetId: row.assetId,
    body: row.body,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const assetId = req.nextUrl.searchParams.get("assetId");
    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }
    const notes = await db.assetNote.findMany({
      where: { assetId, orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(notes.map(serialize));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.assetId || !body.body) {
      return NextResponse.json({ error: "assetId and body required" }, { status: 400 });
    }
    const assetId: string = body.assetId;
    const noteBody: string = String(body.body).slice(0, 2000);
    const author: string | undefined = body.author ? String(body.author).slice(0, 100) : undefined;

    // Verify asset exists
    const asset = await db.mediaAsset.findFirst({
      where: { id: assetId, orgId: auth.orgId },
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const note = await db.assetNote.create({
      data: {
        assetId,
        body: noteBody,
        author: author || null,
        orgId: auth.orgId,
      },
    });
    return NextResponse.json(serialize(note), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
