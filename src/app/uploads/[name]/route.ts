// Runtime uploads land in <cwd>/public/uploads after server start, but Next
// indexes the public folder only at boot — files saved later would 404 until a
// restart. Public files present at boot are served by Next's static layer
// first; everything else falls through to this route.
// ponytail: streams from disk per request (uploads are 10MB-capped images).
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  // no svg: scripts in an SVG served same-origin would be stored XSS
  avif: "image/avif",
  bmp: "image/bmp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // reject path traversal — only a plain filename may reach the filesystem
  if (!/^[\w.-]+$/.test(name) || name.startsWith(".")) {
    return new NextResponse(null, { status: 400 });
  }
  const file = path.join(process.cwd(), "public", "uploads", name);
  if (!fs.existsSync(file)) return new NextResponse(null, { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(fs.readFileSync(file), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
