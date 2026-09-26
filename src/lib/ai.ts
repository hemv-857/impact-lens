// Backend-only OpenAI-compatible AI client for ImpactLens
// Provides: VLM image analysis, before/after comparison, LLM report/campaign generation, semantic search scoring
// Config (env): AI_PROVIDER preset (default: gemini) or manual AI_BASE_URL, AI_API_KEY, AI_TEXT_MODEL, AI_VISION_MODEL, AI_IMAGE_MODEL
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

// Provider presets: AI_PROVIDER=<name> fills base URL + model IDs + key env alias.
// Explicit AI_* vars always win over the preset.
interface ProviderPreset {
  baseUrl: string;
  textModel: string;
  visionModel: string;
  imageModel: string;
  imageApi: "openai" | "gemini" | "chat"; // openai: POST {base}/images/generations; gemini: native :generateContent; chat: image model replies on /chat/completions (message.images[])
  keyEnv: string;
}

const DEFAULT_PROVIDER = "gemini";

const PROVIDERS: Record<string, ProviderPreset> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    textModel: "gemini-3.8-flash",
    visionModel: "gemini-3.8-flash",
    imageModel: "gemini-3.1-flash-image",
    imageApi: "gemini",
    keyEnv: "GEMINI_API_KEY",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    textModel: "gpt-4o-mini",
    visionModel: "gpt-4o-mini",
    imageModel: "gpt-image-1",
    imageApi: "openai",
    keyEnv: "OPENAI_API_KEY",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    textModel: "openai/gpt-oss-120b",
    visionModel: "qwen/qwen3.6-27b",
    imageModel: "", // Groq has no image-generation endpoint — set AI_IMAGE_MODEL to use another provider for images
    imageApi: "openai",
    keyEnv: "GROQ_API_KEY",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    textModel: "openai/gpt-4o-mini",
    visionModel: "google/gemini-2.5-flash", // video modality → accepts our video_url data URLs
    imageModel: "google/gemini-2.5-flash-image", // chat-based image output (message.images[]) — free-tier friendly
    imageApi: "chat",
    keyEnv: "OPENROUTER_API_KEY",
  },
};

interface AiConfig extends ProviderPreset {
  apiKey: string;
}

