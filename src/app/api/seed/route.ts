// POST /api/seed — populate DB with sample projects + analyzed media from /public/field-media.
// For each image file that exists on disk:
//   1. Create a MediaAsset (source='generated') with title derived from the filename.
//   2. Call analyzeImage() to populate all AI fields + set analyzedAt.
//   3. Link the asset to its Project (creating the project if missing).
//   4. For before/after pairs, set a shared pairGroup + pairRole.
// Re-running the endpoint is safe: assets already matching a URL are skipped.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeImage } from "@/lib/zai";
import fs from "fs";
import path from "path";

type PairKey = "before" | "after";

interface SeedSpec {
  file: string;
  title: string;
  project: {
    name: string;
    category: string;
    location: string;
    status: string;
    sdgGoals: string;
    region?: string;
    lat?: number;
    lng?: number;
  };
  pair?: { group: string; role: PairKey };
}

const SPECS: SeedSpec[] = [
  {
    file: "reforest_before.jpg",
    title: "Hillside Reforestation — Before",
    project: {
      name: "Hillside Reforestation Initiative",
      category: "reforestation",
      location: "Rift Valley, Kenya",
      region: "East Africa",
      status: "active",
      sdgGoals: "13,15",
      lat: -0.6,
      lng: 36.0,
    },
    pair: { group: "pair-reforest", role: "before" },
  },
  {
    file: "reforest_after.jpg",
    title: "Hillside Reforestation — After",
    project: {
      name: "Hillside Reforestation Initiative",
      category: "reforestation",
      location: "Rift Valley, Kenya",
      region: "East Africa",
      status: "active",
      sdgGoals: "13,15",
      lat: -0.6,
      lng: 36.0,
    },
    pair: { group: "pair-reforest", role: "after" },
  },
  {
    file: "solar_install.jpg",
    title: "Community Solar Panel Installation",
    project: {
      name: "Community Solar Access Program",
      category: "solar",
      location: "Rajasthan, India",
      region: "South Asia",
      status: "active",
      sdgGoals: "7,13",
      lat: 27.0,
      lng: 74.2,
    },
  },
  {
    file: "water_well.jpg",
    title: "Clean Water Well Deployment",
    project: {
      name: "Clean Water for All",
      category: "water",
      location: "Northern Uganda",
      region: "East Africa",
      status: "active",
      sdgGoals: "6",
      lat: 3.4,
      lng: 32.3,
    },
  },
  {
    file: "garden_before.jpg",
    title: "Urban Garden — Before",
    project: {
      name: "Urban Garden Revival",
      category: "community",
      location: "Detroit, USA",
      region: "North America",
      status: "active",
      sdgGoals: "2,11",
      lat: 42.3,
      lng: -83.0,
    },
    pair: { group: "pair-garden", role: "before" },
  },
  {
    file: "garden_after.jpg",
    title: "Urban Garden — After",
    project: {
      name: "Urban Garden Revival",
      category: "community",
      location: "Detroit, USA",
      region: "North America",
      status: "active",
      sdgGoals: "2,11",
      lat: 42.3,
      lng: -83.0,
    },
    pair: { group: "pair-garden", role: "after" },
  },
  {
    file: "beach_cleanup.jpg",
    title: "Coastal Beach Cleanup Drive",
    project: {
      name: "Coastal Cleanup Drive",
      category: "cleanup",
      location: "Bali, Indonesia",
      region: "Southeast Asia",
      status: "completed",
      sdgGoals: "14",
      lat: -8.4,
      lng: 115.2,
    },
  },
  {
    file: "wind_farm.jpg",
    title: "Highland Wind Energy Farm",
    project: {
      name: "Highland Wind Energy",
      category: "energy",
      location: "Scottish Highlands",
      region: "Europe",
      status: "active",
      sdgGoals: "7,13",
      lat: 57.3,
      lng: -4.4,
    },
  },
  {
    file: "school_classroom.jpg",
    title: "Newly Built School Classroom",
    project: {
      name: "School Build Project",
      category: "education",
      location: "Kathmandu, Nepal",
      region: "South Asia",
      status: "active",
      sdgGoals: "4",
      lat: 27.7,
      lng: 85.3,
    },
  },
  {
    file: "irrigation_training.jpg",
    title: "Climate-Smart Agriculture Training",
    project: {
      name: "Climate-Smart Agriculture Training",
      category: "agriculture",
      location: "Malawi",
      region: "Southern Africa",
      status: "active",
      sdgGoals: "2,13",
      lat: -13.2,
      lng: 34.3,
    },
  },
  {
    file: "mangrove_restore.jpg",
    title: "Mangrove Restoration Planting",
    project: {
      name: "Mangrove Restoration",
      category: "conservation",
      location: "Sundarbans, Bangladesh",
      region: "South Asia",
      status: "active",
      sdgGoals: "14,15",
      lat: 21.8,
      lng: 89.0,
    },
  },
  {
    file: "women_coop.jpg",
    title: "Women's Cooperative Livelihoods",
    project: {
      name: "Women's Cooperative Livelihoods",
      category: "community",
      location: "Ghana",
      region: "West Africa",
      status: "active",
      sdgGoals: "1,5,8",
      lat: 7.9,
      lng: -1.0,
    },
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST() {
  const projectsCreated: string[] = [];
  const assetsCreated: string[] = [];
  const analyzed: string[] = [];
  const skipped: string[] = [];

  try {
    // Project cache (by name) to avoid repeated lookups / inserts.
    const projectCache = new Map<string, { id: string; created: boolean }>();

    for (const spec of SPECS) {
      const abs = path.join(process.cwd(), "public", "field-media", spec.file);
      if (!fs.existsSync(abs)) {
        skipped.push(spec.file);
        continue;
      }

      const url = `/field-media/${spec.file}`;

      // Skip if an asset already exists for this URL.
      const existing = await db.mediaAsset.findFirst({ where: { url } });
      if (existing) {
        skipped.push(spec.file);
        continue;
      }

      // Ensure project exists (cache by name).
      let projectId: string | null = null;
      if (!projectCache.has(spec.project.name)) {
        const existingProject = await db.project.findFirst({
          where: { name: spec.project.name },
        });
        if (existingProject) {
          projectCache.set(spec.project.name, { id: existingProject.id, created: false });
          projectId = existingProject.id;
        } else {
          let slug = slugify(spec.project.name);
          let suffix = 1;
          while (await db.project.findUnique({ where: { slug } })) {
            suffix++;
            slug = `${slugify(spec.project.name)}-${suffix}`;
          }
          const created = await db.project.create({
            data: {
              name: spec.project.name,
              slug,
              description: `Sample project for ${spec.project.name}.`,
              location: spec.project.location,
              region: spec.project.region || null,
              category: spec.project.category,
              status: spec.project.status,
              sdgGoals: spec.project.sdgGoals,
              coverUrl: url,
              lat: spec.project.lat ?? null,
              lng: spec.project.lng ?? null,
            },
          });
          projectCache.set(spec.project.name, { id: created.id, created: true });
          projectsCreated.push(created.id);
          projectId = created.id;
        }
      } else {
        projectId = projectCache.get(spec.project.name)!.id;
      }

      // Create the asset record.
      const publicId = `impactlens/seed-${spec.file.replace(/\.[^.]+$/, "")}-${Date.now()}`;
      const now = new Date();
      const transforms = [
        { type: "upload", at: now.toISOString(), note: "seed: field-media generated image" },
      ];

      const asset = await db.mediaAsset.create({
        data: {
          publicId,
          title: spec.title,
          type: "image",
          url,
          format: "png",
          source: "generated",
          verified: false,
          captureDate: now,
          pairGroup: spec.pair?.group || null,
          pairRole: spec.pair?.role || null,
          projectId,
          transformations: JSON.stringify(transforms),
        },
      });
      assetsCreated.push(asset.id);

      // Analyze via VLM (long-running per image — that's fine for a seed).
      try {
        const analysis = await analyzeImage(url);
        const updated = await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            aiCaption: analysis.caption,
            aiSummary: analysis.summary,
            aiDescription: analysis.description,
            projectName: analysis.projectName,
            location: analysis.location || spec.project.location,
            activity: analysis.activity,
            category: analysis.category || spec.project.category,
            signals: JSON.stringify(analysis.signals),
            objects: JSON.stringify(analysis.objects),
            tagsCsv: analysis.tags.join(", "),
            mood: analysis.mood,
            confidence: analysis.confidence,
            ocrText: analysis.ocrText || null,
            qualityScore: analysis.qualityScore,
            analyzedAt: new Date(),
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: "VLM analysis (seed)" },
            ]),
          },
        });
        analyzed.push(updated.id);
      } catch (e) {
        // Analysis failed for this asset — leave the asset unanalyzed and continue.
        const msg = e instanceof Error ? e.message : "analyze failed";
        await db.mediaAsset.update({
          where: { id: asset.id },
          data: {
            transformations: JSON.stringify([
              ...transforms,
              { type: "ai-analyze", at: new Date().toISOString(), note: `seed failed: ${msg}` },
            ]),
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      projectsCreated,
      assetsCreated,
      analyzed,
      skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message, projectsCreated, assetsCreated, analyzed, skipped },
      { status: 500 }
    );
  }
}
