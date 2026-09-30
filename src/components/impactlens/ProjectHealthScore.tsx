"use client";

import * as React from "react";
import { Images, Sparkles, BadgeCheck, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { Project, MediaAsset } from "@/lib/types";

/**
 * ProjectHealthScore — computes a 0-100 health score for a project based on:
 *   - Asset volume (max 20 pts): more assets = richer evidence
 *   - Analysis coverage (max 25 pts): % of assets analyzed
 *   - Verification (max 25 pts): % of assets verified
 *   - SDG coverage (max 30 pts): how many of the project's declared SDGs (capped at 6 → 5 pts each)
 * Renders a donut gauge + breakdown bars + a qualitative label.
 */
export function ProjectHealthScore({
  project,
  assets,
}: {
  project: Project;
  assets: MediaAsset[];
}) {
  const score = React.useMemo(() => {
    const total = assets.length;
    const analyzed = assets.filter((a) => a.analyzedAt).length;
    const verified = assets.filter((a) => a.verified).length;
    const sdgs = (project.sdgGoals || "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const sdgCount = Math.min(sdgs.length, 6);

    // Asset volume: 0 → 0 pts, 1 → 5, 2 → 8, 3 → 12, 5 → 16, 10+ → 20
    const volumePts = total === 0 ? 0 : Math.min(20, Math.round(Math.log2(total + 1) * 6));
    // Analysis coverage: (analyzed/total) * 25
    const analysisPts = total === 0 ? 0 : Math.round((analyzed / total) * 25);
    // Verification: (verified/total) * 25
    const verificationPts = total === 0 ? 0 : Math.round((verified / total) * 25);
    // SDG coverage: sdgCount * 5 (max 30)
    const sdgPts = sdgCount * 5;

    const total_score = Math.min(100, volumePts + analysisPts + verificationPts + sdgPts);
    return {
      total: total_score,
      volume: volumePts,
      analysis: analysisPts,
      verification: verificationPts,
      sdg: sdgPts,
      assetCount: total,
      analyzedCount: analyzed,
      verifiedCount: verified,
      sdgCount,
    };
  }, [project, assets]);

  const label =
    score.total >= 80 ? "Excellent" :
    score.total >= 60 ? "Good" :
    score.total >= 40 ? "Fair" :
    score.total >= 20 ? "Needs work" : "Critical";

  const labelColor =
    score.total >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    score.total >= 60 ? "text-teal-700 bg-teal-50 border-teal-200" :
    score.total >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-rose-700 bg-rose-50 border-rose-200";

  const gaugeColor =
    score.total >= 80 ? "#059669" :
    score.total >= 60 ? "#0d9488" :
    score.total >= 40 ? "#d97706" :
    "#e11d48";

  const breakdown = [
    { label: "Asset volume", icon: <Images className="size-3" />, pts: score.volume, max: 20, color: "bg-emerald-500" },
    { label: "Analysis coverage", icon: <Sparkles className="size-3" />, pts: score.analysis, max: 25, color: "bg-teal-500" },
    { label: "Verification", icon: <BadgeCheck className="size-3" />, pts: score.verification, max: 25, color: "bg-amber-500" },
    { label: "SDG coverage", icon: <Target className="size-3" />, pts: score.sdg, max: 30, color: "bg-lime-500" },
  ];

  // Donut gauge: circle circumference = 2πr = 2π·42 ≈ 263.9
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score.total / 100) * circumference;

  if (score.assetCount === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">
          Project health score
        </h3>
        <EmptyState
          emoji="❤️"
          title="No assets yet"
          description="Add media to compute a project health score."
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900">
          Project health score
        </h3>
        <Badge variant="outline" className={labelColor}>{label}</Badge>
      </div>
      <div className="flex items-center gap-4">
        {/* Donut gauge */}
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#f5f5f4" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-stone-900">{score.total}</span>
            <span className="text-[10px] uppercase tracking-wide text-stone-400">/ 100</span>
          </div>
        </div>
        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="mb-0.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-stone-600">
                  {b.icon}
                  {b.label}
                </span>
                <span className="tabular-nums text-stone-500">{b.pts}/{b.max}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${b.color}`}
                  style={{ width: `${(b.pts / b.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
