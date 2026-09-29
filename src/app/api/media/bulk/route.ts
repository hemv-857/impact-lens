// POST /api/media/bulk — apply an action to many assets at once.
// Body: { ids: string[], action: "analyze"|"verify"|"unverify"|"delete"|"assign", projectId? }
import { NextRequest, NextResponse } from "next/server";
import { db, removeAssetStorage } from "@/lib/db";
import { analyzeMedia } from "@/lib/ai";
import { serializeAsset } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";
import type { TransformStep } from "@/lib/types";
import { withAiScope } from "@/lib/ai-usage";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids (non-empty string[]) required" }, { status: 400 });
    }
    // strings only: an object like {"not": ""} would become a Prisma filter and match every row
    const ids: string[] = [...new Set<string>(body.ids.filter((x: unknown) => typeof x === "string"))].slice(0, 200); // unique (workers must not race on one row), hard cap
    const action: string = body.action;
    const projectId: string | undefined = body.projectId;
    const validActions = ["analyze", "verify", "unverify", "delete", "assign", "favorite", "unfavorite"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    if (action === "delete") {
      for (const id of ids) {
        try {
          const asset = await db.mediaAsset.findFirst({ where: { id, orgId: auth.orgId } });
          if (!asset) throw new Error("not found");
          await db.mediaAsset.delete({ where: { id } });
          // same storage cleanup as DELETE /api/media/[id]
          await removeAssetStorage(asset);
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, error: "delete failed" });
        }
      }
      return NextResponse.json({ action, processed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
    }

    if (action === "assign") {
      if (!projectId) {
        return NextResponse.json({ error: "projectId required for assign action" }, { status: 400 });
      }
      const project = await db.project.findFirst({ where: { id: projectId, orgId: auth.orgId } });
      if (!project) {
        return NextResponse.json({ error: "project not found" }, { status: 404 });
      }
      const r = await db.mediaAsset.updateMany({ where: { id: { in: ids }, orgId: auth.orgId }, data: { projectId } });
      return NextResponse.json({ action, processed: r.count, failed: ids.length - r.count });
    }

    if (action === "verify" || action === "unverify") {
      const verified = action === "verify";
      const r = await db.mediaAsset.updateMany({ where: { id: { in: ids }, orgId: auth.orgId }, data: { verified } });
      return NextResponse.json({ action, processed: r.count, failed: ids.length - r.count });
    }

    if (action === "favorite" || action === "unfavorite") {
      const favorite = action === "favorite";
      const r = await db.mediaAsset.updateMany({ where: { id: { in: ids }, orgId: auth.orgId }, data: { favorite } });
      return NextResponse.json({ action, processed: r.count, failed: ids.length - r.count });
    }

    // action === "analyze" — a small worker pool over the VLM (retry lives in analyzeMedia).
    // ponytail: still inside one HTTP request; a job queue is the fix for very large batches.
    if (action === "analyze") {
      let processed = 0;
      let failed = 0;
      let cursor = 0;
      const worker = async () => {
        while (cursor < ids.length) {
          const id = ids[cursor++];
          try {
            const asset = await db.mediaAsset.findFirst({
              where: { id, orgId: auth.orgId },
              include: { project: true },
            });
            if (!asset) {
              results.push({ id, ok: false, error: "not found" });
              failed++;
              continue;
            }
            const analysis = await withAiScope(auth, () =>
              analyzeMedia(asset.url, (asset.type === "video" ? "video" : "image") as "image" | "video")
            );
            // transformations is a JSON string column — parse existing steps (same as single analyze).
            let existingSteps: TransformStep[] = [];
            if (asset.transformations) {
              try {
                const v = JSON.parse(asset.transformations);
                if (Array.isArray(v)) existingSteps = v as TransformStep[];
              } catch {
                existingSteps = [];
              }
            }
            const transformations = JSON.stringify([
              ...existingSteps,
              { type: "ai-analyze", at: new Date().toISOString(), note: "bulk VLM analysis" },
            ] satisfies TransformStep[]);
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
                transformations,
              },
            });
            results.push({ id, ok: true });
            processed++;
          } catch (e) {
            console.error(e);
            results.push({ id, ok: false, error: "analyze failed" });
            failed++;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, ids.length) }, worker));
      return NextResponse.json({ action, processed, failed, results });
    }

    return NextResponse.json({ error: "unreachable" }, { status: 500 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
