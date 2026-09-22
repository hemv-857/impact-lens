"use client";

import { motion } from "framer-motion";
import {
  Eye,
  GitCompareArrows,
  FileText,
  MapPin,
  BadgeCheck,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { ConfidenceBar } from "@/components/impactlens/ConfidenceBar";
import { truncate } from "@/lib/format";
import { useImpactStore } from "@/lib/store";
import type { MediaAsset } from "@/lib/types";

interface MediaCardProps {
  asset: MediaAsset;
  className?: string;
  compact?: boolean;
}

export function MediaCard({ asset, className, compact }: MediaCardProps) {
  const openAsset = useImpactStore((s) => s.openAsset);
  const setTab = useImpactStore((s) => s.setTab);
  const setComparePair = useImpactStore((s) => s.setComparePair);
  const thumbnail = asset.thumbnailUrl || asset.url;
  const title = asset.title || asset.aiCaption || "Untitled media";

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
        onClick={() => openAsset(asset.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openAsset(asset.id);
          }
        }}
        className="lift-on-hover group relative h-full cursor-pointer gap-0 overflow-hidden p-0"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
          { }
          <img
            src={thumbnail}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* Top overlay: category + verified */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <CategoryBadge category={asset.category} />
            {asset.verified && (
              <Badge
                variant="outline"
                className="bg-white/90 text-emerald-700 border-emerald-200"
              >
                <BadgeCheck className="size-3" /> Verified
              </Badge>
            )}
          </div>
          {/* Hover quick actions */}
          <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-end gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
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
        </div>
        <div className={cn("flex flex-col gap-2 p-4", compact && "p-3")}>
          <h3 className="line-clamp-1 text-sm font-semibold text-stone-900">
            {title}
          </h3>
          {asset.aiSummary && (
            <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">
              {truncate(asset.aiSummary, 110)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
            {asset.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {asset.location}
              </span>
            )}
            {typeof asset.confidence === "number" && (
              <ConfidenceBar
                value={asset.confidence}
                className="min-w-[80px]"
              />
            )}
          </div>
          {asset.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {asset.tags.slice(0, 3).map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="bg-stone-100 text-stone-600"
                >
                  #{t}
                </Badge>
              ))}
              {asset.tags.length > 3 && (
                <span className="text-[11px] text-stone-400">
                  +{asset.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function MediaCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-0">
      <div className="aspect-video w-full animate-pulse bg-stone-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
      </div>
    </Card>
  );
}
