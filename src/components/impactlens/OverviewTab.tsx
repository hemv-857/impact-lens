"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import {
  Sparkles,
  FileText,
  Images,
  FolderKanban,
  BadgeCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Database,
  Loader2,
  Leaf,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/impactlens/ProjectCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { AnimatedCounter } from "@/components/impactlens/AnimatedCounter";
import { GeoDistribution } from "@/components/impactlens/GeoDistribution";
import { ConfidenceDistribution } from "@/components/impactlens/ConfidenceDistribution";
import { SDGCoverage } from "@/components/impactlens/SDGCoverage";
import { TopTagsCloud } from "@/components/impactlens/TopTagsCloud";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import {
  useAnalytics,
  useBulkMediaAction,
  useMedia,
  useProjects,
  useSeedData,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/format";
import type { Analytics } from "@/lib/types";

const CATEGORY_BAR_COLORS = [
  "#059669",
  "#d97706",
  "#0d9488",
  "#65a30d",
  "#16a34a",
  "#ea580c",
  "#78716c",
  "#0891b2",
  "#e11d48",
  "#ca8a04",
  "#a8a29e",
];

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  analyze: <Sparkles className="size-3.5 text-emerald-600" />,
  upload: <Images className="size-3.5 text-amber-600" />,
  report: <FileText className="size-3.5 text-teal-600" />,
  compare: <TrendingUp className="size-3.5 text-lime-600" />,
  project: <FolderKanban className="size-3.5 text-stone-600" />,
  default: <Activity className="size-3.5 text-stone-500" />,
};

