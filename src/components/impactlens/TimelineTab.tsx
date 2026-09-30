"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Filter,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimelineView } from "@/components/impactlens/TimelineView";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useImpactStore } from "@/lib/store";
import { useMedia, useProjects } from "@/components/impactlens/impact-hooks";
import type { MediaAsset } from "@/lib/types";

const CATEGORIES = [
  "all",
  "reforestation",
  "solar",
  "water",
  "education",
  "cleanup",
  "agriculture",
  "infrastructure",
  "conservation",
  "community",
  "energy",
];

export function TimelineTab() {
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const [projectId, setProjectId] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"newest" | "oldest">("newest");

  const projectsQ = useProjects();
  const mediaQ = useMedia({
    limit: 200,
    projectId: projectId !== "all" ? projectId : undefined,
    category: category !== "all" ? category : undefined,
    sort: sortDir,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const assets = mediaQ.data ?? [];

  // Stats
  const stats = React.useMemo(() => {
    if (assets.length === 0) return { days: 0, span: "—", avgConf: 0, analyzed: 0 };
    const dates = assets.map((a) => new Date(a.captureDate ?? a.createdAt));
    const minDate = new Date(Math.min(...dates.map((d) => +d)));
    const maxDate = new Date(Math.max(...dates.map((d) => +d)));
    const dayMs = 1000 * 60 * 60 * 24;
    const daySpan = Math.round((+maxDate - +minDate) / dayMs);
    const uniqueDates = new Set(assets.map((a) => (a.captureDate ?? a.createdAt).slice(0, 10)));
    const confs = assets.filter((a) => typeof a.confidence === "number").map((a) => a.confidence!);
    const avgConf = confs.length > 0 ? confs.reduce((s, c) => s + c, 0) / confs.length : 0;
    return {
      days: uniqueDates.size,
      span: daySpan === 0 ? "same day" : `${daySpan} day${daySpan === 1 ? "" : "s"}`,
      avgConf,
      analyzed: assets.filter((a) => a.analyzedAt).length,
    };
  }, [assets]);

  return (
    <div className="space-y-5">
      {/* Heading */}
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {(
          [
            ["Assets", assets.length],
            ["Unique days", stats.days],
            ["Time span", stats.span],
            ["Avg confidence", `${Math.round(stats.avgConf * 100)}%`],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-900">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Filter bar */}
      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectsQ.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c === "all" ? "All categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Order</Label>
            <Select value={sortDir} onValueChange={(v) => setSortDir(v as "newest" | "oldest")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-1.5">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <span className="pb-2 text-xs text-stone-400">→</span>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
              />
            </div>
          </div>

          {(projectId !== "all" || category !== "all" || dateFrom || dateTo || sortDir !== "newest") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProjectId("all");
                setCategory("all");
                setDateFrom("");
                setDateTo("");
                setSortDir("newest");
              }}
            >
              <Filter className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
          <Filter className="size-3.5" />
          {mediaQ.isLoading
            ? "Loading…"
            : `${assets.length} asset${assets.length === 1 ? "" : "s"} across ${stats.days} day${stats.days === 1 ? "" : "s"}`}
        </div>
      </Card>

      {/* Timeline */}
      {mediaQ.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-stone-100" />
          ))}
        </div>
      ) : mediaQ.isError ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load timeline"
          description={mediaQ.error instanceof Error ? mediaQ.error.message : "Unknown error"}
          actionLabel="Retry"
          onAction={() => mediaQ.refetch()}
        />
      ) : assets.length === 0 ? (
        <EmptyState
          emoji="📅"
          title="No media in timeline"
          description="Adjust filters or upload field media to populate the timeline."
          actionLabel="Analyze new media"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <TimelineView assets={assets} />
      )}
    </div>
  );
}
