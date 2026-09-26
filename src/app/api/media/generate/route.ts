// POST /api/media/generate — AI-generate a sample field-media image, save it,
// optionally auto-analyze with VLM, and return the created MediaAsset.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeMedia, generateImage, saveUpload } from "@/lib/ai";
import { serializeAsset } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";

function rand(len: number) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function analysisToData(a: Awaited<ReturnType<typeof analyzeMedia>>) {
  return {
    aiCaption: a.caption,
    aiSummary: a.summary,
    aiDescription: a.description,
    projectName: a.projectName,
    location: a.location,
    activity: a.activity,
    category: a.category,
    signals: JSON.stringify(a.signals),
    objects: JSON.stringify(a.objects),
    tagsCsv: a.tags.join(", "),
    mood: a.mood,
    confidence: a.confidence,
    ocrText: a.ocrText || null,
    qualityScore: a.qualityScore,
    analyzedAt: new Date(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Missing required field: prompt (string)" }, { status: 400 });
    }
    const {
      prompt,
      title,
      projectId,
      pairGroup,
      pairRole,
      captureDate,
      analyze,
      size,
    } = body as {
      prompt: string;
      title?: string;
      projectId?: string;
      pairGroup?: string;
      pairRole?: "before" | "after";
      captureDate?: string;
      analyze?: boolean;
      size?: string;
    };

    // 1. Generate the image via the configured AI provider
    const genSize = size || "1344x768";
    let gen;
    try {
      gen = await generateImage(prompt, genSize);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "image generation failed";
      return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 502 });
    }

    // 2. Persist to /public/uploads/
    const saved = saveUpload(gen.buffer, "png");
    const bytes = gen.buffer.length;
    const format = "png";

    // 3. Create the MediaAsset row
    const publicId = `impactlens/gen-${Date.now()}-${rand(6)}`;
    const now = new Date();
    const transforms = [
      { type: "generate", at: now.toISOString(), note: `AI image generation (${genSize})`, params: { prompt: prompt.slice(0, 200) } },
      { type: "upload", at: now.toISOString(), note: "stored to /uploads" },
    ];

    const createData: Prisma.MediaAssetCreateInput = {
      publicId,
      title: title || prompt.slice(0, 70),
      type: "image",
      url: saved.url,
      format,
      bytes,
      source: "generated",
      originalUrl: null,
      transformations: JSON.stringify(transforms),
      verified: false,
      captureDate: captureDate ? new Date(captureDate) : null,
      pairGroup: pairGroup || null,
      pairRole: pairRole || null,
      project: projectId ? { connect: { id: projectId } } : undefined,
    };

    let asset = await db.mediaAsset.create({ data: createData, include: { project: true } });

    // 4. Optional VLM analysis
    if (analyze) {
      try {
        const analysis = await analyzeMedia(saved.url);
        const updated = await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            ...analysisToData(analysis),
            title: title ? asset.title : analysis.caption.slice(0, 80),
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: "VLM analysis on generate" },
            ]),
          },
          include: { project: true },
        });
        asset = updated;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "analyze failed";
        await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: `failed: ${msg}` },
            ]),
          },
        });
      }
    }

    return NextResponse.json(serializeAsset(asset), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
