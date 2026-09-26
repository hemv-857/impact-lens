// POST /api/campaign/variants — generate 3 caption variants for A/B testing.
// Body: { projectId?, assetIds[], platform, tone }
// Returns: { variants: { headline, caption, hashtags[], callToAction, angle }[] }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chat, parseJsonLenient } from "@/lib/ai";

const VALID_PLATFORMS = ["instagram", "twitter", "linkedin", "newsletter"] as const;
const VALID_TONES = ["professional", "emotional", "data-driven"] as const;

const PLATFORM_AUDIENCE: Record<(typeof VALID_PLATFORMS)[number], string> = {
  instagram: "Instagram followers — visual-first, hashtag-aware, casual but inspirational tone",
  twitter: "Twitter/X audience — concise, punchy, quotable, under 280 chars where possible",
  linkedin: "LinkedIn professional network — credible, metrics-led, partner-facing tone",
  newsletter: "Email newsletter subscribers — long-form, narrative, personal sign-off friendly",
};

export interface CampaignVariant {
  angle: string;
  headline: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { projectId, assetIds = [], platform, tone = "emotional" } = body as {
      projectId?: string;
      assetIds?: string[];
      platform?: string;
      tone?: string;
    };

    if (!platform || !VALID_PLATFORMS.includes(platform as (typeof VALID_PLATFORMS)[number])) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!VALID_TONES.includes(tone as (typeof VALID_TONES)[number])) {
      return NextResponse.json({ error: `Invalid tone: ${tone}` }, { status: 400 });
    }
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: "assetIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const p = platform as (typeof VALID_PLATFORMS)[number];
    const t = tone as (typeof VALID_TONES)[number];

    const [project, assets] = await Promise.all([
      projectId ? db.project.findUnique({ where: { id: projectId } }) : null,
      db.mediaAsset.findMany({ where: { id: { in: assetIds } } }),
    ]);

    if (assets.length === 0) {
      return NextResponse.json({ error: "None of the assetIds matched" }, { status: 404 });
    }

    const assetsBlock = assets
      .map(
        (a, i) =>
          `Asset ${i + 1}: caption="${a.aiCaption || a.title}" | tags=[${(a.tagsCsv || "").split(",").map((s) => s.trim()).filter(Boolean).join(", ")}]${a.location ? ` | location=${a.location}` : ""}`
      )
      .join("\n");

    const prompt = `You are a senior campaign strategist for an NGO. Generate THREE distinct caption variants for a ${PLATFORM_AUDIENCE[p]} campaign. Use a ${t} tone.

PROJECT: ${project?.name || "Unnamed project"}
${project?.description ? `DESCRIPTION: ${project.description}` : ""}

FIELD-MEDIA EVIDENCE (${assets.length} assets):
${assetsBlock}

Generate 3 variants, each using a DIFFERENT strategic angle:
1. "Story-first" — open with a human narrative hook, emotional
2. "Data-first" — lead with a striking metric or outcome, credibility-led
3. "Question-hook" — open with a provocative question that creates curiosity

Return STRICT JSON only (no markdown). Schema:
{
  "variants": [
    {
      "angle": "Story-first",
      "headline": "punchy one-line headline (<=90 chars)",
      "caption": "platform-appropriate caption (respect typical length for ${p})",
      "hashtags": ["#tag1", "#tag2", ...],
      "callToAction": "single motivating CTA sentence (<=120 chars)"
    },
    { "angle": "Data-first", ... },
    { "angle": "Question-hook", ... }
  ]
}
Return ONLY the JSON object.`;

    const raw = await chat([
      { role: "system", content: "You are a senior NGO campaign strategist." },
      { role: "user", content: prompt },
    ]);
    const parsed = parseJsonLenient<{ variants: CampaignVariant[] }>(raw, {
      variants: [],
    });

    // Fallback: if the LLM didn't return 3 variants, pad with the ones we have
    const variants = (parsed.variants || []).slice(0, 3);
    while (variants.length < 3) {
      variants.push({
        angle: ["Story-first", "Data-first", "Question-hook"][variants.length] || "Variant",
        headline: "Campaign headline",
        caption: raw.slice(0, 280) || "Caption unavailable.",
        hashtags: [],
        callToAction: "Support this project today.",
      });
    }

    return NextResponse.json({ variants }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