// Read env lazily so .env.local overrides and tests work after import.
function cfg(): AiConfig {
  const name = process.env.AI_PROVIDER?.trim().toLowerCase() || DEFAULT_PROVIDER;
  const preset = PROVIDERS[name];
  if (!preset) {
    throw new Error(`Unknown AI_PROVIDER "${name}". Supported: ${Object.keys(PROVIDERS).join(", ")}.`);
  }
  const apiKey = process.env.AI_API_KEY?.trim() || process.env[preset.keyEnv]?.trim();
  if (!apiKey) {
    throw new Error(
      `AI_API_KEY (or ${preset.keyEnv}) is not set. Add it to .env.local — AI_PROVIDER=${name}.`
    );
  }
  return {
    ...preset,
    baseUrl: (process.env.AI_BASE_URL?.trim() || preset.baseUrl).replace(/\/+$/, ""),
    apiKey,
    textModel: process.env.AI_TEXT_MODEL?.trim() || preset.textModel,
    visionModel: process.env.AI_VISION_MODEL?.trim() || preset.visionModel,
    imageModel: process.env.AI_IMAGE_MODEL?.trim() || preset.imageModel,
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | unknown;
}

// POST to {AI_BASE_URL}/chat/completions with bearer auth.
// vision=true selects the vision model; content parts carry image_url/video_url.
export async function chat(messages: ChatMessage[], vision = false): Promise<string> {
  const c = cfg();
  const resp = await aiFetch<{ choices?: { message?: { content?: string } }[] }>("/chat/completions", {
    model: vision ? c.visionModel : c.textModel,
    messages,
    // Cap output tokens: OpenRouter's default (65535) exceeds what free-tier
    // keys can afford (15999) and gets every request rejected with a 402.
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 8192,
  });
  return resp.choices?.[0]?.message?.content ?? "";
}

async function aiFetch<T>(pathname: string, body: unknown): Promise<T> {
  const { baseUrl, apiKey } = cfg();
  const post = async (payload: unknown) => {
    const resp = await fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    return { ok: resp.ok, status: resp.status, text: await resp.text() };
  };
  let out = await post(body);
  // Free-tier keys carry a shrinking per-request token budget ("can only
  // afford N") — shrink max_tokens to fit and retry once instead of failing.
  if (!out.ok && out.status === 402 && /can only afford (\d+)/.test(out.text)) {
    const budget = Number(RegExp.$1) - 100;
    if (budget < 1500) {
      // too small to produce a full analysis JSON — fail into the quota-skip
      // path instead of returning a truncated, half-parsed response
      throw new Error(`AI request failed 402 ${pathname}: free-tier budget too low (${budget} tokens) — ${out.text.slice(0, 200)}`);
    }
    if (typeof body === "object" && body !== null) {
      out = await post({ ...(body as Record<string, unknown>), max_tokens: budget });
    }
  }
  if (!out.ok) {
    throw new Error(`AI request failed ${out.status} ${pathname}: ${out.text.slice(0, 400)}`);
  }
  return JSON.parse(out.text) as T;
}

// Resolve any image reference (relative /public path, absolute URL, or data URL)
// into a form the VLM API can consume. Relative "/field-media/x.jpg" or
// "/uploads/y.png" paths are read from disk, normalized/resized via sharp, and
// returned as base64 JPEG data URLs (keeps payload small for the VLM API).
export async function resolveImageUrl(url: string): Promise<string> {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("data:")) {
    // Re-encode data URLs through sharp to normalize size/format.
    try {
      const m = url.match(/^data:([a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m) {
        const buf = Buffer.from(m[2], "base64");
        const normalized = await normalizeImage(buf);
        return `data:image/jpeg;base64,${normalized.toString("base64")}`;
      }
    } catch {
      return url;
    }
    return url;
  }
  // Relative path -> read from public/
  try {
    const localPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      const normalized = await normalizeImage(buf);
      return `data:image/jpeg;base64,${normalized.toString("base64")}`;
    }
  } catch {
    // fall through
  }
  return url;
}

// Normalize an image buffer: resize so the longest edge <= 1280px, convert to
// JPEG quality 82. Keeps VLM payloads well under API limits.
async function normalizeImage(buf: Buffer): Promise<Buffer> {
  // Lazy-import sharp so the module only loads when needed.
  const sharp = (await import("sharp")).default;
  return sharp(buf)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: false })
    .toBuffer();
}

