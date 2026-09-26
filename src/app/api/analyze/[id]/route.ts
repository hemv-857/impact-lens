// POST /api/analyze/[id] — run VLM analysis on an asset, persist results,
// append a TransformStep to the transformations JSON array.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeMedia } from "@/lib/ai";
import { serializeAsset } from "@/lib/serialize";
import type { TransformStep } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.mediaAsset.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let analysis: Awaited<ReturnType<typeof analyzeMedia>>;
    try {
      const mediaType = (asset.type === "video" ? "video" : "image") as "image" | "video";
      analysis = await analyzeMedia(asset.url, mediaType);
    } catch (e) {
      const message = e instanceof Error ? e.message : "VLM analysis failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Parse existing transformations array, append new step.
    let existingSteps: TransformStep[] = [];
    if (asset.transformations) {
      try {
        const v = JSON.parse(asset.transformations);
        if (Array.isArray(v)) existingSteps = v as TransformStep[];
      } catch {
        existingSteps = [];
      }
    }
    const now = new Date();
    const newStep: TransformStep = {
      type: "ai-analyze",
      at: now.toISOString(),
      note: "VLM analysis",
    };
    const transformations = JSON.stringify([...existingSteps, newStep]);

    const updated = await db.mediaAsset.update({
      where: { id: asset.id },
      data: {
        aiCaption: analysis.caption,
        aiSummary: analysis.summary,
        aiDescription: analysis.description,
        projectName: analysis.projectName,
        location: analysis.location,
        activity: analysis.activity,
        category: analysis.category,
        signals: JSON.stringify(analysis.signals),
        objects: JSON.stringify(analysis.objects),
        tagsCsv: analysis.tags.join(", "),
        mood: analysis.mood,
        confidence: analysis.confidence,
        ocrText: analysis.ocrText || null,
        qualityScore: analysis.qualityScore,
        analyzedAt: now,
        transformations,
      },
      include: { project: true },
    });

    return NextResponse.json(serializeAsset(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
