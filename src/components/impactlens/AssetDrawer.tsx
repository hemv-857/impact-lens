"use client";

import * as React from "react";
import {
  Sparkles,
  MapPin,
  Calendar,
  Tag,
  RefreshCw,
  Trash2,
  FolderKanban,
  ShieldCheck,
  History,
  ScanText,
  Gauge,
  FileText,
  GitCompareArrows,
  Loader2,
  Upload,
  Image as ImageIcon,
  Wand2,
  Activity,
  X,
  Plus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { ConfidenceBar } from "@/components/impactlens/ConfidenceBar";
import { AssetNotes } from "@/components/impactlens/AssetNotes";
import { useImpactStore } from "@/lib/store";
import { useAnalyzeMedia, useDeleteMedia, useMediaById, useUpdateMediaTags } from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { TransformStep } from "@/lib/types";

// Transform-step → icon map (for the evidence chain visualization)
const TRANSFORM_ICONS: Record<string, React.ReactNode> = {
  upload: <Upload className="size-3" />,
  generate: <Wand2 className="size-3" />,
  "ai-analyze": <Sparkles className="size-3" />,
  enhance: <RefreshCw className="size-3" />,
  resize: <ImageIcon className="size-3" />,
  crop: <ImageIcon className="size-3" />,
};

// Transform-step → node color (earthy palette)
const TRANSFORM_COLORS: Record<string, string> = {
  upload: "bg-stone-500 ring-stone-50",
  generate: "bg-amber-500 ring-amber-50",
  "ai-analyze": "bg-emerald-600 ring-emerald-50",
  enhance: "bg-teal-500 ring-teal-50",
  resize: "bg-stone-400 ring-stone-50",
  crop: "bg-stone-400 ring-stone-50",
};

// Format a duration in ms as a human-readable string (e.g. "2s", "5m", "3h", "2d")
function formatDuration(ms: number): string {
  if (ms < 1000) return "<1s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function AssetDrawer() {
  const assetId = useImpactStore((s) => s.selectedAssetId);
  const openAsset = useImpactStore((s) => s.openAsset);
  const setTab = useImpactStore((s) => s.setTab);
  const setComparePair = useImpactStore((s) => s.setComparePair);
  const setReportsProjectId = useImpactStore((s) => s.setReportsProjectId);
  const { toast } = useToast();

  const { data: asset, isFetching } = useMediaById(assetId);
  const analyze = useAnalyzeMedia();
  const del = useDeleteMedia();
  const tagMut = useUpdateMediaTags();
  const [tagDraft, setTagDraft] = React.useState("");

  const open = !!assetId;

  const onReanalyze = async () => {
    if (!assetId) return;
    try {
      toast({
        title: "Re-analyzing media",
        description: "Running VLM extraction… this may take 5–15 seconds.",
      });
      await analyze.mutateAsync(assetId);
      toast({ title: "Analysis refreshed", description: "AI signals updated." });
    } catch (e) {
      toast({
        title: "Re-analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const saveTags = async (tags: string[]): Promise<boolean> => {
    if (!assetId) return false;
    try {
      await tagMut.mutateAsync({ id: assetId, tags });
      return true;
    } catch (e) {
      toast({
        title: "Couldn't save tags",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  };

  const onAddTag = async () => {
    if (!asset) return;
    const v = tagDraft.trim();
    if (!v) return;
    if (asset.tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setTagDraft("");
      toast({ title: "Already tagged", description: `#${v} is on this asset.` });
      return;
    }
    if (await saveTags([...asset.tags, v])) setTagDraft("");
  };

  const onRemoveTag = (t: string) => {
    if (!asset) return;
    void saveTags(asset.tags.filter((x) => x !== t));
  };

  const onDelete = async () => {
    if (!assetId) return;
    try {
      await del.mutateAsync(assetId);
      toast({ title: "Asset deleted" });
      openAsset(null);
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && openAsset(null)}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b border-stone-200 bg-white p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-600" />
            {asset?.title ?? (isFetching ? "Loading…" : "Asset details")}
          </SheetTitle>
          <SheetDescription className="text-xs">
            AI-extracted intelligence & traceability timeline
          </SheetDescription>
        </SheetHeader>

        {!asset && isFetching && <DrawerSkeleton />}

        {asset && (
          <div className="scrollbar-thin flex-1 overflow-y-auto bg-stone-50">
            {/* Media display (image or video) */}
            <div className="relative aspect-video w-full bg-stone-200">
              {asset.type === "video" ? (
                <video
                  src={asset.url}
                  controls
                  className="h-full w-full object-cover"
                  poster={asset.thumbnailUrl || undefined}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.title || asset.aiCaption || "Field media asset"}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <CategoryBadge category={asset.category} />
                {asset.verified && (
                  <Badge
                    variant="outline"
                    className="bg-white/90 text-emerald-700 border-emerald-200"
                  >
                    <ShieldCheck className="size-3" /> Verified evidence
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-5 p-4">
              {/* Quick actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={onReanalyze}
                  disabled={analyze.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {analyze.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Re-analyze
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setComparePair(asset.pairRole === "after" ? null : asset.id, asset.pairRole === "after" ? asset.id : null);
                    setTab("compare");
                  }}
                >
                  <GitCompareArrows className="size-3.5" /> Compare
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (asset.projectId) setReportsProjectId(asset.projectId);
                    setTab("reports");
                  }}
                >
                  <FileText className="size-3.5" /> Use in report
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={del.isPending}
                  className="ml-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </div>

              {/* Caption + summary */}
              {asset.aiCaption && (
                <Section title="AI Caption" icon={<Sparkles className="size-4" />}>
                  <p className="text-sm font-medium text-stone-800">
                    {asset.aiCaption}
                  </p>
                </Section>
              )}
              {asset.aiSummary && (
                <Section title="Summary">
                  <p className="text-sm leading-relaxed text-stone-600">
                    {asset.aiSummary}
                  </p>
                </Section>
              )}
              {asset.aiDescription && (
                <Section title="Full description">
                  <p className="text-sm leading-relaxed text-stone-600">
                    {asset.aiDescription}
                  </p>
                </Section>
              )}

              {/* Meta grid */}
              <Section title="Detected metadata">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MetaRow
                    icon={<FolderKanban className="size-4 text-stone-400" />}
                    label="Project"
                    value={asset.projectName ?? "—"}
                  />
                  <MetaRow
                    icon={<MapPin className="size-4 text-stone-400" />}
                    label="Location"
                    value={asset.location ?? "—"}
                  />
                  <MetaRow
                    icon={<Tag className="size-4 text-stone-400" />}
                    label="Activity"
                    value={asset.activity ?? "—"}
                  />
                  <MetaRow
                    icon={<Calendar className="size-4 text-stone-400" />}
                    label="Captured"
                    value={
                      asset.captureDate
                        ? formatDateTime(asset.captureDate)
                        : "—"
                    }
                  />
                  <MetaRow
                    icon={<Gauge className="size-4 text-stone-400" />}
                    label="Confidence"
                    value={
                      typeof asset.confidence === "number" ? (
                        <ConfidenceBar value={asset.confidence} />
                      ) : (
                        "—"
                      )
                    }
                  />
                  <MetaRow
                    icon={<Gauge className="size-4 text-stone-400" />}
                    label="Quality"
                    value={
                      typeof asset.qualityScore === "number"
                        ? `${Math.round(asset.qualityScore * 100)}%`
                        : "—"
                    }
                  />
                  <MetaRow
                    icon={<Sparkles className="size-4 text-stone-400" />}
                    label="Mood"
                    value={asset.mood ?? "—"}
                  />
                  <MetaRow
                    icon={<History className="size-4 text-stone-400" />}
                    label="Analyzed"
                    value={
                      asset.analyzedAt ? formatDateTime(asset.analyzedAt) : "—"
                    }
                  />
                </div>
              </Section>

              {/* Detected signals */}
              {asset.signals?.length > 0 && (
                <Section title="Detected signals" icon={<Sparkles className="size-4" />}>
                  <div className="space-y-2">
                    {asset.signals.map((sig, i) => (
                      <div
                        key={`${sig.label}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-800">
                            {sig.label}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-stone-400">
                            {sig.category}
                          </p>
                        </div>
                        <ConfidenceBar
                          value={sig.confidence}
                          showLabel
                          className="min-w-[100px]"
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Objects */}
              {asset.objects?.length > 0 && (
                <Section title="Objects detected">
                  <div className="flex flex-wrap gap-1.5">
                    {asset.objects.map((o, i) => (
                      <Badge
                        key={`${o.name}-${i}`}
                        variant="outline"
                        className="bg-stone-50 text-stone-700"
                      >
                        {o.name}
                        {typeof o.count === "number" && (
                          <span className="ml-1 text-stone-400">×{o.count}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}

              {/* Topic tags — AI-generated + manual, click a chip to remove */}
              <Section title="Tags" icon={<Tag className="size-4" />}>
                <div className="flex flex-wrap gap-1.5" data-testid="asset-tags">
                  {asset.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onRemoveTag(t)}
                      aria-label={`Remove tag ${t}`}
                      className="group inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                    >
                      #{t}
                      <X className="size-3 opacity-40 transition group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
                <form
                  className="mt-2 flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onAddTag();
                  }}
                >
                  <Input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    placeholder="Add a topic tag…"
                    maxLength={40}
                    aria-label="New topic tag"
                    data-testid="tag-input"
                    className="h-8 flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={tagMut.isPending || !tagDraft.trim()}
                    aria-label="Add tag"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </form>
              </Section>

              {/* OCR */}
              {asset.ocrText && asset.ocrText.trim().length > 0 && (
                <Section title="OCR text" icon={<ScanText className="size-4" />}>
                  <pre className="scrollbar-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-stone-900 p-3 text-xs text-stone-100">
                    {asset.ocrText}
                  </pre>
                </Section>
              )}

              {/* Pair info */}
              {asset.pairGroup && (
                <Section title="Before/After pair">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge
                      variant="outline"
                      className={
                        asset.pairRole === "before"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }
                    >
                      {asset.pairRole ?? "—"}
                    </Badge>
                    <span className="text-xs text-stone-500">
                      Group: <code className="rounded bg-stone-100 px-1 py-0.5">{asset.pairGroup}</code>
                    </span>
                  </div>
                </Section>
              )}

              {/* Evidence chain / traceability timeline */}
              {asset.transformations?.length > 0 && (
                <Section
                  title="Evidence chain"
                  icon={<History className="size-4" />}
                >
                  {/* Summary bar */}
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-stone-50 p-2 text-[11px] text-stone-500">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                      {asset.transformations.length} step{asset.transformations.length === 1 ? "" : "s"}
                    </Badge>
                    <span>From <strong className="text-stone-700">{formatDateTime(asset.transformations[0].at)}</strong></span>
                    <span>→</span>
                    <span>To <strong className="text-stone-700">{formatDateTime(asset.transformations[asset.transformations.length - 1].at)}</strong></span>
                  </div>
                  <ol className="relative space-y-3 border-l-2 border-stone-200 pl-5">
                    {asset.transformations.map((step: TransformStep, i) => {
                      const isLast = i === asset.transformations.length - 1;
                      const icon = TRANSFORM_ICONS[step.type] ?? <Activity className="size-3" />;
                      const color = TRANSFORM_COLORS[step.type] ?? "bg-stone-400 ring-stone-50";
                      const prevStep = i > 0 ? asset.transformations[i - 1] : null;
                      const durationMs = prevStep ? +new Date(step.at) - +new Date(prevStep.at) : 0;
                      return (
                        <li key={i} className="relative">
                          {/* Node */}
                          <span className={`absolute -left-[26px] top-0.5 flex size-5 items-center justify-center rounded-full text-white ring-4 ${color}`}>
                            {icon}
                          </span>
                          <div className="rounded-md border border-stone-100 bg-white p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold capitalize text-stone-800">
                                {step.type.replace(/[-_]/g, " ")}
                              </p>
                              {!isLast && durationMs > 0 && (
                                <Badge variant="outline" className="bg-stone-50 text-[9px] text-stone-400">
                                  +{formatDuration(durationMs)}
                                </Badge>
                              )}
                            </div>
                            {step.note && (
                              <p className="mt-0.5 text-xs text-stone-500">{step.note}</p>
                            )}
                            <p className="mt-0.5 text-[10px] text-stone-400">
                              {formatDateTime(step.at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </Section>
              )}

              <Separator />

              {/* Asset notes / annotations */}
              <AssetNotes assetId={asset.id} />

              <Separator />
              <p className="text-[11px] text-stone-400">
                Source: {asset.source ?? "upload"} · Created{" "}
                {formatDateTime(asset.createdAt)} · Updated{" "}
                {formatDateTime(asset.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-400">
        {icon}
        {label}
      </span>
      <span className="text-sm text-stone-700">{value}</span>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