// Retry a promise with exponential backoff for transient errors (429/5xx).
async function withRetry<T>(fn: () => Promise<T>, retries = 4, baseDelayMs = 4000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /429|Too many requests|rate limit|timeout|ECONNRESET|ETIMEDOUT|5\d\d/i.test(msg);
      if (!transient || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ---------------- VLM: Analyze a single field-media image ----------------

export interface VlmAnalysis {
  caption: string;
  summary: string;
  description: string;
  projectName: string;
  location: string;
  activity: string;
  category: string;
  signals: { label: string; confidence: number; category: string }[];
  objects: { name: string; count?: number }[];
  tags: string[];
  mood: string;
  confidence: number;
  ocrText: string;
  qualityScore: number;
}

const ANALYSIS_PROMPT = `You are a sustainability field-media analyst. Analyze this media (image or video) and return STRICT JSON only (no markdown fences, no prose). Schema:
{
  "caption": "one-sentence factual caption (<=140 chars)",
  "summary": "2-3 sentence summary of what the media shows and its likely context",
  "description": "detailed 4-6 sentence description covering scene, subjects, environment, lighting, and visible evidence of activity or impact",
  "projectName": "best-guess project name (e.g. 'Hillside Reforestation Initiative')",
  "location": "likely location type (e.g. 'rural hillside, East Africa')",
  "activity": "primary activity depicted (e.g. 'tree planting', 'solar panel installation')",
  "category": "one of: reforestation | solar | water | education | cleanup | agriculture | infrastructure | conservation | community | energy | other",
  "signals": [{"label":"vegetation density","confidence":0.8,"category":"environment"}, ...] (3-7 items; category in environment|infrastructure|people|activity|condition),
  "objects": [{"name":"tree sapling","count":25}, ...] (3-8 items),
  "tags": ["reforestation","saplings","erosion control", ...] (5-10 lowercase tags),
  "mood": "one of: hopeful | challenging | neutral | celebratory | urgent",
  "confidence": 0.0-1.0 (your overall confidence in this analysis),
  "ocrText": "any visible text in the image, or empty string",
  "qualityScore": 0.0-1.0 (image quality/clarity for evidence use)
}
Return ONLY the JSON object.`;

// Detect if a URL/extension is a video.
export function isVideoMedia(url: string, format?: string | null): boolean {
  const ext = format || url.split(".").pop()?.split("?")[0]?.toLowerCase() || "";
  return ["mp4", "avi", "mov", "webm", "mkv", "flv", "wmv", "m4v", "3gp"].includes(ext);
}

// Local video files can't be fetched by a remote provider, so inline them.
// ponytail: 8MB cap — larger videos need a hosted URL instead of base64
async function resolveVideoUrl(url: string): Promise<string> {
  if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  try {
    const localPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      if (buf.length <= 8 * 1024 * 1024) {
        const ext = localPath.split(".").pop()?.toLowerCase() || "mp4";
        const mime = ext === "mov" ? "quicktime" : ext === "mkv" ? "x-matroska" : ext === "3gp" ? "3gpp" : ext;
        return `data:video/${mime};base64,${buf.toString("base64")}`;
      }
    }
  } catch {
    // fall through
  }
  return url;
}

export async function analyzeMedia(url: string, mediaType?: "image" | "video"): Promise<VlmAnalysis> {
  // Auto-detect video from URL extension if mediaType not provided
  const isVideo = mediaType === "video" || (!mediaType && isVideoMedia(url));
  const resolved = isVideo ? await resolveVideoUrl(url) : await resolveImageUrl(url);
  // Video strategy: sample frames with ffmpeg and send them as images — every
  // vision provider accepts images (OpenRouter gates raw video behind a $1
  // balance and Gemini's free quota is 20/day). Falls back to a raw video_url
  // part when ffmpeg is unavailable or the file won't decode.
  // ponytail: frames lose audio/temporal continuity — Gemini native inline
  // video is the upgrade path when its quota/billing allows.
  const frameParts = isVideo ? videoFramesAsParts(resolved) : null;
  const mediaContent = frameParts
    ? null
    : isVideo
      ? { type: "video_url" as const, video_url: { url: resolved } }
      : { type: "image_url" as const, image_url: { url: resolved } };
  const content: unknown[] = [{ type: "text", text: ANALYSIS_PROMPT }];
  if (frameParts) content.push(...frameParts);
  else if (mediaContent) content.push(mediaContent);
  let raw: string;
  try {
    raw = await withRetry(() =>
      chat(
        [
          {
            role: "user",
            content,
          },
        ],
        true
      )
    );
  } catch (e) {
    // let callers report the right stage: frames already ran vs raw fallback
    if (frameParts && e instanceof Error) (e as Error & { framesUsed?: boolean }).framesUsed = true;
    throw e;
  }
  return parseJsonLenient<VlmAnalysis>(raw, {
    caption: "Field media asset",
    summary: "Analysis unavailable.",
    description: raw.slice(0, 500),
    projectName: "Unassigned",
    location: "Unknown",
    activity: "Unknown",
    category: "other",
    signals: [],
    objects: [],
    tags: [],
    mood: "neutral",
    confidence: 0.4,
    ocrText: "",
    qualityScore: 0.6,
  });
}

// Backward-compatible alias — calls analyzeMedia with auto-detection.
export async function analyzeImage(url: string): Promise<VlmAnalysis> {
  return analyzeMedia(url);
}

// Sample up to 6 frames evenly across the clip; returns multimodal content
// parts, or null (ffmpeg missing / undecodable) so callers can fall back.
function videoFramesAsParts(
  dataUrl: string
): Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> | null {
  if (!dataUrl.startsWith("data:")) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "il-video-"));
  try {
    const input = path.join(dir, "in.mp4");
    fs.writeFileSync(input, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
    let duration = 8;
    try {
      duration =
        parseFloat(
          execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input], {
            timeout: 5_000,
          }).toString()
        ) || duration;
    } catch {
      // no ffprobe — fall back to a fixed sampling rate
    }
    const fps = Math.max(0.1, 6 / duration);
    const pattern = path.join(dir, "frame-%02d.jpg");
    execFileSync(
      "ffmpeg",
      ["-loglevel", "error", "-i", input, "-vf", `fps=${fps},scale=640:-2`, "-frames:v", "6", pattern],
      { timeout: 30_000 }
    );
    const frames = fs.readdirSync(dir).filter((f) => /^frame-\d+\.jpg$/.test(f)).sort();
    if (frames.length === 0) return null;
    const parts: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${frames.length} frames sampled evenly from the video, shown in temporal order.` },
    ];
    for (const f of frames) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}` },
      });
    }
    return parts;
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------- VLM: Before/after comparison ----------------

