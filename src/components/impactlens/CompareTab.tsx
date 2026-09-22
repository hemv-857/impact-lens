"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  GitCompareArrows,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Images,
  X,
  History,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/impactlens/EmptyState";
import {
  useComparisons,
  useCreateComparison,
  useMedia,
  useMediaById,
  useProjects,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, timeAgo } from "@/lib/format";
import type {
  ChangeItem,
  ComparisonResult,
  MediaAsset,
} from "@/lib/types";
import type { ComparisonWithAssets } from "@/lib/api";

const DIRECTION_STYLES = {
  improved: {
    icon: <TrendingUp className="size-3.5" />,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    arrow: "→",
  },
  declined: {
    icon: <TrendingDown className="size-3.5" />,
    color: "text-rose-700 bg-rose-50 border-rose-200",
    arrow: "→",
  },
  unchanged: {
    icon: <Minus className="size-3.5" />,
    color: "text-stone-600 bg-stone-100 border-stone-200",
    arrow: "→",
  },
} as const;

const MAGNITUDE_STYLES: Record<string, string> = {
  minor: "bg-stone-100 text-stone-600",
  moderate: "bg-amber-100 text-amber-700",
  major: "bg-emerald-100 text-emerald-700",
};

export function CompareTab() {
  const beforeId = useImpactStore((s) => s.compareBeforeId);
  const afterId = useImpactStore((s) => s.compareAfterId);
  const setComparePair = useImpactStore((s) => s.setComparePair);

  const [localBefore, setLocalBefore] = React.useState<string | null>(beforeId);
  const [localAfter, setLocalAfter] = React.useState<string | null>(afterId);
  const [projectId, setProjectId] = React.useState<string>("none");
  const [result, setResult] = React.useState<ComparisonResult | null>(null);
  const [picker, setPicker] = React.useState<"before" | "after" | null>(null);

  React.useEffect(() => {
    setLocalBefore(beforeId);
  }, [beforeId]);
  React.useEffect(() => {
    setLocalAfter(afterId);
  }, [afterId]);

  const beforeQ = useMediaById(localBefore);
  const afterQ = useMediaById(localAfter);
  const comparisonsQ = useComparisons();
  const projectsQ = useProjects();
  const create = useCreateComparison();
  const { toast } = useToast();

  // Use embedded before/after from the create result if available; otherwise
  // fall back to the per-id fetches above.
  const beforeAsset: MediaAsset | undefined =
    result?.before ?? beforeQ.data;
  const afterAsset: MediaAsset | undefined =
    result?.after ?? afterQ.data;

  const onGenerate = async () => {
    if (!localBefore || !localAfter) {
      toast({
        title: "Pick both before & after",
        variant: "destructive",
      });
      return;
    }
    try {
      const r = await create.mutateAsync({
        beforeId: localBefore,
        afterId: localAfter,
        projectId: projectId !== "none" ? projectId : undefined,
      });
      setResult(r);
      toast({
        title: "Comparison generated",
        description: `Impact score: ${
          r.impactScore != null
            ? Math.round(r.impactScore * 100) + "%"
            : "—"
        }`,
      });
    } catch (e) {
      toast({
        title: "Comparison failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Before / After Compare
        </h1>
        <p className="text-sm text-stone-500">
          Visually verify impact with AI-narrated change detection
        </p>
      </div>

      {/* Two drop zones */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DropZone
          label="Before"
          asset={beforeQ.data}
          loading={beforeQ.isFetching}
          onPick={() => setPicker("before")}
          onClear={() => {
            setLocalBefore(null);
            setComparePair(null, localAfter);
          }}
        />
        <DropZone
          label="After"
          asset={afterQ.data}
          loading={afterQ.isFetching}
          onPick={() => setPicker("after")}
          onClear={() => {
            setLocalAfter(null);
            setComparePair(localBefore, null);
          }}
        />
      </div>

      {/* Generate bar */}
      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">
              Save to project (optional)
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {projectsQ.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onGenerate}
            disabled={
              !localBefore ||
              !localAfter ||
              create.isPending
            }
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate comparison
          </Button>
          {result && (
            <span className="text-xs text-stone-500">
              Last result: {timeAgo(result.createdAt)}
            </span>
          )}
        </div>
      </Card>

      {/* Result */}
      {create.isPending && !result && (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <Loader2 className="size-4 animate-spin text-emerald-600" />
            Running VLM comparison… this can take 8–20 seconds.
          </div>
          <Skeleton className="mt-4 h-64 w-full" />
        </Card>
      )}

      {result && (
        <ComparisonResultView
          result={result}
          before={beforeAsset}
          after={afterAsset}
        />
      )}

      {/* Past comparisons */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-stone-500" />
          <h2 className="text-base font-semibold text-stone-900">
            Past comparisons
          </h2>
        </div>
        {comparisonsQ.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : !comparisonsQ.data || comparisonsQ.data.length === 0 ? (
          <EmptyState
            emoji="🪞"
            title="No comparisons yet"
            description="Pick a before & after image above, then generate your first comparison."
          />
        ) : (
          <div className="scrollbar-thin grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {comparisonsQ.data
              .slice()
              .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
              .map((c) => (
                <PastComparisonCard
                  key={c.id}
                  comparison={c}
                  onOpen={() => {
                    setLocalBefore(c.beforeId);
                    setLocalAfter(c.afterId);
                    setComparePair(c.beforeId, c.afterId);
                    setResult(c);
                  }}
                />
              ))}
          </div>
        )}
      </section>

      {/* Picker */}
      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        onPick={(asset) => {
          if (picker === "before") {
            setLocalBefore(asset.id);
            setComparePair(asset.id, localAfter);
          } else if (picker === "after") {
            setLocalAfter(asset.id);
            setComparePair(localBefore, asset.id);
          }
          setPicker(null);
        }}
      />
    </div>
  );
}

function DropZone({
  label,
  asset,
  loading,
  onPick,
  onClear,
}: {
  label: string;
  asset?: MediaAsset;
  loading?: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const isBefore = label === "Before";
  return (
    <Card
      className={cn(
        "lift-on-hover relative h-full min-h-[260px] gap-0 overflow-hidden p-0",
        isBefore ? "ring-1 ring-amber-200" : "ring-1 ring-emerald-200"
      )}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
            isBefore ? "text-amber-700" : "text-emerald-700"
          )}
        >
          <GitCompareArrows className="size-3.5" />
          {label}
        </span>
        {asset && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-stone-400 hover:text-rose-600"
            onClick={onClear}
            aria-label={`Clear ${label} image`}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {loading ? (
        <Skeleton className="m-4 aspect-video w-auto" />
      ) : asset ? (
        <div className="relative aspect-video w-full bg-stone-200">
          { }
          <img
            src={asset.thumbnailUrl || asset.url}
            alt={asset.title || asset.aiCaption || `${label} image`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="line-clamp-1 text-sm font-medium text-white">
              {asset.title || asset.aiCaption || "Untitled"}
            </p>
            <p className="text-[11px] text-white/70">
              {asset.location ?? "Unknown location"}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-stone-50 text-stone-500 transition hover:bg-stone-100"
        >
          <Images className="size-8 text-stone-400" />
          <span className="text-sm font-medium">Pick {label.toLowerCase()} image</span>
          <span className="text-xs text-stone-400">
            Choose from your media library
          </span>
        </button>
      )}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onPick}
        >
          {asset ? "Change image" : `Pick ${label.toLowerCase()} image`}
        </Button>
      </div>
    </Card>
  );
}

function ComparisonResultView({
  result,
  before,
  after,
}: {
  result: ComparisonResult;
  before?: MediaAsset;
  after?: MediaAsset;
}) {
  const [slider, setSlider] = React.useState(50);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="gap-0 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">
            Comparison result
          </h3>
          {result.impactScore != null && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-200"
            >
              <Gauge className="size-3.5" />
              Impact score: {Math.round(result.impactScore * 100)}%
            </Badge>
          )}
        </div>

        {/* Side-by-side with slider divider */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          {/* After image (full width bottom layer) */}
          { }
          <img
            src={after?.thumbnailUrl || after?.url}
            alt={
              after?.title || after?.aiCaption || "After image"
            }
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Before image clipped to slider % */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${slider}%` }}
          >
            { }
            <img
              src={before?.thumbnailUrl || before?.url}
              alt={
                before?.title || before?.aiCaption || "Before image"
              }
              className="absolute inset-0 h-full w-full object-cover"
              style={{ width: `${100 / (slider / 100)}%`, maxWidth: "none" }}
            />
          </div>
          {/* Divider line */}
          <div
            className="absolute inset-y-0 z-10 w-0.5 bg-white shadow"
            style={{ left: `${slider}%` }}
          >
            <div className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600 text-white shadow-md">
              <GitCompareArrows className="absolute inset-0 m-auto size-4" />
            </div>
          </div>
          {/* Labels */}
          <span className="absolute left-3 top-3 z-10 rounded-md bg-amber-600/90 px-2 py-0.5 text-xs font-semibold text-white">
            Before
          </span>
          <span className="absolute right-3 top-3 z-10 rounded-md bg-emerald-600/90 px-2 py-0.5 text-xs font-semibold text-white">
            After
          </span>
          {/* Range slider overlay */}
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Comparison divider position"
            className="absolute inset-x-0 bottom-0 z-20 h-1 w-full cursor-ew-resize opacity-0"
          />
        </div>
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Drag the divider to compare — left = before, right = after
        </p>

        {/* Narrative */}
        {result.narrative && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <Sparkles className="size-3.5" />
              AI narrative
            </h4>
            <p className="text-sm leading-relaxed text-stone-700">
              {result.narrative}
            </p>
          </div>
        )}

        {/* Changes */}
        {result.changes?.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Detected changes ({result.changes.length})
            </h4>
            <div className="space-y-2">
              {result.changes.map((c: ChangeItem, i) => {
                const style =
                  DIRECTION_STYLES[c.direction] ?? DIRECTION_STYLES.unchanged;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                      style.color
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                        {style.icon}
                        {c.aspect}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        <span className="font-medium">{c.before}</span>
                        <ArrowRight className="mx-1 inline size-3 text-stone-400" />
                        <span className="font-medium">{c.after}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge
                        variant="outline"
                        className={
                          MAGNITUDE_STYLES[c.magnitude] ??
                          MAGNITUDE_STYLES.minor
                        }
                      >
                        {c.magnitude}
                      </Badge>
                      <span className="text-xs font-semibold capitalize">
                        {c.direction}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] text-stone-400">
          Comparison created {formatDateTime(result.createdAt)}
        </p>
      </Card>
    </motion.div>
  );
}

function PastComparisonCard({
  comparison,
  onOpen,
}: {
  comparison: ComparisonWithAssets;
  onOpen: () => void;
}) {
  // The list endpoint already includes before/after assets, so we render
  // directly without triggering extra per-card fetches.
  const before = comparison.before ?? null;
  const after = comparison.after ?? null;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="lift-on-hover cursor-pointer gap-0 overflow-hidden p-0"
    >
      <div className="flex aspect-video w-full bg-stone-100">
        <div className="relative w-1/2 overflow-hidden">
          { }
          <img
            src={before?.thumbnailUrl || before?.url || ""}
            alt="Before"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative w-1/2 overflow-hidden border-l-2 border-white">
          { }
          <img
            src={after?.thumbnailUrl || after?.url || ""}
            alt="After"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {formatDateTime(comparison.createdAt)}
          </span>
          {comparison.impactScore != null && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              {Math.round(comparison.impactScore * 100)}% impact
            </Badge>
          )}
        </div>
        {comparison.narrative && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-600">
            {comparison.narrative}
          </p>
        )}
      </div>
    </Card>
  );
}

function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (asset: MediaAsset) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const mediaQ = useMedia({ search: debounced || undefined, limit: 60 });

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick an asset</DialogTitle>
          <DialogDescription>
            Search your media library to choose an image.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search caption, tags, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto pr-1">
          {mediaQ.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video w-full rounded-md" />
              ))}
            </div>
          ) : !mediaQ.data || mediaQ.data.length === 0 ? (
            <EmptyState emoji="🔍" title="No media found" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {mediaQ.data.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onPick(a)}
                  className="lift-on-hover overflow-hidden rounded-md border border-stone-200 bg-white text-left"
                >
                  <div className="aspect-video w-full bg-stone-100">
                    { }
                    <img
                      src={a.thumbnailUrl || a.url}
                      alt={a.title || a.aiCaption || "Media asset"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="line-clamp-1 p-2 text-xs font-medium text-stone-700">
                    {a.title || a.aiCaption || "Untitled"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
