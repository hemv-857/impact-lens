"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Sparkles,
  Loader2,
  Copy,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Check,
  Hash,
  Image as ImageIcon,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { MarkdownRenderer } from "@/components/impactlens/MarkdownRenderer";
import { PlatformPreview } from "@/components/impactlens/PlatformPreview";
import {
  useCreateCampaign,
  useGenerateCampaignVariants,
  useMedia,
  useProjects,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { CampaignVariant } from "@/lib/api";
import type { Report } from "@/lib/types";

const PLATFORMS = [
  {
    value: "instagram",
    label: "Instagram",
    icon: <Instagram className="size-4" />,
    limit: 2200,
  },
  {
    value: "twitter",
    label: "Twitter / X",
    icon: <Twitter className="size-4" />,
    limit: 280,
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="size-4" />,
    limit: 3000,
  },
  {
    value: "newsletter",
    label: "Newsletter",
    icon: <Mail className="size-4" />,
    limit: 5000,
  },
] as const;

const TONES = ["professional", "emotional", "data-driven"] as const;

export function CampaignTab() {
  const [platform, setPlatform] = React.useState<
    "instagram" | "twitter" | "linkedin" | "newsletter"
  >("instagram");
  const [tone, setTone] = React.useState<(typeof TONES)[number]>("emotional");
  const [projectId, setProjectId] = React.useState<string>("none");
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<Report | null>(null);
  const [variants, setVariants] = React.useState<CampaignVariant[] | null>(null);
  const [showVariants, setShowVariants] = React.useState(false);

  const projectsQ = useProjects();
  const mediaQ = useMedia({
    limit: 60,
    projectId: projectId !== "none" ? projectId : undefined,
  });
  const create = useCreateCampaign();
  const variantsMut = useGenerateCampaignVariants();
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const { toast } = useToast();

  const platformMeta =
    PLATFORMS.find((p) => p.value === platform) ?? PLATFORMS[0];

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onGenerate = async () => {
    if (selectedAssetIds.length === 0) {
      toast({
        title: "Pick at least one media asset",
        description: "Campaigns reference specific field evidence.",
        variant: "destructive",
      });
      return;
    }
    try {
      const r = await create.mutateAsync({
        platform,
        tone,
        projectId: projectId !== "none" ? projectId : undefined,
        assetIds: selectedAssetIds,
      });
      setResult(r);
      toast({ title: "Campaign generated", description: r.title });
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const onGenerateVariants = async () => {
    if (selectedAssetIds.length === 0) {
      toast({
        title: "Pick at least one media asset",
        description: "Campaigns reference specific field evidence.",
        variant: "destructive",
      });
      return;
    }
    setShowVariants(true);
    setVariants(null);
    try {
      const r = await variantsMut.mutateAsync({
        platform,
        tone,
        projectId: projectId !== "none" ? projectId : undefined,
        assetIds: selectedAssetIds,
      });
      setVariants(r.variants);
      toast({
        title: "3 variants generated",
        description: "Story-first, Data-first, and Question-hook angles ready.",
      });
    } catch (e) {
      toast({
        title: "Variant generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setShowVariants(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Campaign Studio
        </h1>
        <p className="text-sm text-stone-500">
          Generate platform-ready campaign content from your field-media
          evidence
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Form */}
        <Card className="gap-0 p-4 lg:col-span-2 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-800">
            Configure campaign
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-stone-500">
                Platform
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2.5 text-left transition",
                      platform === p.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    )}
                  >
                    {p.icon}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        ≤ {p.limit} chars
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) =>
                    setTone(v as (typeof TONES)[number])
                  }
                >
                  <SelectTrigger className="w-full capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">Project</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v);
                    setSelectedAssetIds([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All media" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All media</SelectItem>
                    {projectsQ.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">
                Select media ({selectedAssetIds.length} selected)
              </Label>
              <div className="scrollbar-thin max-h-72 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-1">
                {mediaQ.isLoading ? (
                  <div className="space-y-1 p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !mediaQ.data || mediaQ.data.length === 0 ? (
                  <p className="p-3 text-center text-xs text-stone-400">
                    No media available.
                  </p>
                ) : (
                  mediaQ.data.map((a) => {
                    const checked = selectedAssetIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAsset(a.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md p-1.5 text-left transition",
                          checked
                            ? "bg-emerald-50 ring-1 ring-emerald-200"
                            : "hover:bg-stone-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border",
                            checked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-stone-300 bg-white"
                          )}
                        >
                          {checked && <Check className="size-3" />}
                        </span>
                        <div className="relative size-10 shrink-0 overflow-hidden rounded bg-stone-100">
                          { }
                          <img
                            src={a.thumbnailUrl || a.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-stone-800">
                            {a.title || a.aiCaption || "Untitled"}
                          </span>
                          <span className="block truncate text-[10px] text-stone-400">
                            {a.tags?.slice(0, 3).join(" · ") ?? "—"}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              onClick={onGenerate}
              disabled={create.isPending}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate campaign
            </Button>
            <Button
              onClick={onGenerateVariants}
              disabled={variantsMut.isPending}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {variantsMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitBranch className="size-4" />
              )}
              Generate 3 A/B variants
            </Button>
          </div>
        </Card>

        {/* Result */}
        <div className="lg:col-span-3 space-y-4">
          {create.isPending && !result ? (
            <Card className="p-6">
              <CampaignGenerating />
            </Card>
          ) : result ? (
            <CampaignView
              report={result}
              platformMeta={platformMeta}
              selectedAssets={
                mediaQ.data?.filter((a) =>
                  selectedAssetIds.includes(a.id)
                ) ?? []
              }
              onCopy={onCopy}
            />
          ) : showVariants ? (
            variantsMut.isPending ? (
              <Card className="p-6">
                <CampaignGenerating label="Generating 3 A/B variants…" icon={<GitBranch className="size-12 animate-pulse text-amber-500" />} />
              </Card>
            ) : variants && variants.length > 0 ? (
              <VariantsView variants={variants} onCopy={onCopy} platformLabel={platformMeta.label} />
            ) : null
          ) : (
            <EmptyState
              emoji="📣"
              title="No campaign yet"
              description="Pick a platform, tone, and the media you want to feature, then click Generate campaign or Generate 3 A/B variants."
              actionLabel="Analyze new media"
              onAction={() => setUploadOpen(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VariantsView({
  variants,
  onCopy,
  platformLabel,
}: {
  variants: CampaignVariant[];
  onCopy: (text: string, label: string) => void;
  platformLabel: string;
}) {
  const ANGLE_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
    "Story-first": { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "📖" },
    "Data-first": { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "📊" },
    "Question-hook": { color: "text-teal-700", bg: "bg-teal-50 border-teal-200", icon: "❓" },
  };
  return (
    <div className="space-y-3">
      <Card className="gap-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <GitBranch className="size-4 text-amber-600" />
              A/B Variants — {platformLabel}
            </h3>
            <p className="text-xs text-stone-500">3 strategic angles for testing. Copy your favorite.</p>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {variants.length} variants
          </Badge>
        </div>
      </Card>
      {variants.map((v, i) => {
        const style = ANGLE_STYLES[v.angle] ?? ANGLE_STYLES["Story-first"];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={cn("gap-0 p-4 border", style.bg)}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{style.icon}</span>
                  <div>
                    <p className={cn("text-xs font-bold uppercase tracking-wide", style.color)}>
                      Variant {i + 1} · {v.angle}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white/70">
                  {v.caption.length} chars
                </Badge>
              </div>
              <h4 className="text-base font-bold text-stone-900">{v.headline}</h4>
              <div className="mt-2 rounded-md border border-stone-200 bg-white p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{v.caption}</p>
              </div>
              {v.hashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.hashtags.map((h) => (
                    <Badge key={h} variant="secondary" className="bg-emerald-50 text-emerald-800 text-[10px]">
                      {h}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="flex-1 truncate text-xs text-stone-500">
                  <strong>CTA:</strong> {v.callToAction}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={() => onCopy(v.caption, `Variant ${i + 1} caption`)}>
                    <Copy className="size-3" /> Caption
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={() => onCopy(`${v.headline}\n\n${v.caption}\n\n${v.hashtags.join(" ")}\n\n${v.callToAction}`, `Variant ${i + 1} full`)}>
                    <Copy className="size-3" /> All
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function CampaignGenerating({
  label,
  icon,
}: {
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon ?? <Megaphone className="size-12 animate-pulse text-amber-500" />}
      <h3 className="mt-4 text-lg font-semibold text-stone-800">
        {label ?? "Crafting your campaign…"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">
        Writing platform-ready copy with hashtags and a clear call-to-action.
      </p>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-amber-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function CampaignView({
  report,
  platformMeta,
  selectedAssets,
  onCopy,
}: {
  report: Report;
  platformMeta: (typeof PLATFORMS)[number];
  selectedAssets: { id: string; thumbnailUrl: string | null; url: string; title: string; aiCaption: string | null }[];
  onCopy: (text: string, label: string) => void;
}) {
  const caption = report.summary ?? "";
  const overLimit = caption.length > platformMeta.limit;
  const hashtags = React.useMemo(
    () =>
      Array.from(
        new Set(
          (report.narrative ?? "")
            .split(/\s+/)
            .filter((w) => w.startsWith("#"))
            .map((w) => w.replace(/[^\w#]/g, ""))
        )
      ).slice(0, 10),
    [report.narrative]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="gap-0 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-200"
            >
              {platformMeta.icon}
              {platformMeta.label}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {report.tone}
            </Badge>
            <span className="text-xs text-stone-400">
              {formatDateTime(report.createdAt)}
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-stone-900">
          {report.title}
        </h2>
        {report.headline && (
          <p className="mt-1 text-base font-medium text-amber-700">
            {report.headline}
          </p>
        )}

        {/* Caption */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Caption
            </Label>
            <span
              className={cn(
                "text-[11px]",
                overLimit ? "text-rose-600" : "text-stone-400"
              )}
            >
              {caption.length} / {platformMeta.limit}
            </span>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {caption}
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopy(caption, "Caption")}
            >
              <Copy className="size-3.5" /> Copy caption
            </Button>
          </div>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="mt-3">
            <Label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <Hash className="size-3" /> Suggested hashtags
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {hashtags.map((h) => (
                <Badge
                  key={h}
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-800"
                >
                  {h}
                </Badge>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onCopy(hashtags.join(" "), "Hashtags")}
              >
                <Copy className="size-3" /> Copy all
              </Button>
            </div>
          </div>
        )}

        {/* Suggested image carousel */}
        {selectedAssets.length > 0 && (
          <div className="mt-4">
            <Label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <ImageIcon className="size-3" /> Suggested image carousel
            </Label>
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
              {selectedAssets.map((a, i) => (
                <div
                  key={a.id}
                  className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                >
                  { }
                  <img
                    src={a.thumbnailUrl || a.url}
                    alt={a.title || a.aiCaption || `Carousel slide ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full narrative as markdown */}
        {report.narrative && (
          <div className="mt-4">
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Full narrative
            </Label>
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <MarkdownRenderer content={report.narrative} />
            </div>
          </div>
        )}

        {/* CTA */}
        {report.callToAction && (
          <div className="mt-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Call to action
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{report.callToAction}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 bg-white text-amber-800 hover:bg-amber-50"
              onClick={() => onCopy(report.callToAction!, "CTA")}
            >
              <Copy className="size-3.5" /> Copy CTA
            </Button>
          </div>
        )}
      </Card>

      {/* Platform Preview */}
      <PlatformPreviewCard
        platform={platformMeta.value}
        caption={caption}
        headline={report.headline ?? undefined}
        callToAction={report.callToAction ?? undefined}
        imageUrl={selectedAssets[0]?.thumbnailUrl || selectedAssets[0]?.url}
        hashtags={hashtags}
      />
    </motion.div>
  );
}

function PlatformPreviewCard({
  platform,
  caption,
  headline,
  callToAction,
  imageUrl,
  hashtags,
}: {
  platform: "instagram" | "twitter" | "linkedin" | "newsletter";
  caption: string;
  headline?: string;
  callToAction?: string;
  imageUrl?: string;
  hashtags: string[];
}) {
  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <span className="text-emerald-600">↗</span>
            Platform preview
          </h3>
          <p className="text-xs text-stone-500">
            How your post will look on {platform}
          </p>
        </div>
        <Badge variant="outline" className="capitalize bg-stone-50 text-stone-500">
          Live mockup
        </Badge>
      </div>
      <PlatformPreview
        platform={platform}
        caption={caption}
        headline={headline}
        callToAction={callToAction}
        imageUrl={imageUrl}
        hashtags={hashtags}
      />
    </Card>
  );
}