export interface ComparisonOutput {
  narrative: string;
  changes: {
    aspect: string;
    before: string;
    after: string;
    direction: "improved" | "declined" | "unchanged";
    magnitude: "minor" | "moderate" | "major";
  }[];
  impactScore: number;
}

export async function compareImages(
  beforeUrl: string,
  afterUrl: string,
  context?: string
): Promise<ComparisonOutput> {
  const prompt = `You are comparing two field-media images from a sustainability project. The FIRST image is "before", the SECOND is "after".${context ? ` Context: ${context}` : ""}

Return STRICT JSON only (no markdown). Schema:
{
  "narrative": "3-5 sentence narrative describing the visible change, what it suggests about project impact, and any concerns",
  "changes": [
    {"aspect":"vegetation cover","before":"bare soil with erosion","after":"young saplings in rows","direction":"improved","magnitude":"major"},
    ... 3-6 items covering aspects like vegetation, infrastructure, water, people, cleanliness, condition
  ],
  "impactScore": 0.0-1.0 (overall visible impact score)
}
Return ONLY the JSON.`;
  const [beforeResolved, afterResolved] = await Promise.all([
    resolveImageUrl(beforeUrl),
    resolveImageUrl(afterUrl),
  ]);
  const raw = await withRetry(() =>
    chat(
      [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: beforeResolved } },
            { type: "image_url", image_url: { url: afterResolved } },
          ],
        },
      ],
      true
    )
  );
  return parseJsonLenient<ComparisonOutput>(raw, {
    narrative: raw.slice(0, 600) || "Comparison unavailable.",
    changes: [],
    impactScore: 0.5,
  });
}

// ---------------- LLM: Report / campaign generation ----------------

export interface ReportInput {
  type: "impact" | "summary" | "campaign" | "comparison";
  projectName?: string;
  projectDescription?: string;
  tone: "professional" | "emotional" | "data-driven";
  assets: { caption: string; summary: string; tags: string[]; location?: string }[];
  comparisonNarrative?: string;
  audience?: string;
  /** Optional slant so several variants of the same report read differently. */
  angle?: string;
}

export interface ReportOutput {
  title: string;
  headline: string;
  summary: string;
  narrative: string;
  metrics: Record<string, string | number>;
  callToAction: string;
}

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  const assetsBlock = input.assets
    .map(
      (a, i) =>
        `Asset ${i + 1}: caption="${a.caption}" | summary="${a.summary}" | tags=[${a.tags.join(", ")}]${a.location ? ` | location=${a.location}` : ""}`
    )
    .join("\n");

  const toneGuide = {
    professional:
      "professional, objective, evidence-led language suitable for donors and government partners",
    emotional:
      "warm, human, story-driven language that connects emotionally with supporters and the public",
    "data-driven":
      "concise, metrics-first language with clear KPIs and measurable outcomes",
  }[input.tone];

  const typeGuide = {
    impact: "an IMPACT REPORT documenting visible outcomes and evidence",
    summary: "a PROJECT SUMMARY suitable for stakeholders",
    campaign: "a CAMPAIGN-READY story to mobilize public support and donations",
    comparison:
      "a BEFORE/AFTER comparison report demonstrating measurable change",
  }[input.type];

  const prompt = `You are a senior impact storytelling strategist for an NGO. Generate ${typeGuide} using ${toneGuide}.

PROJECT: ${input.projectName || "Unnamed project"}
${input.projectDescription ? `DESCRIPTION: ${input.projectDescription}` : ""}
${input.angle ? `ANGLE / SLANT: ${input.angle}\nMake every section, headline and metric choice serve this angle.` : ""}
${input.comparisonNarrative ? `BEFORE/AFTER NARRATIVE: ${input.comparisonNarrative}` : ""}
${input.audience ? `AUDIENCE: ${input.audience}` : "AUDIENCE: donors, partners, and the public"}

FIELD-MEDIA EVIDENCE (${input.assets.length} assets):
${assetsBlock}

Return STRICT JSON only (no markdown). Schema:
{
  "title": "report title (<=90 chars)",
  "headline": "punchy one-line headline (<=110 chars)",
  "summary": "3-4 sentence executive summary",
  "narrative": "full report body in markdown (400-700 words), with ## section headers, bullet points where useful, and references to specific evidence assets by number",
  "metrics": {"trees_planted": 250, "hectares_restored": 12, "people_reached": 340, ...} (4-8 plausible KPIs derived from evidence; numbers as integers),
  "callToAction": "a single motivating call-to-action sentence (<=140 chars)"
}
Return ONLY the JSON.`;

  const raw = await chat([
    { role: "system", content: "You are a senior NGO impact strategist." },
    { role: "user", content: prompt },
  ]);
  return parseJsonLenient<ReportOutput>(raw, {
    title: `${input.projectName || "Project"} Report`,
    headline: "Impact report generated.",
    summary: raw.slice(0, 400) || "Report unavailable.",
    narrative: raw || "Report body unavailable.",
    metrics: {},
    callToAction: "Support this project today.",
  });
}

