"use client";

import * as React from "react";
import { Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { Project } from "@/lib/types";

// All 17 UN SDG goals with their colors and short labels.
const SDG_INFO: Record<number, { label: string; color: string }> = {
  1: { label: "No Poverty", color: "#E5243B" },
  2: { label: "Zero Hunger", color: "#DDA63A" },
  3: { label: "Good Health", color: "#4C9F38" },
  4: { label: "Quality Education", color: "#C5192D" },
  5: { label: "Gender Equality", color: "#FF3A21" },
  6: { label: "Clean Water", color: "#26BDE2" },
  7: { label: "Clean Energy", color: "#FCC30B" },
  8: { label: "Decent Work", color: "#A21942" },
  9: { label: "Innovation", color: "#FD6925" },
  10: { label: "Reduced Inequalities", color: "#DD1367" },
  11: { label: "Sustainable Cities", color: "#FD9D24" },
  12: { label: "Responsible Consumption", color: "#BF8B2E" },
  13: { label: "Climate Action", color: "#3F7E44" },
  14: { label: "Life Below Water", color: "#0A97D9" },
  15: { label: "Life on Land", color: "#56C02B" },
  16: { label: "Peace & Justice", color: "#00689D" },
  17: { label: "Partnerships", color: "#19486A" },
};

/**
 * SDGCoverage — visualizes which UN SDG goals are covered by the project
 * portfolio. Renders all 17 goals as colored chips; goals covered by ≥1
 * project are highlighted, uncovered ones are muted.
 */
export function SDGCoverage({ projects }: { projects: Project[] }) {
  const coverage = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const p of projects) {
      if (!p.sdgGoals) continue;
      const goals = p.sdgGoals.split(/[,;]/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 17);
      for (const g of new Set(goals)) {
        map.set(g, (map.get(g) ?? 0) + 1);
      }
    }
    return map;
  }, [projects]);

  const coveredCount = coverage.size;
  const totalGoals = 17;

  if (projects.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Target className="size-4 text-emerald-600" />
          SDG coverage
        </h3>
        <EmptyState
          emoji="🎯"
          title="No projects yet"
          description="Projects with UN SDG goals will appear here."
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Target className="size-4 text-emerald-600" />
            UN SDG coverage
          </h3>
          <p className="text-xs text-stone-500">
            {coveredCount} of {totalGoals} goals covered across {projects.length} projects
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-emerald-700">
            {Math.round((coveredCount / totalGoals) * 100)}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-stone-400">coverage</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
        {Array.from({ length: 17 }, (_, i) => i + 1).map((goal) => {
          const info = SDG_INFO[goal];
          const count = coverage.get(goal) ?? 0;
          const isCovered = count > 0;
          return (
            <div
              key={goal}
              title={`SDG ${goal}: ${info.label}${isCovered ? ` (${count} project${count === 1 ? "" : "s"})` : " — not covered"}`}
              className="group relative flex flex-col items-center justify-center rounded-md p-1.5 text-center transition"
              style={{
                background: isCovered ? info.color : "#f5f5f4",
                opacity: isCovered ? 1 : 0.5,
              }}
            >
              <span
                className="text-[11px] font-bold leading-none"
                style={{ color: isCovered ? "#fff" : "#a8a29e" }}
              >
                {goal}
              </span>
              {isCovered && count > 1 && (
                <span className="mt-0.5 text-[8px] font-medium leading-none text-white/80">
                  ×{count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from(coverage.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([goal]) => (
            <Badge
              key={goal}
              variant="outline"
              className="border-stone-200 bg-stone-50 text-[10px] text-stone-600"
            >
              {goal}. {SDG_INFO[goal]?.label ?? `Goal ${goal}`}
            </Badge>
          ))}
      </div>
    </Card>
  );
}
