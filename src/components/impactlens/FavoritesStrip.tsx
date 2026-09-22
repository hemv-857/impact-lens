"use client";

import * as React from "react";
import { Star, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useMedia } from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";

/**
 * FavoritesStrip — a horizontal carousel of favorited media assets.
 * Shown on the Overview dashboard as a quick-access strip.
 */
export function FavoritesStrip() {
  const favQ = useMedia({ favorite: true, limit: 12 });
  const openAsset = useImpactStore((s) => s.openAsset);
  const setTab = useImpactStore((s) => s.setTab);

  const favorites = favQ.data ?? [];

  if (favQ.isLoading) {
    return null; // don't show skeleton for an optional strip
  }

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Star className="size-4 text-amber-500 fill-amber-400" />
            Favorites
          </h3>
          <p className="text-xs text-stone-500">
            {favorites.length > 0
              ? `${favorites.length} bookmarked asset${favorites.length === 1 ? "" : "s"}`
              : "Star your best evidence for quick access"}
          </p>
        </div>
        {favorites.length > 0 && (
          <button
            onClick={() => setTab("library")}
            className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"
          >
            View in library <ArrowRight className="size-3" />
          </button>
        )}
      </div>
      {favorites.length === 0 ? (
        <EmptyState
          emoji="⭐"
          title="No favorites yet"
          description="Click the star icon on any media card to bookmark it here."
          actionLabel="Browse media"
          onAction={() => setTab("library")}
        />
      ) : (
        <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
          {favorites.map((a) => (
            <button
              key={a.id}
              onClick={() => openAsset(a.id)}
              className="group relative w-44 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white text-left transition hover:border-amber-300 hover:shadow-md"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
                <img
                  src={a.thumbnailUrl || a.url}
                  alt={a.title || a.aiCaption || "media"}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute left-1 top-1">
                  <CategoryBadge category={a.category} compact />
                </div>
                <div className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
                  <Star className="size-3 fill-current" />
                </div>
              </div>
              <div className="p-2">
                <p className="line-clamp-1 text-[11px] font-medium text-stone-800">
                  {a.title || a.aiCaption || "Untitled"}
                </p>
                <p className="mt-0.5 text-[9px] text-stone-400">{timeAgo(a.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