// ---------------- LLM: Semantic search scoring ----------------

export interface SearchHit {
  assetId: string;
  score: number;
  reason: string;
}

export async function semanticSearch(
  query: string,
  assets: { id: string; caption: string; summary: string; tags: string[]; location?: string; activity?: string; category?: string }[]
): Promise<SearchHit[]> {
  if (assets.length === 0) return [];
  const catalog = assets
    .map(
      (a, i) =>
        `[${i}] id=${a.id} | caption="${a.caption}" | summary="${a.summary}" | tags=[${a.tags.join(", ")}]${a.location ? ` | location=${a.location}` : ""}${a.activity ? ` | activity=${a.activity}` : ""}${a.category ? ` | category=${a.category}` : ""}`
    )
    .join("\n");

  const prompt = `You are a semantic media-search engine. Given the user query and a catalog of analyzed media assets, return the most relevant asset ids with relevance scores.

QUERY: "${query}"

CATALOG:
${catalog}

Return STRICT JSON only. Schema:
{"hits":[{"assetId":"<id>","score":0.0-1.0,"reason":"short reason"}]}
Return up to 20 hits, sorted by score descending. ONLY the JSON.`;

  const raw = await chat([
    { role: "system", content: "You are a precise semantic search engine for field-media assets." },
    { role: "user", content: prompt },
  ]);
  const parsed = parseJsonLenient<{ hits: SearchHit[] }>(raw, { hits: [] });
  return parsed.hits.sort((a, b) => b.score - a.score);
}

// ---------------- Image generation (sample field media) ----------------

export async function generateImage(prompt: string, size = "1344x768"): Promise<{ base64: string; buffer: Buffer }> {
  const c = cfg();
  if (!c.imageModel) {
    throw new Error(
      `AI_PROVIDER=${process.env.AI_PROVIDER?.trim().toLowerCase() || DEFAULT_PROVIDER} has no image generation. Set AI_IMAGE_MODEL (and AI_BASE_URL) for an image-capable provider.`
    );
  }
  return c.imageApi === "gemini"
    ? geminiImage(c, prompt, size)
    : c.imageApi === "chat"
      ? chatImage(c, prompt, size)
      : openaiImage(c, prompt, size);
}

// Chat-based image model (OpenRouter): the image arrives in message.images[],
// not in /images/generations. Free tier allows this route.
async function chatImage(c: AiConfig, prompt: string, size: string) {
  const resp = await aiFetch<{
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  }>("/chat/completions", {
    model: c.imageModel,
    messages: [
      { role: "user", content: `${prompt}. Render it in ${aspectRatioFor(size)} aspect ratio, no text or watermark.` },
    ],
    max_tokens: 4096,
  });
  const url = resp.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const b64 = url?.startsWith("data:") ? url.slice(url.indexOf(",") + 1) : null;
  if (!b64) throw new Error("Chat image model returned no image data");
  return { base64: b64, buffer: Buffer.from(b64, "base64") };
}

