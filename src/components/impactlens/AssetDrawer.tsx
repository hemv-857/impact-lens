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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { ConfidenceBar } from "@/components/impactlens/ConfidenceBar";
import { useImpactStore } from "@/lib/store";
import { useAnalyzeMedia, useDeleteMedia, useMediaById } from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { TransformStep } from "@/lib/types";

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
            {/* Image */}
            <div className="relative aspect-video w-full bg-stone-200">
              { }
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.title || asset.aiCaption || "Field media asset"}
                className="h-full w-full object-cover"
              />
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

              {/* Tags */}
              {asset.tags?.length > 0 && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-800"
                      >
                        #{t}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}

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

              {/* Traceability timeline */}
              {asset.transformations?.length > 0 && (
                <Section
                  title="Traceability timeline"
                  icon={<History className="size-4" />}
                >
                  <ol className="relative space-y-3 border-l border-stone-200 pl-4">
                    {asset.transformations.map((step: TransformStep, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                        <p className="text-sm font-medium text-stone-800">
                          {step.type}
                          {step.note && (
                            <span className="ml-2 text-xs font-normal text-stone-500">
                              {step.note}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {formatDateTime(step.at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

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
