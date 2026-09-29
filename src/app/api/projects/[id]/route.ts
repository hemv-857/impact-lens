// GET   /api/projects/[id] — fetch single project (with assetCount)
// PATCH /api/projects/[id] — update project fields
// DELETE /api/projects/[id] — delete project (assets projectId set null via schema)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProject } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const project = await db.project.findFirst({
      where: { id, orgId: auth.orgId },
      include: { _count: { select: { assets: true } } },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeProject(project));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      name,
      description,
      location,
      region,
      category,
      status,
      startDate,
      endDate,
      sdgGoals,
      coverUrl,
      lat,
      lng,
    } = body as Record<string, unknown>;

    const existing = await db.project.findFirst({ where: { id, orgId: auth.orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name;
    if (description !== undefined) data.description = description ?? null;
    if (location !== undefined) data.location = location ?? null;
    if (region !== undefined) data.region = region ?? null;
    if (category !== undefined) data.category = category ?? null;
    if (typeof status === "string") data.status = status;
    if (startDate !== undefined)
      data.startDate = startDate ? new Date(startDate as string) : null;
    if (endDate !== undefined)
      data.endDate = endDate ? new Date(endDate as string) : null;
    if (sdgGoals !== undefined) data.sdgGoals = sdgGoals ?? null;
    if (coverUrl !== undefined) data.coverUrl = coverUrl ?? null;
    if (typeof lat === "number" || lat === null) data.lat = lat ?? null;
    if (typeof lng === "number" || lng === null) data.lng = lng ?? null;

    const updated = await db.project.update({
      where: { id },
      data,
      include: { _count: { select: { assets: true } } },
    });
    return NextResponse.json(serializeProject(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    const { id } = await params;
    const existing = await db.project.findFirst({ where: { id, orgId: auth.orgId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
