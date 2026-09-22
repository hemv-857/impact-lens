// POST /api/media/bulk — apply an action to many assets at once.
// Body: { ids: string[], action: "analyze"|"verify"|"unverify"|"delete"|"assign", projectId? }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeImage } from "@/lib/zai";
import { serializeAsset } from "@/lib/serialize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids (non-empty string[]) required" }, { status: 400 });
    }
    const ids: string[] = body.ids.slice(0, 200); // hard cap
    const action: string = body.action;
    const projectId: string | undefined = body.projectId;
    const validActions = ["analyze", "verify", "unverify", "delete", "assign"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    if (action === "delete") {
      for (const id of ids) {
        try {
          await db.mediaAsset.delete({ where: { id } });
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, error: e instanceof Error ? e.message : "delete failed" });
        }
      }
      return NextResponse.json({ action, processed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
    }

    if (action === "assign") {
      if (!projectId) {
        return NextResponse.json({ error: "projectId required for assign action" }, { status: 400 });
      }
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: "project not found" }, { status: 404 });
      }
      const r = await db.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { projectId } });
      return NextResponse.json({ action, processed: r.count, failed: ids.length - r.count });
    }

    if (action === "verify" || action === "unverify") {
      const verified = action === "verify";
      const r = await db.mediaAsset.updateMany({ where: { id: { in: ids } }, data: { verified } });
      return NextResponse.json({ action, processed: r.count, failed: ids.length - r.count });
    }

    // action === "analyze" — run VLM on each sequentially (with built-in retry in analyzeImage)
    if (action === "analyze") {
      let processed = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          const asset = await db.mediaAsset.findUnique({ where: { id }, include: { project: true } });
          if (!asset) {
            results.push({ id, ok: false, error: "not found" });
            failed++;
            continue;
          }
          const analysis = await analyzeImage(asset.url);
          const transforms = Array.isArray(asset.transformations) ? asset.transformations : [];
          try { transforms.push({ type: "ai-analyze", at: new Date().toISOString(), note: "bulk VLM analysis" }); } catch { /* transformations may be JSON string */ }
          await db.mediaAsset.update({
            where: { id },
            data: {
              aiCaption: analysis.caption,
              aiSummary: analysis.summary,
              aiDescription: analysis.description,
              projectName: analysis.projectName,
              location: analysis.location || asset.location,
              activity: analysis.activity,
              category: analysis.category || asset.category,
              signals: JSON.stringify(analysis.signals),
              objects: JSON.stringify(analysis.objects),
              tagsCsv: analysis.tags.join(", "),
              mood: analysis.mood,
              confidence: analysis.confidence,
              ocrText: analysis.ocrText || null,
              qualityScore: analysis.qualityScore,
              analyzedAt: new Date(),
            },
          });
          results.push({ id, ok: true });
          processed++;
        } catch (e) {
          results.push({ id, ok: false, error: e instanceof Error ? e.message : "analyze failed" });
          failed++;
        }
      }
      return NextResponse.json({ action, processed, failed, results });
    }

    return NextResponse.json({ error: "unreachable" }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
