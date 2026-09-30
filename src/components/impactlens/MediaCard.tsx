"use client";

import { motion } from "framer-motion";
import {
  Eye,
  GitCompareArrows,
  FileText,
  MoreVertical,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Star,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceMark, evidenceState } from "@/components/impactlens/EvidenceMark";
import { accessionNo } from "@/lib/format";
import { Thumb } from "@/components/impactlens/Thumb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { useImpactStore } from "@/lib/store";
import { useAnalyzeMedia, useToggleFavorite } from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import type { MediaAsset } from "@/lib/types";

interface MediaCardProps {
  asset: MediaAsset;
  className?: string;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function MediaCard({
  asset,
  className,
  compact,
  selectable = false,
  selected = false,
  onToggleSelect,
}: MediaCardProps) {
  const openAsset = useImpactStore((s) => s.openAsset);
  const setTab = useImpactStore((s) => s.setTab);
  const setComparePair = useImpactStore((s) => s.setComparePair);
  const analyze = useAnalyzeMedia();
  const favMut = useToggleFavorite();
  const { toast } = useToast();
  const title = asset.title || asset.aiCaption || "Untitled media";
  const isAnalyzed = !!asset.analyzedAt;

  const onQuickAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast({ title: "Analyzing…", description: "VLM extracting intelligence. ~10–20s." });
      await analyze.mutateAsync(asset.id);
      toast({ title: "Analysis complete", description: "AI intelligence updated." });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    favMut.mutate({ id: asset.id });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={() => (selectable ? onToggleSelect?.(asset.id) : openAsset(asset.id))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (selectable) onToggleSelect?.(asset.id);
            else openAsset(asset.id);
          }
        }}
        className={cn(
          "lift-on-hover group relative h-full cursor-pointer gap-0 overflow-hidden rounded-xl p-0 shadow-none",
          selected && "ring-2 ring-emerald-500 ring-offset-1",
          selectable && !selected && "ring-1 ring-stone-200"
        )}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
          {asset.type === "video" && !asset.thumbnailUrl ? (
            // no poster image (local upload): let the browser paint the first frame
            <video
              src={`${asset.url}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              aria-label={title}
              className={cn("h-full w-full object-cover", !isAnalyzed && "opacity-90")}
            />
          ) : (
            <Thumb asset={asset} alt={title} className={cn(!isAnalyzed && "opacity-90")} />
          )}
          {/* Pending-analysis overlay */}
          {!isAnalyzed && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/30">
              <span className="flex items-center gap-1.5 rounded-full bg-stone-900/80 px-3 py-1 text-[11px] font-medium text-white">
                <Clock className="size-3" />
                Pending analysis
              </span>
            </div>
          )}
          {/* Video badge */}
          {asset.type === "video" && (
            <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-stone-900/80 px-2 py-0.5 text-[9px] font-medium text-white">
              <Video className="size-2.5" />
              VIDEO
            </div>
          )}
          {/* Top overlay: category + selection checkbox / verified */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <div className="flex items-center gap-1">
              {selectable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(asset.id);
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded border-2 bg-white/95 shadow-sm transition",
                    selected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 text-transparent hover:border-emerald-500"
                  )}
                  aria-label={selected ? "Deselect" : "Select"}
                >
                  {selected && <CheckCircle2 className="size-4" />}
                </button>
              ) : (
                <CategoryBadge category={asset.category} />
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Favorite star toggle */}
              <button
                type="button"
                onClick={onToggleFav}
                disabled={favMut.isPending}
                aria-label={asset.favorite ? "Remove from favorites" : "Add to favorites"}
                title={asset.favorite ? "Remove from favorites" : "Add to favorites"}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full transition",
                  asset.favorite
                    ? "bg-white/90 text-stone-900"
                    : "bg-stone-900/50 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                )}
              >
                <Star className={cn("size-3.5", asset.favorite && "fill-current")} />
              </button>
            </div>
          </div>
          {/* Hover quick actions — hidden when in selection mode */}
          {!selectable && (
            <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-end gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              {!isAnalyzed && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 bg-amber-500 px-2 text-xs text-white hover:bg-amber-600"
                  onClick={onQuickAnalyze}
                  disabled={analyze.isPending}
                >
                  {analyze.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Analyze
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="h-7 bg-white/95 px-2 text-xs hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  openAsset(asset.id);
                }}
              >
                <Eye className="size-3.5" /> View
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 bg-white/95 px-2 text-xs hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setComparePair(
                    asset.pairRole === "after" ? null : asset.id,
                    asset.pairRole === "after" ? asset.id : null
                  );
                  setTab("compare");
                }}
              >
                <GitCompareArrows className="size-3.5" /> Compare
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 bg-white/95 p-0 hover:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setTab("reports");
                    }}
                  >
                    <FileText className="size-4" /> Use in report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setComparePair(asset.id, null);
                      setTab("compare");
                    }}
                  >
                    <GitCompareArrows className="size-4" /> Set as Before
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setComparePair(null, asset.id);
                      setTab("compare");
                    }}
                  >
                    <GitCompareArrows className="size-4" /> Set as After
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className={cn("flex items-start gap-3 p-3", compact && "p-2.5")}>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-sm font-medium text-stone-900">{title}</h3>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
              <span className="font-mono text-[11px] text-stone-600">{accessionNo(asset.id)}</span>
              {asset.location && <span className="truncate">{asset.location}</span>}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 pt-0.5">
            {typeof asset.confidence === "number" && (
              <span
                className={cn("text-xs tabular-nums", asset.confidence < 0.6 ? "text-amber-700" : "text-stone-600")}
                title="AI confidence"
              >
                {Math.round(asset.confidence * 100)}%
              </span>
            )}
            <EvidenceMark state={evidenceState(asset)} />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

export function MediaCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-0">
      <div className="aspect-video w-full animate-pulse bg-stone-200" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
      </div>
    </Card>
  );
}
