"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Image as ImageIcon, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { ConfidenceBar } from "@/components/impactlens/ConfidenceBar";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useImpactStore } from "@/lib/store";
import { formatDate } from "@/lib/format";
import type { MediaAsset } from "@/lib/types";

/**
 * TimelineView — renders a vertical timeline of media assets grouped by
 * capture date (or createdAt fallback). Each entry shows the thumbnail,
 * caption, category, location, and a connecting line.
 */
export function TimelineView({ assets }: { assets: MediaAsset[] }) {
  const openAsset = useImpactStore((s) => s.openAsset);

  const grouped = React.useMemo(() => {
    const groups = new Map<string, MediaAsset[]>();
    for (const a of assets) {
      const d = a.captureDate ?? a.createdAt;
      const key = formatDate(d) ?? "Undated";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    // sort groups newest first
    return Array.from(groups.entries()).sort((a, b) => {
      const da = a[1][0].captureDate ?? a[1][0].createdAt;
      const db = b[1][0].captureDate ?? b[1][0].createdAt;
      return +new Date(db) - +new Date(da);
    });
  }, [assets]);

  if (assets.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">
          Media timeline
        </h3>
        <EmptyState
          emoji="📅"
          title="No media to timeline"
          description="Assets with capture dates will appear here grouped by day."
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">
            Media timeline
          </h3>
          <p className="text-xs text-stone-500">
            {assets.length} assets across {grouped.length} day{grouped.length === 1 ? "" : "s"}
          </p>
        </div>
        <ArrowDown className="size-4 text-stone-300" />
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-emerald-300 via-stone-200 to-transparent" />

        <ol className="space-y-5">
          {grouped.map(([dateLabel, items], gi) => (
            <motion.li
              key={dateLabel}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: gi * 0.05 }}
              className="relative pl-10"
            >
              {/* Date node on the line */}
              <div className="absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50 shadow-sm">
                <Calendar className="size-3.5 text-emerald-700" />
              </div>

              {/* Date label */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-900">{dateLabel}</span>
                <Badge variant="secondary" className="bg-stone-100 text-stone-600">
                  {items.length} asset{items.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {/* Assets for this date */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => openAsset(asset.id)}
                    className="group flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-2 text-left transition hover:border-emerald-300 hover:shadow-sm"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-stone-100">
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.title || asset.aiCaption || "media"}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute left-0 top-0 p-0.5">
                        <CategoryBadge category={asset.category} compact />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium text-stone-800">
                        {asset.title || asset.aiCaption || "Untitled media"}
                      </p>
                      {asset.location && (
                        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-stone-500">
                          <MapPin className="size-2.5" /> {asset.location}
                        </p>
                      )}
                      {typeof asset.confidence === "number" && (
                        <div className="mt-1">
                          <ConfidenceBar value={asset.confidence} compact />
                        </div>
                      )}
                      {asset.tags?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {asset.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[9px] text-stone-400">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