export function OverviewTab() {
  const analyticsQ = useAnalytics();
  const projectsQ = useProjects();
  const mediaQ = useMedia({ limit: 200 });
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const openAsset = useImpactStore((s) => s.openAsset);
  const { toast } = useToast();
  const seed = useSeedData();
  const bulk = useBulkMediaAction();

  const recentUploads = React.useMemo(
    () =>
      (mediaQ.data ?? [])
        .slice()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8),
    [mediaQ.data]
  );

  const onVerifyAllAnalyzed = async () => {
    const analyzed = (mediaQ.data ?? []).filter((a) => a.analyzedAt && !a.verified);
    if (analyzed.length === 0) {
      toast({ title: "Nothing to verify", description: "All analyzed assets are already verified." });
      return;
    }
    try {
      const r = await bulk.mutateAsync({
        ids: analyzed.map((a) => a.id),
        action: "verify",
      });
      toast({
        title: "Assets verified",
        description: `${r.processed} analyzed asset${r.processed === 1 ? "" : "s"} marked as verified evidence.`,
      });
    } catch (e) {
      toast({
        title: "Verification failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const unverifiedAnalyzed = (mediaQ.data ?? []).filter((a) => a.analyzedAt && !a.verified).length;

  const analytics = analyticsQ.data;
  const isEmpty = analytics ? analytics.totalAssets === 0 : false;

  const onSeed = async () => {
    try {
      toast({
        title: "Seeding sample data",
        description: "Generating field media + AI analysis — 1–2 minutes.",
      });
      const r = await seed.mutateAsync();
      toast({
        title: "Sample data loaded",
        description: `${r.count} items created.`,
      });
    } catch (e) {
      toast({
        title: "Seeding failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="hero-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-10"
      >
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-3 border-white/20 bg-white/10 text-emerald-50 backdrop-blur">
            <Leaf className="size-3" /> AI-Powered Impact Media
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Turn field media into measurable impact.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            ImpactLens ingests your sustainability photos and videos, uses
            computer-vision AI to extract intelligence, organizes evidence by
            project, and produces donor-ready reports & campaigns.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-white text-emerald-800 hover:bg-emerald-50"
            >
              <Sparkles className="size-4" />
              Analyze new media
            </Button>
            <Button
              onClick={() => setTab("reports")}
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              <FileText className="size-4" />
              Generate report
            </Button>
          </div>
        </div>
        {/* Decorative leaf */}
        <Leaf
          className="absolute -right-4 -top-4 size-44 rotate-12 text-white/10"
          aria-hidden
        />
      </motion.section>

      {/* Empty state CTA */}
      {isEmpty && !analyticsQ.isLoading && (
        <Card className="border-dashed border-emerald-200 bg-emerald-50/50 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                Your library is empty
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Load sample field media with full AI analysis pre-populated to
                explore every feature in seconds.
              </p>
            </div>
            <Button
              onClick={onSeed}
              disabled={seed.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {seed.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Database className="size-4" />
              )}
              Load sample data
            </Button>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Platform at a glance
            </h2>
            <p className="text-sm text-stone-500">
              Real-time aggregates across your media library
            </p>
          </div>
        </div>
        {analyticsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              icon={<Images className="size-4" />}
              label="Total assets"
              value={analytics.totalAssets}
              tint="emerald"
              animate
            />
            <KpiCard
              icon={<Sparkles className="size-4" />}
              label="Analyzed"
              value={analytics.analyzedAssets}
              tint="teal"
              animate
            />
            <KpiCard
              icon={<FolderKanban className="size-4" />}
              label="Active projects"
              value={analytics.activeProjects}
              tint="amber"
              animate
            />
            <KpiCard
              icon={<FileText className="size-4" />}
              label="Reports"
              value={analytics.totalReports}
              tint="lime"
              animate
            />
            <KpiCard
              icon={<BadgeCheck className="size-4" />}
              label="Verified"
              value={analytics.verifiedAssets}
              tint="green"
              animate
            />
            <KpiCard
              icon={<TrendingUp className="size-4" />}
              label="Avg impact score"
              value={formatAvgImpact(analytics)}
              tint="orange"
            />
          </div>
        ) : (
          <EmptyState
            title="Couldn't load analytics"
            description="Check that /api/analytics is available."
          />
        )}
      </section>

      {/* Two-col: chart + activity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 gap-0 p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                Media by category
              </h3>
              <p className="text-xs text-stone-500">
                Distribution of analyzed assets
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700"
              onClick={() => setTab("library")}
            >
              View library <ArrowRight className="size-3.5" />
            </Button>
          </div>
          {analyticsQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <CategoryChart analytics={analytics} />
          )}
        </Card>

        <Card className="lg:col-span-2 gap-0 p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-900">
            Recent activity
          </h3>
          {analyticsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : analytics?.recentActivity?.length ? (
            <ul className="scrollbar-thin max-h-80 space-y-1 overflow-y-auto pr-1">
              {analytics.recentActivity
                .slice()
                .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                .map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-md p-2 transition hover:bg-stone-50"
                    title={a.label}
                  >
                    <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-stone-100">
                      {ACTIVITY_ICON[a.kind] ?? ACTIVITY_ICON.default}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-800" title={a.label}>{a.label}</p>
                      <p className="text-[11px] text-stone-400">
                        {timeAgo(a.at)} · {a.kind}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState
              emoji="📭"
              title="No activity yet"
              description="Analyze media or generate reports to populate this feed."
            />
          )}
        </Card>
      </section>

      {/* Insights row: geographic + confidence distribution */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeoDistribution projects={projectsQ.data ?? []} />
        <ConfidenceDistribution assets={mediaQ.data ?? []} />
      </section>

      {/* SDG coverage + Top tags cloud */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SDGCoverage projects={projectsQ.data ?? []} />
        <TopTagsCloud assets={mediaQ.data ?? []} />
      </section>

      {/* Recent uploads strip + quick verify */}
      {recentUploads.length > 0 && (
        <section>
          <Card className="gap-0 p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                  <Clock className="size-4 text-emerald-600" />
                  Recent uploads
                </h3>
                <p className="text-xs text-stone-500">Latest media added to your library</p>
              </div>
              <div className="flex items-center gap-2">
                {unverifiedAnalyzed > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onVerifyAllAnalyzed}
                    disabled={bulk.isPending}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {bulk.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-3.5" />
                    )}
                    Verify {unverifiedAnalyzed} analyzed
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTab("library")}
                  className="text-emerald-700"
                >
                  View all <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
              {recentUploads.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openAsset(a.id)}
                  className="group relative w-40 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white text-left transition hover:border-emerald-300 hover:shadow-md"
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
                    {a.verified && (
                      <div className="absolute right-1 top-1">
                        <Badge variant="outline" className="bg-white/90 text-emerald-700 border-emerald-200 px-1 py-0 text-[9px]">
                          <BadgeCheck className="size-2.5" />
                        </Badge>
                      </div>
                    )}
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
          </Card>
        </section>
      )}

      {/* Active projects preview */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Active projects
            </h2>
            <p className="text-sm text-stone-500">
              Top projects by activity — click to open
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTab("projects")}
          >
            All projects <ArrowRight className="size-3.5" />
          </Button>
        </div>
        {projectsQ.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : projectsQ.data && projectsQ.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsQ.data
              .filter((p) => p.status === "active")
              .slice(0, 3)
              .map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => setTab("projects")}
                />
              ))}
          </div>
        ) : (
          <EmptyState
            emoji="🌍"
            title="No projects yet"
            description="Create your first project to organize media, comparisons, and reports."
            actionLabel="Create project"
            onAction={() => setTab("projects")}
          />
        )}
      </section>
    </div>
  );
}

function formatAvgImpact(a: Analytics): string {
  // Defensive: backend may expose avgImpactScore; otherwise derive a proxy.
  const any = a as unknown as { avgImpactScore?: number };
  if (typeof any.avgImpactScore === "number") {
    return `${Math.round(any.avgImpactScore * 100)}%`;
  }
  if (a.totalAssets === 0) return "—";
  const ratio = a.verifiedAssets / a.totalAssets;
  return `${Math.round(ratio * 100)}%`;
}

function CategoryChart({ analytics }: { analytics?: Analytics }) {
  const data = React.useMemo(() => {
    if (!analytics?.byCategory) return [];
    return Object.entries(analytics.byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  if (!analytics || data.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="No category data yet"
        description="Analyze media to populate the category breakdown."
      />
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#44403c" }}
            axisLine={false}
            tickLine={false}
            width={104}
          />
          <RTooltip
            cursor={{ fill: "#f5f5f4" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e7e5e4",
              fontSize: 12,
              background: "#ffffff",
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.map((d, i) => (
          <span
            key={d.name}
            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600"
          >
            <span
              className="size-2 rounded-full"
              style={{
                background:
                  CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length],
              }}
            />
            {d.name}: {d.value}
          </span>
        ))}
      </div>
      <span className="sr-only">Max value: {max}</span>
    </div>
  );
}

const TINTS: Record<
  string,
  { ring: string; bg: string; text: string; icon: string }
> = {
  emerald: {
    ring: "ring-emerald-100",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    icon: "bg-emerald-600 text-white",
  },
  teal: {
    ring: "ring-teal-100",
    bg: "bg-teal-50",
    text: "text-teal-800",
    icon: "bg-teal-600 text-white",
  },
  amber: {
    ring: "ring-amber-100",
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: "bg-amber-500 text-white",
  },
  lime: {
    ring: "ring-lime-100",
    bg: "bg-lime-50",
    text: "text-lime-800",
    icon: "bg-lime-600 text-white",
  },
  green: {
    ring: "ring-green-100",
    bg: "bg-green-50",
    text: "text-green-800",
    icon: "bg-green-600 text-white",
  },
  orange: {
    ring: "ring-orange-100",
    bg: "bg-orange-50",
    text: "text-orange-800",
    icon: "bg-orange-500 text-white",
  },
};

function KpiCard({
  icon,
  label,
  value,
  tint,
  animate,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tint: keyof typeof TINTS;
  animate?: boolean;
}) {
  const t = TINTS[tint];
  const isNumeric = typeof value === "number";
  return (
    <Card className={cn("gap-0 p-4 ring-1 transition hover:shadow-md", t.ring)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg shadow-sm",
            t.icon
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
        {isNumeric && animate ? (
          <AnimatedCounter value={value} />
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-stone-500">{label}</p>
    </Card>
  );
}
