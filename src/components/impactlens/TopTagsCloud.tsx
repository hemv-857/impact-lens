"use client";

import * as React from "react";
import { Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { MediaAsset } from "@/lib/types";

/**
 * TopTagsCloud — aggregates tags across all media assets and renders them
 * as a weighted word-cloud-style list. Tag font-size + color intensity scale
 * with frequency. Earth-tone color palette (emerald → amber → teal).
 */
export function TopTagsCloud({ assets }: { assets: MediaAsset[] }) {
  const tags = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      if (!a.tags) continue;
      for (const t of a.tags) {
        const key = t.trim().toLowerCase();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
  }, [assets]);

  if (tags.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Hash className="size-4 text-emerald-600" />
          Top tags
        </h3>
        <EmptyState
          emoji="🏷️"
          title="No tags yet"
          description="Analyzed media with tags will populate this tag cloud."
        />
      </Card>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.count));
  const minCount = Math.min(...tags.map((t) => t.count));
  const range = Math.max(1, maxCount - minCount);

  // Earth-tone color tiers by frequency rank
  const TAG_COLORS = [
    "text-emerald-700 bg-emerald-50 border-emerald-200",
    "text-amber-700 bg-amber-50 border-amber-200",
    "text-teal-700 bg-teal-50 border-teal-200",
    "text-lime-700 bg-lime-50 border-lime-200",
    "text-orange-700 bg-orange-50 border-orange-200",
    "text-stone-600 bg-stone-50 border-stone-200",
  ];

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Hash className="size-4 text-emerald-600" />
            Top tags
          </h3>
          <p className="text-xs text-stone-500">
            {tags.length} unique tags · {tags.reduce((s, t) => s + t.count, 0)} total occurrences
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-emerald-700">
            #{tags[0]?.tag}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-stone-400">most used</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t, i) => {
          // Scale font-size: smallest tags 11px, largest 18px
          const sizeRatio = (t.count - minCount) / range;
          const fontSize = 11 + sizeRatio * 7; // 11px to 18px
          const colorIdx = i % TAG_COLORS.length;
          const isTop = i < 3;
          return (
            <span
              key={t.tag}
              title={`${t.tag} — ${t.count} asset${t.count === 1 ? "" : "s"}`}
              className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-medium transition hover:scale-105 ${TAG_COLORS[colorIdx]} ${isTop ? "ring-1 ring-emerald-200" : ""}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              <span className="text-stone-400">#</span>
              {t.tag}
              {t.count > 1 && (
                <span className="ml-0.5 rounded-full bg-white/70 px-1 text-[9px] tabular-nums text-stone-500">
                  {t.count}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
