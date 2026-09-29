// GET  /api/projects — list projects with assetCount
// POST /api/projects — create a project (auto-unique slug)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProject } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || "project";
  let suffix = 1;
  while (true) {
    const exists = await db.project.findUnique({ where: { slug } });
    if (!exists) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const projects = await db.project.findMany({
      where: { orgId: auth.orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { assets: true } } },
    });
    return NextResponse.json(projects.map(serializeProject));
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
    if (!body || typeof body !== "object" || !body.name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }
    const {
      name,
      description,
      location,
      region,
      category,
      status = "active",
      startDate,
      endDate,
      sdgGoals,
      coverUrl,
      lat,
      lng,
    } = body as {
      name: string;
      description?: string;
      location?: string;
      region?: string;
      category?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sdgGoals?: string;
      coverUrl?: string;
      lat?: number;
      lng?: number;
    };

    const slug = await ensureUniqueSlug(slugify(name));

    const project = await db.project.create({
      data: {
        name,
        slug,
        description: description || null,
        location: location || null,
        region: region || null,
        category: category || null,
        status: status || "active",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sdgGoals: sdgGoals || null,
        coverUrl: coverUrl || null,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        orgId: auth.orgId,
      },
      include: { _count: { select: { assets: true } } },
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