// Native Gemini endpoint: {root}/models/{model}:generateContent with x-goog-api-key auth.
// The preset's OpenAI-compat base (…/openai) has no /images/generations — it 404s.
interface GeminiImageResp {
  error?: { message?: string };
  candidates?: {
    content?: {
      parts?: { inlineData?: { data?: string } }[];
    };
  }[];
}

async function geminiImage(c: AiConfig, prompt: string, size: string) {
  const root = c.baseUrl.replace(/\/openai\/?$/, "");
  const call = (aspect?: string) =>
    fetch(`${root}/models/${encodeURIComponent(c.imageModel)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": c.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          ...(aspect ? { imageConfig: { aspectRatio: aspect } } : {}),
        },
      }),
    });

  const read = async (r: { ok: boolean; status: number; text: () => Promise<string> }) => {
    const t = await r.text();
    try {
      return { ok: r.ok, status: r.status, data: JSON.parse(t) as GeminiImageResp, raw: "" };
    } catch {
      return { ok: r.ok, status: r.status, data: null, raw: t.slice(0, 200) };
    }
  };
  const fail = (r: { status: number; data: GeminiImageResp | null; raw: string }) =>
    new Error(r.data?.error?.message || `Gemini image generation failed (${r.status})${r.raw ? `: ${r.raw}` : ""}`);

  let out = await read(await call(aspectRatioFor(size)));
  if (!out.ok) {
    if (!/aspect|image_?config/i.test(out.data?.error?.message || "")) throw fail(out);
    // ponytail: some image models reject imageConfig — retry once without it
    out = await read(await call());
    if (!out.ok) throw fail(out);
  }
  const b64 = out.data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error("Gemini image generation returned no image data");
  return { base64: b64, buffer: Buffer.from(b64, "base64") };
}

const ASPECT_RATIOS: [string, number][] = [
  ["1:1", 1],
  ["4:5", 0.8],
  ["5:4", 1.25],
  ["3:4", 0.75],
  ["4:3", 4 / 3],
  ["2:3", 2 / 3],
  ["3:2", 1.5],
  ["9:16", 9 / 16],
  ["16:9", 16 / 9],
  ["21:9", 21 / 9],
];

// Gemini takes an aspect ratio, not WxH — map to the nearest supported ratio.
function aspectRatioFor(size: string): string {
  const m = /^(\d+)x(\d+)$/.exec(size.trim());
  if (!m) return "16:9";
  const r = Number(m[1]) / Number(m[2]);
  let best = ASPECT_RATIOS[0];
  for (const a of ASPECT_RATIOS) if (Math.abs(a[1] - r) < Math.abs(best[1] - r)) best = a;
  return best[0];
}

async function openaiImage(c: AiConfig, prompt: string, size: string) {
  // ponytail: size fallback chain — providers differ on supported sizes
  const candidates = [size, "auto", "1024x1024"];
  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      const resp = await aiFetch<{ data?: { b64_json?: string; base64?: string; url?: string }[] }>(
        "/images/generations",
        { model: c.imageModel, prompt, size: candidate, n: 1 }
      );
      const item = resp.data?.[0];
      const base64 = item?.b64_json || item?.base64;
      if (base64) return { base64, buffer: Buffer.from(base64, "base64") };
      if (item?.url) {
        const r = await fetch(item.url);
        if (!r.ok) throw new Error(`Image download failed ${r.status}`);
        const buffer = Buffer.from(await r.arrayBuffer());
        return { base64: buffer.toString("base64"), buffer };
      }
      throw new Error("Image generation returned no data");
    } catch (err) {
      lastErr = err;
      if (!/size/i.test(err instanceof Error ? err.message : String(err))) throw err;
    }
  }
  throw lastErr;
}

export function saveUpload(file: Buffer, ext: string): { path: string; url: string } {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const full = path.join(dir, name);
  fs.writeFileSync(full, file);
  return { path: full, url: `/uploads/${name}` };
}

// ---------------- Helpers ----------------

export function parseJsonLenient<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  let text = raw.trim();
  // strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // find first { and last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    try {
      // try fixing trailing commas
      const fixed = text.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(fixed) as T;
    } catch {
      return fallback;
    }
  }
}
