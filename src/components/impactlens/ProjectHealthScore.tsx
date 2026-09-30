"use client";

import * as React from "react";
import type { Project, MediaAsset } from "@/lib/types";

/**
 * ProjectHealthScore — computes a 0-100 health score for a project based on:
 *   - Asset volume (max 20 pts): more assets = richer evidence
 *   - Analysis coverage (max 25 pts): % of assets analyzed
 *   - Verification (max 25 pts): % of assets verified
 *   - SDG coverage (max 30 pts): how many of the project's declared SDGs (capped at 6 → 5 pts each)
 * Renders the total, a qualitative label and one neutral bar row per component.
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

  const breakdown = [
    { label: "Asset volume", pts: score.volume, max: 20 },
    { label: "Analysis coverage", pts: score.analysis, max: 25 },
    { label: "Verification", pts: score.verification, max: 25 },
    { label: "SDG coverage", pts: score.sdg, max: 30 },
  ];

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-stone-900">Health</h3>
        {score.assetCount > 0 && (
          <span className="text-sm text-stone-500">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{score.total}</span>
            <span className="tabular-nums"> / 100</span> · {label}
          </span>
        )}
      </div>
      {score.assetCount === 0 ? (
        <p className="border-y border-stone-200 py-4 text-sm text-stone-500">Add media to score this project.</p>
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {breakdown.map((b) => (
            <li key={b.label} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3 py-2 text-sm">
              <span className="text-stone-700">{b.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <span className="block h-full rounded-full bg-stone-500" style={{ width: `${(b.pts / b.max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-stone-600">
                {b.pts}/{b.max}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
