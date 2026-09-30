"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgs } from "@/lib/api";
import type { ImpactTab } from "@/lib/store";
import { Thumb } from "@/components/impactlens/Thumb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceMark, evidenceState } from "@/components/impactlens/EvidenceMark";
import {
  useAnalytics,
  useAnalyzeMedia,
  useBulkMediaAction,
  useMedia,
  useProjects,
  useReports,
  useSeedData,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { accessionNo, timeAgo } from "@/lib/format";
import type { MediaAsset } from "@/lib/types";

const QUEUE_SIZE = 8;

export function OverviewTab() {
  const analyticsQ = useAnalytics();
  const mediaQ = useMedia({ limit: 200 });
  const projectsQ = useProjects();
  const reportsQ = useReports();
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const setOpenReportId = useImpactStore((s) => s.setOpenReportId);
  const setOpenProjectId = useImpactStore((s) => s.setOpenProjectId);
  const { toast } = useToast();
  const seed = useSeedData();
  const bulk = useBulkMediaAction();

  const assets = React.useMemo(
    () => (mediaQ.data ?? []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [mediaQ.data]
  );
  const unverified = assets.filter((a) => !a.verified);
  const verifiable = unverified.filter((a) => a.analyzedAt);
  const queue = unverified.slice(0, QUEUE_SIZE);
  // Fill the column with the newest verified accessions when the queue is short.
  const recent = assets.filter((a) => a.verified).slice(0, Math.max(3, QUEUE_SIZE - queue.length));
  const analytics = analyticsQ.data;
  const loading = analyticsQ.isLoading || mediaQ.isLoading;
  const isEmpty = !loading && assets.length === 0;

  const verify = async (ids: string[]) => {
    try {
      const r = await bulk.mutateAsync({ ids, action: "verify" });
      toast({ title: `${r.processed} asset${r.processed === 1 ? "" : "s"} verified` });
    } catch (e) {
      toast({
        title: "Verification failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const onSeed = async () => {
    try {
      toast({ title: "Loading sample data", description: "This takes a minute or two." });
      const r = await seed.mutateAsync();
      toast({ title: `${r.count} sample assets added` });
    } catch (e) {
      toast({
        title: "Sample data failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  if (isEmpty) {
    return (
      <section className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Start your evidence register
        </h1>
        <p className="mx-auto mt-2 max-w-md text-stone-600">
          Add photos or video from the field. Each one is captioned, tagged and scored, ready to cite in a report.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="size-4" />
            Add media
          </Button>
          <Button variant="outline" onClick={onSeed} disabled={seed.isPending}>
            {seed.isPending ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            Load sample data
          </Button>
        </div>
      </section>
    );
  }


  const activeProjects = (projectsQ.data ?? []).filter((p) => p.status === "active").slice(0, 5);
  // Per-project evidence: how much of each project's media is verified, and a face for it.
  const byProject = new Map<string, { total: number; verified: number; cover?: MediaAsset }>();
  for (const a of assets) {
    if (!a.projectId) continue;
    const e = byProject.get(a.projectId) ?? { total: 0, verified: 0 };
    e.total++;
    if (a.verified) e.verified++;
    e.cover ??= a;
    byProject.set(a.projectId, e);
  }
  const latestReports = (reportsQ.data ?? [])
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const [featured, ...restQueue] = queue;
  const oldest = unverified[unverified.length - 1];
  // A landscape frame reads as a place behind the headline; fall back to any verified photo.
  const heroAsset =
    assets.find((a) => a.verified && a.width && a.height && a.width > a.height * 1.2) ??
    assets.find((a) => a.verified);

  return (
    <div className="space-y-8">
      <HomeHero
        loading={loading}
        fallbackPhoto={heroAsset?.url}
        stats={[
          { key: "assets", label: "Assets", value: analytics?.totalAssets, dates: assets.map((a) => a.createdAt), tab: "library" },
          { key: "review", label: "To review", value: loading ? undefined : unverified.length, dates: unverified.map((a) => a.createdAt), tab: "library" },
          { key: "verified", label: "Verified", value: analytics?.verifiedAssets, dates: assets.filter((a) => a.verified).map((a) => a.createdAt), tab: "library" },
          { key: "projects", label: "Projects", value: projectsQ.data?.length, dates: (projectsQ.data ?? []).map((p) => p.createdAt), tab: "projects" },
          { key: "reports", label: "Reports", value: reportsQ.data?.length, dates: (reportsQ.data ?? []).map((r) => r.createdAt), tab: "reports" },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Review queue: the high-dwell area */}
        <div className="space-y-8 lg:col-span-8">
          {(loading || queue.length > 0) && (
            <section aria-labelledby="queue-h" className="@container rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 id="queue-h" className="flex items-center gap-2.5 text-lg font-semibold text-stone-900">
                  Awaiting review
                  <span className="rounded-md bg-emerald-50 px-2 text-sm font-semibold tabular-nums leading-6 text-emerald-700">
                    {unverified.length}
                  </span>
                </h2>
                {verifiable.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => verify(verifiable.map((a) => a.id))}
                    disabled={bulk.isPending}
                    className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {bulk.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Verify all {verifiable.length} analyzed
                  </Button>
                )}
              </div>
              {loading ? (
                <RowsSkeleton />
              ) : (
                <>
                  {featured && <FeaturedReview asset={featured} onVerify={() => verify([featured.id])} busy={bulk.isPending} />}
                  {restQueue.length > 0 && (
                    <ol className="mt-4 divide-y divide-stone-200 border-t border-stone-200">
                      {restQueue.map((a) => (
                        <QueueRow key={a.id} asset={a} onVerify={() => verify([a.id])} busy={bulk.isPending} />
                      ))}
                    </ol>
                  )}
                </>
              )}
              {unverified.length > QUEUE_SIZE && (
                <MoreLink onClick={() => setTab("library")}>All {unverified.length} in the library</MoreLink>
              )}
            </section>
          )}

          {!loading && recent.length > 0 && (
            <section aria-labelledby="recent-h" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <SideHeading id="recent-h" onMore={() => setTab("library")}>
                {queue.length === 0 ? "Latest accessions" : "Recently verified"}
              </SideHeading>
              <ol className="divide-y divide-stone-200">
                {recent.map((a) => (
                  <QueueRow key={a.id} asset={a} onVerify={() => verify([a.id])} busy={bulk.isPending} />
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section aria-labelledby="projects-h" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <SideHeading id="projects-h" onMore={() => setTab("projects")}>
              Active projects
            </SideHeading>
            {projectsQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : activeProjects.length === 0 ? (
              <p className="py-3 text-sm text-stone-500">No active projects.</p>
            ) : (
              <ul className="-mx-2">
                {activeProjects.map((p) => {
                  const e = byProject.get(p.id);
                  const pct = e && e.total ? Math.round((e.verified / e.total) * 100) : 0;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenProjectId(p.id);
                          setTab("projects");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-stone-100"
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                          {p.coverUrl ? (
                             
                            <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            e?.cover && <Thumb asset={e.cover} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-medium text-stone-900">{p.name}</span>
                            <span
                              className="shrink-0 text-xs tabular-nums text-stone-500"
                              title={`${e?.verified ?? 0} of ${e?.total ?? 0} assets verified`}
                            >
                              {e?.verified ?? 0}/{e?.total ?? 0}
                              <span className="sr-only"> assets verified</span>
                            </span>
                          </span>
                          {p.location && <span className="block truncate text-xs text-stone-500">{p.location}</span>}
                          {e && e.total > 1 && (
                            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-stone-100">
                              <span className="block h-full rounded-full bg-stone-400" style={{ width: `${pct}%` }} />
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="reports-h" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <SideHeading id="reports-h" onMore={() => setTab("reports")}>
              Latest reports
            </SideHeading>
            {reportsQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : latestReports.length === 0 ? (
              <p className="py-3 text-sm text-stone-500">None yet.</p>
            ) : (
              <ul className="-mx-2">
                {latestReports.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenReportId(r.id);
                        setTab("reports");
                      }}
                      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-stone-100"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium text-stone-900">{r.title}</span>
                        <span className="text-xs text-stone-500">
                          <span className="capitalize">{r.type}</span> · {timeAgo(r.createdAt)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="divide-y divide-stone-200 border-y border-stone-200">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton className="h-14 w-20 rounded" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MoreLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900"
    >
      {children} <ArrowRight className="size-3.5" />
    </button>
  );
}

function SideHeading({ id, children, onMore }: { id: string; children: React.ReactNode; onMore: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 id={id} className="text-lg font-semibold text-stone-900">
        {children}
      </h2>
      <button
        type="button"
        onClick={onMore}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
      >
        All <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}

function QueueRow({ asset: a, onVerify, busy }: { asset: MediaAsset; onVerify: () => void; busy: boolean }) {
  const openAsset = useImpactStore((s) => s.openAsset);
  const analyze = useAnalyzeMedia();
  const state = evidenceState(a);
  const conf = typeof a.confidence === "number" ? Math.round(a.confidence * 100) : null;

  return (
    <li className="group flex items-center gap-3 py-3 sm:gap-4">
      <button
        type="button"
        onClick={() => openAsset(a.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
      >
        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:h-16 sm:w-28">
          <Thumb asset={a} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 text-sm font-medium sm:text-base text-stone-900 group-hover:underline group-hover:underline-offset-2">
            {a.title || a.aiCaption || "Untitled"}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
            <span className="font-mono text-[11px] text-stone-600">{accessionNo(a.id)}</span>
            {a.projectName && <span className="hidden truncate sm:inline">{a.projectName}</span>}
            <span className="shrink-0">{timeAgo(a.createdAt)}</span>
          </span>
        </span>
      </button>
      <span
        className={cn(
          "hidden w-14 text-right text-base font-medium tabular-nums sm:block",
          conf === null ? "text-stone-400" : conf < 60 ? "text-amber-700" : "text-stone-700"
        )}
        title="AI confidence"
      >
        {conf === null ? "—" : `${conf}%`}
      </span>
      <EvidenceMark state={state} className="size-5" />
      {state !== "verified" && (
        <span className="w-16 text-right sm:w-20">
        {state === "analyzed" && (
          <Button size="sm" variant="outline" onClick={onVerify} disabled={busy} className="h-7 px-2.5">
            Verify
          </Button>
        )}
        {state === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => analyze.mutate(a.id)}
            disabled={analyze.isPending}
            className="h-7 px-2.5"
          >
            {analyze.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Analyze"}
          </Button>
        )}
        </span>
      )}
    </li>
  );
}

/** The next item to review, at a size where the photo and the AI's reading of it can be checked. */
function FeaturedReview({ asset: a, onVerify, busy }: { asset: MediaAsset; onVerify: () => void; busy: boolean }) {
  const openAsset = useImpactStore((s) => s.openAsset);
  const analyze = useAnalyzeMedia();
  const state = evidenceState(a);
  const conf = typeof a.confidence === "number" ? Math.round(a.confidence * 100) : null;
  const reading = a.aiCaption || a.aiSummary || a.description;

  return (
    <article className="flex flex-col gap-5 @xl:flex-row">
      <button
        type="button"
        onClick={() => openAsset(a.id)}
        className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 @xl:w-72"
        aria-label={`Open ${a.title || "asset"}`}
      >
        <Thumb asset={a} loading="eager" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[11px] text-stone-500">{accessionNo(a.id)}</span>
            <h3 className="mt-1 line-clamp-2 text-xl font-semibold tracking-tight text-stone-900">
              <button type="button" onClick={() => openAsset(a.id)} className="text-left hover:underline hover:underline-offset-4">
                {a.title || "Untitled asset"}
              </button>
            </h3>
            <p className="mt-1 truncate text-sm text-stone-500">
              {[a.projectName, a.location, timeAgo(a.createdAt)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right" title="AI confidence">
            <span
              className={cn(
                "flex items-center justify-end gap-2 text-2xl font-semibold tabular-nums tracking-tight",
                conf !== null && conf < 60 ? "text-amber-700" : "text-stone-900"
              )}
            >
              {conf === null ? "—" : `${conf}%`}
              <EvidenceMark state={state} className="size-5" />
            </span>
            <span className="text-xs text-stone-500">confidence</span>
          </div>
        </div>
        {reading && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-stone-600">{reading}</p>}
        {a.tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {a.tags.slice(0, 5).map((t) => (
              <span key={t} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {t}
              </span>
            ))}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-5">
          {state === "analyzed" && (
            <Button onClick={onVerify} disabled={busy} className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Verify
            </Button>
          )}
          {state === "pending" && (
            <Button
              onClick={() => analyze.mutate(a.id)}
              disabled={analyze.isPending}
              className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
            >
              {analyze.isPending && <Loader2 className="size-4 animate-spin" />}
              Analyze
            </Button>
          )}
          <Button variant="ghost" onClick={() => openAsset(a.id)} className="h-10 rounded-lg text-stone-600">
            Open details
          </Button>
        </div>
      </div>
    </article>
  );
}


// Home background photo, public/hero-home.jpg. If it is missing, Home
// falls back to the newest verified field photo.
const HERO_PHOTO = "/hero-home.jpg";
const DAY = 86_400_000;

// `color` on the dark theme, `light` (darker, AA on white) on the light theme.
const STAT_STYLE: Record<string, { color: string; light: string; icon: LucideIcon }> = {
  assets: { color: "#ef8a4a", light: "#b9541b", icon: ImageIcon },
  review: { color: "#e3b341", light: "#8a6100", icon: Clock },
  verified: { color: "#5fce7a", light: "#237a3c", icon: CheckCircle2 },
  projects: { color: "#5b9cf0", light: "#2461bd", icon: Folder },
  reports: { color: "#a97ff0", light: "#6d43c4", icon: FileText },
};

type HeroStat = { key: string; label: string; value: number | undefined; dates: string[]; tab: ImpactTab };

function HomeHero({
  loading,
  fallbackPhoto,
  stats,
}: {
  loading: boolean;
  fallbackPhoto?: string;
  stats: HeroStat[];
}) {
  const orgsQ = useQuery({ queryKey: ["auth", "orgs"], queryFn: fetchOrgs });
  const org = orgsQ.data?.find((o) => o.active)?.name;
  const [photo, setPhoto] = React.useState(HERO_PHOTO);
  // Clock-dependent copy is set after mount so server and client HTML match.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <section
      aria-labelledby="home-h"
      className="relative isolate overflow-hidden rounded-3xl border border-stone-200 bg-[#fbf7f2] text-stone-900 dark:border-white/10 dark:bg-[#110e0c] dark:text-white"
    >
      {(photo || fallbackPhoto) && (
         
        <img
          src={photo || fallbackPhoto}
          alt=""
          onError={() => setPhoto("")}
          className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-right lg:w-[72%] lg:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fbf7f2] from-20% via-[#fbf7f2]/75 via-50% to-transparent dark:from-[#110e0c] dark:via-[#110e0c]/70" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#fbf7f2]/95 via-[#fbf7f2]/45 via-40% to-transparent dark:from-[#110e0c]/90 dark:via-[#110e0c]/35" />

      <div className="p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-lg text-stone-600 dark:text-white/70">
              {greeting}
              {org && `, ${org}`} <span aria-hidden>👋</span>
            </p>
            <h1 id="home-h" className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Here’s what’s{" "}
              <span className="bg-gradient-to-r from-[#d8672a] to-[#b9541b] bg-clip-text text-transparent dark:from-[#f7a26a] dark:to-[#e8733a]">happening.</span>
            </h1>
            <p className="mt-3 text-base text-stone-600 dark:text-white/65 sm:text-lg">
              A quick overview of your assets, projects and recent activity.
            </p>
          </div>
          {now && (
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 backdrop-blur-sm dark:bg-transparent dark:p-0 dark:backdrop-blur-none">
              <Sprout className="size-8 text-[#237a3c] dark:text-[#5fce7a]" strokeWidth={1.75} />
              <div>
                <p className="text-lg font-medium">
                  {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-stone-600 dark:text-white/85 dark:[text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">Keep capturing impact.</p>
              </div>
            </div>
          )}
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {stats.map((s) => (
            <StatCard key={s.key} stat={s} now={now} loading={loading} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatCard({ stat, now, loading }: { stat: HeroStat; now: Date | null; loading: boolean }) {
  const setTab = useImpactStore((s) => s.setTab);
  const { color, light, icon: Icon } = STAT_STYLE[stat.key];
  const t = now?.getTime() ?? 0;
  const times = stat.dates.map((d) => +new Date(d));
  const thisWeek = times.filter((x) => x > t - 7 * DAY).length;
  // Running total over the last 30 days, by creation date.
  const series = Array.from({ length: 30 }, (_, i) => times.filter((x) => x <= t - (29 - i) * DAY).length);

  return (
    <li
      className="relative flex flex-col rounded-2xl border border-[color-mix(in_srgb,var(--cl)_20%,transparent)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--cl)_9%,white)_0%,white_70%)] p-4 shadow-[0_1px_2px_rgb(26_21_16/0.06)] last:col-span-2 sm:p-5 md:last:col-span-1 dark:border-[color-mix(in_srgb,var(--c)_22%,transparent)] dark:bg-[linear-gradient(160deg,color-mix(in_srgb,var(--c)_14%,#16120f)_0%,#16120f_70%)] dark:shadow-none"
      style={{ "--c": color, "--cl": light } as React.CSSProperties}
    >
      <div className="flex items-start gap-4">
        <span
          className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--cl)_12%,transparent)] text-[var(--cl)] sm:flex sm:size-14 dark:bg-[color-mix(in_srgb,var(--c)_16%,transparent)] dark:text-[var(--c)]"
          style={{ "--c": color, "--cl": light } as React.CSSProperties}
        >
          <Icon className="size-6 sm:size-7" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-stone-600 dark:text-white/70">{stat.label}</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight">
            {stat.value === undefined || loading ? <Skeleton className="mt-1 h-8 w-12 bg-stone-200 dark:bg-white/15" /> : stat.value.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--cl)] sm:text-sm dark:text-[var(--c)]">
        {now &&
          (thisWeek > 0 ? (
            <>
              <ArrowUp className="size-4" /> +{thisWeek} this week
            </>
          ) : (
            <span className="text-stone-500 dark:text-white/50">No new this week</span>
          ))}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <Sparkline values={series} id={stat.key} />
        <button
          type="button"
          onClick={() => setTab(stat.tab)}
          aria-label={`Open ${stat.label}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/15 dark:hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </li>
  );
}

function Sparkline({ values, id }: { values: number[]; id: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full max-w-[150px] text-[var(--cl)] dark:text-[var(--c)]" aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
