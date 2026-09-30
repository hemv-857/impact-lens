"use client";

import * as React from "react";
import { ArrowRight, Database, Loader2, Plus } from "lucide-react";
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

  const tally: [string, number | undefined][] = [
    ["Assets", analytics?.totalAssets],
    ["To review", loading ? undefined : unverified.length],
    ["Verified", analytics?.verifiedAssets],
    ["Projects", analytics?.activeProjects],
    ["Reports", analytics?.totalReports],
  ];

  const activeProjects = (projectsQ.data ?? []).filter((p) => p.status === "active").slice(0, 5);
  const latestReports = (reportsQ.data ?? [])
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      <h1 className="sr-only">Home</h1>
      {/* Tally: the register's running totals */}
      <section aria-label="Totals" className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <dl className="grid w-full grid-cols-5 gap-3 border-y border-stone-200 py-3 sm:flex sm:w-auto sm:gap-8 sm:border-0 sm:py-0">
          {tally.map(([label, value]) => (
            <div key={label} className="sm:min-w-16" title={label === "Projects" ? "Active projects" : undefined}>
              <dt className="text-[11px] leading-tight text-stone-500 sm:text-xs">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums tracking-tight text-stone-900 sm:mt-0.5 sm:text-2xl">
                {value === undefined ? <Skeleton className="mt-1 h-7 w-12" /> : value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <Button variant="outline" onClick={() => setTab("reports")} className="hidden sm:inline-flex">
          Generate report
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        {/* Review queue: the high-dwell area */}
        <div className="space-y-10 lg:col-span-8">
          {(loading || queue.length > 0) && (
            <section aria-labelledby="queue-h">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 id="queue-h" className="text-base font-semibold text-stone-900">
                  Awaiting review
                  <span className="ml-2 font-normal tabular-nums text-stone-500">{unverified.length}</span>
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
                <ol className="divide-y divide-stone-200 border-y border-stone-200">
                  {queue.map((a) => (
                    <QueueRow key={a.id} asset={a} onVerify={() => verify([a.id])} busy={bulk.isPending} />
                  ))}
                </ol>
              )}
              {unverified.length > QUEUE_SIZE && (
                <MoreLink onClick={() => setTab("library")}>All {unverified.length} in the library</MoreLink>
              )}
            </section>
          )}

          {!loading && recent.length > 0 && (
            <section aria-labelledby="recent-h">
              <h2 id="recent-h" className="mb-2 text-base font-semibold text-stone-900">
                {queue.length === 0 ? "All caught up · latest accessions" : "Recently verified"}
              </h2>
              <ol className="divide-y divide-stone-200 border-y border-stone-200">
                {recent.map((a) => (
                  <QueueRow key={a.id} asset={a} onVerify={() => verify([a.id])} busy={bulk.isPending} />
                ))}
              </ol>
              <MoreLink onClick={() => setTab("library")}>Open the library</MoreLink>
            </section>
          )}
        </div>

        <aside className="space-y-10 lg:col-span-4">
          <section aria-labelledby="projects-h">
            <SideHeading id="projects-h" onMore={() => setTab("projects")}>
              Active projects
            </SideHeading>
            {projectsQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : activeProjects.length === 0 ? (
              <p className="py-3 text-sm text-stone-500">No active projects.</p>
            ) : (
              <ul className="divide-y divide-stone-200 border-y border-stone-200">
                {activeProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setTab("projects")}
                      className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left hover:bg-stone-100/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-stone-900">{p.name}</span>
                        {p.location && <span className="block truncate text-xs text-stone-500">{p.location}</span>}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-stone-600">
                        {p.assetCount ?? 0}
                        <span className="sr-only"> assets</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="reports-h">
            <SideHeading id="reports-h" onMore={() => setTab("reports")}>
              Latest reports
            </SideHeading>
            {reportsQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : latestReports.length === 0 ? (
              <p className="py-3 text-sm text-stone-500">None yet.</p>
            ) : (
              <ul className="divide-y divide-stone-200 border-y border-stone-200">
                {latestReports.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setTab("reports")}
                      className="w-full py-2.5 text-left hover:bg-stone-100/60"
                    >
                      <span className="line-clamp-1 text-sm font-medium text-stone-900">{r.title}</span>
                      <span className="text-xs text-stone-500">
                        <span className="capitalize">{r.type}</span> · {timeAgo(r.createdAt)}
                      </span>
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
    <div className="mb-2 flex items-center justify-between">
      <h2 id={id} className="text-base font-semibold text-stone-900">
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
        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-stone-200 sm:h-14 sm:w-20">
          <Thumb asset={a} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 text-sm font-medium text-stone-900 group-hover:underline group-hover:underline-offset-2">
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
          "hidden w-12 text-right text-sm tabular-nums sm:block",
          conf === null ? "text-stone-400" : conf < 60 ? "text-amber-700" : "text-stone-700"
        )}
        title="AI confidence"
      >
        {conf === null ? "—" : `${conf}%`}
      </span>
      <EvidenceMark state={state} />
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
    </li>
  );
}
