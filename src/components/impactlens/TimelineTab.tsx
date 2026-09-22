"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Filter,
  Calendar,
  MapPin,
  Loader2,
  Images,
  TrendingUp,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-stone-900">
            <Clock className="size-7 text-emerald-600" />
            Timeline
          </h1>
          <p className="text-sm text-stone-500">
            Chronological view of all field media, grouped by capture date
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Images className="size-4" />
          Analyze new media
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Images className="size-4" />}
          label="Assets"
          value={assets.length}
          tint="emerald"
        />
        <StatCard
          icon={<Calendar className="size-4" />}
          label="Unique days"
          value={stats.days}
          tint="amber"
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Time span"
          value={stats.span}
          tint="teal"
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Avg confidence"
          value={`${Math.round(stats.avgConf * 100)}%`}
          tint="lime"
        />
      </div>

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

const TINTS: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  emerald: { ring: "ring-emerald-100", bg: "bg-emerald-50", text: "text-emerald-800", icon: "bg-emerald-600 text-white" },
  teal: { ring: "ring-teal-100", bg: "bg-teal-50", text: "text-teal-800", icon: "bg-teal-600 text-white" },
  amber: { ring: "ring-amber-100", bg: "bg-amber-50", text: "text-amber-800", icon: "bg-amber-500 text-white" },
  lime: { ring: "ring-lime-100", bg: "bg-lime-50", text: "text-lime-800", icon: "bg-lime-600 text-white" },
};

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tint: keyof typeof TINTS;
}) {
  const t = TINTS[tint];
  return (
    <Card className={cn("gap-0 p-4 ring-1", t.ring)}>
      <div className="flex items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg shadow-sm", t.icon)}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-stone-900 tabular-nums">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </Card>
  );
}
