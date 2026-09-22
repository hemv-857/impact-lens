"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { MediaAsset } from "@/lib/types";

/**
 * ConfidenceDistribution — donut chart bucketing analyzed assets by their
 * AI confidence score: High (≥0.75), Medium (0.5–0.75), Low (<0.5).
 */
export function ConfidenceDistribution({ assets }: { assets: MediaAsset[] }) {
  const buckets = React.useMemo(() => {
    const analyzed = assets.filter((a) => a.analyzedAt && typeof a.confidence === "number");
    const high = analyzed.filter((a) => (a.confidence ?? 0) >= 0.75).length;
    const medium = analyzed.filter((a) => {
      const c = a.confidence ?? 0;
      return c >= 0.5 && c < 0.75;
    }).length;
    const low = analyzed.filter((a) => (a.confidence ?? 0) < 0.5).length;
    const total = analyzed.length;
    return { high, medium, low, total, unanalyzed: assets.length - analyzed.length };
  }, [assets]);

  const data = [
    { name: "High (≥75%)", value: buckets.high, color: "#059669" },
    { name: "Medium (50–75%)", value: buckets.medium, color: "#d97706" },
    { name: "Low (<50%)", value: buckets.low, color: "#e11d48" },
  ].filter((d) => d.value > 0);

  if (buckets.total === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Gauge className="size-4 text-emerald-600" />
          Confidence distribution
        </h3>
        <EmptyState
          emoji="🎯"
          title="No analyzed assets"
          description="Once media is analyzed, confidence buckets will appear here."
        />
      </Card>
    );
  }

  const avgConfidence =
    assets
      .filter((a) => typeof a.confidence === "number")
      .reduce((sum, a) => sum + (a.confidence ?? 0), 0) / Math.max(buckets.total, 1);

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Gauge className="size-4 text-emerald-600" />
            Confidence distribution
          </h3>
          <p className="text-xs text-stone-500">{buckets.total} analyzed · avg {Math.round(avgConfidence * 100)}%</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <RTooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                  fontSize: 12,
                  background: "#ffffff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-stone-900">
              {Math.round(avgConfidence * 100)}%
            </span>
            <span className="text-[10px] uppercase tracking-wide text-stone-400">avg</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2">
          {data.map((d) => {
            const pct = buckets.total > 0 ? Math.round((d.value / buckets.total) * 100) : 0;
            return (
              <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 text-stone-700">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="tabular-nums text-stone-500">
                  {d.value} <span className="text-stone-400">({pct}%)</span>
                </span>
              </li>
            );
          })}
          {buckets.unanalyzed > 0 && (
            <li className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2 text-xs text-stone-400">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-stone-200" />
                Pending analysis
              </span>
              <span className="tabular-nums">{buckets.unanalyzed}</span>
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
