"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Images, Sparkles, BadgeCheck, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useLeaderboard } from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";

/**
 * ProjectLeaderboard — ranks all projects by a composite health score.
 * Shows top N projects with rank medals, score gauges, and quick stats.
 * Clicking a row opens the Projects tab.
 */
export function ProjectLeaderboard({ limit = 5 }: { limit?: number }) {
  const lbQ = useLeaderboard(limit);
  const setTab = useImpactStore((s) => s.setTab);

  if (lbQ.isLoading) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Trophy className="size-4 text-amber-500" />
          Project leaderboard
        </h3>
        <div className="space-y-2">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-stone-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (lbQ.isError) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Trophy className="size-4 text-amber-500" />
          Project leaderboard
        </h3>
        <EmptyState
          emoji="⚠️"
          title="Couldn't load leaderboard"
          description={lbQ.error instanceof Error ? lbQ.error.message : "Unknown error"}
        />
      </Card>
    );
  }

  const entries = lbQ.data ?? [];
  if (entries.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Trophy className="size-4 text-amber-500" />
          Project leaderboard
        </h3>
        <EmptyState
          emoji="🏆"
          title="No projects yet"
          description="Create projects with media to see them ranked here."
          actionLabel="Go to Projects"
          onAction={() => setTab("projects")}
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Trophy className="size-4 text-amber-500" />
            Project leaderboard
          </h3>
          <p className="text-xs text-stone-500">Top {entries.length} by composite health score</p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {entries.length} ranked
        </Badge>
      </div>
      <ol className="space-y-1.5">
        {entries.map((entry, i) => (
          <motion.li
            key={entry.project.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <button
              onClick={() => setTab("projects")}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40",
                i === 0
                  ? "border-amber-200 bg-amber-50/50"
                  : i === 1
                    ? "border-stone-200 bg-stone-50/50"
                    : i === 2
                      ? "border-orange-100 bg-orange-50/30"
                      : "border-stone-100 bg-white"
              )}
            >
              {/* Rank medal */}
              <div className="flex w-8 shrink-0 items-center justify-center">
                {i === 0 ? (
                  <Trophy className="size-5 text-amber-500" />
                ) : i === 1 ? (
                  <Medal className="size-5 text-stone-400" />
                ) : i === 2 ? (
                  <Medal className="size-5 text-orange-400" />
                ) : (
                  <span className="text-sm font-bold tabular-nums text-stone-400">{entry.rank}</span>
                )}
              </div>

              {/* Project info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{entry.project.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500">
                  {entry.project.category && <CategoryBadge category={entry.project.category} compact />}
                  <span className="flex items-center gap-0.5">
                    <Images className="size-2.5" />
                    {entry.assetCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Sparkles className="size-2.5" />
                    {entry.analyzedCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <BadgeCheck className="size-2.5" />
                    {entry.verifiedCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Target className="size-2.5" />
                    {entry.sdgCount} SDG{entry.sdgCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Score gauge */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    entry.score >= 80 ? "text-emerald-700" :
                    entry.score >= 60 ? "text-teal-700" :
                    entry.score >= 40 ? "text-amber-700" :
                    "text-rose-600"
                  )}>
                    {entry.score}
                  </p>
                  <p className="text-[8px] uppercase tracking-wide text-stone-400">/100</p>
                </div>
                {/* Mini bar */}
                <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-stone-100 sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      entry.score >= 80 ? "bg-emerald-500" :
                      entry.score >= 60 ? "bg-teal-500" :
                      entry.score >= 40 ? "bg-amber-500" :
                      "bg-rose-400"
                    )}
                    style={{ width: `${entry.score}%` }}
                  />
                </div>
              </div>
            </button>
          </motion.li>
        ))}
      </ol>
    </Card>
  );
}
