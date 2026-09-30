"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AiUsagePanel } from "@/components/impactlens/AiUsagePanel";
import {
  useAnalytics,
  useLeaderboard,
  useMedia,
  useProjects,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import type { Project } from "@/lib/types";

// UN SDG identity colours are external and fixed; they are the one place hue is data here.
const SDG: Record<number, [string, string]> = {
  1: ["No Poverty", "#E5243B"], 2: ["Zero Hunger", "#DDA63A"], 3: ["Good Health", "#4C9F38"],
  4: ["Quality Education", "#C5192D"], 5: ["Gender Equality", "#FF3A21"], 6: ["Clean Water", "#26BDE2"],
  7: ["Clean Energy", "#FCC30B"], 8: ["Decent Work", "#A21942"], 9: ["Innovation", "#FD6925"],
  10: ["Reduced Inequalities", "#DD1367"], 11: ["Sustainable Cities", "#FD9D24"],
  12: ["Responsible Consumption", "#BF8B2E"], 13: ["Climate Action", "#3F7E44"],
  14: ["Life Below Water", "#0A97D9"], 15: ["Life on Land", "#56C02B"],
  16: ["Peace & Justice", "#00689D"], 17: ["Partnerships", "#19486A"],
};

/** Portfolio patterns, set as one register: each section a heading and ruled rows. */
export function InsightsTab() {
  const analyticsQ = useAnalytics();
  const projectsQ = useProjects();
  const mediaQ = useMedia({ limit: 200 });
  const boardQ = useLeaderboard(10);
  const setTab = useImpactStore((s) => s.setTab);
  const projects = React.useMemo(() => projectsQ.data ?? [], [projectsQ.data]);
  const assets = React.useMemo(() => mediaQ.data ?? [], [mediaQ.data]);

  const sdgCounts = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const p of projects) for (const g of goals(p)) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  }, [projects]);

  const conf = React.useMemo(() => {
    const cs = assets.filter((a) => a.analyzedAt && typeof a.confidence === "number").map((a) => a.confidence!);
    const avg = cs.length ? cs.reduce((s, c) => s + c, 0) / cs.length : 0;
    return {
      n: cs.length,
      avg: Math.round(avg * 100),
      high: cs.filter((c) => c >= 0.75).length,
      mid: cs.filter((c) => c >= 0.5 && c < 0.75).length,
      low: cs.filter((c) => c < 0.5).length,
    };
  }, [assets]);

  const countries = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) {
      const c = p.location?.split(",").map((s) => s.trim()).filter(Boolean).pop() || "Unknown";
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const tags = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) for (const t of a.tags ?? []) {
      const k = t.trim().toLowerCase();
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [assets]);

  const categories = Object.entries(analyticsQ.data?.byCategory ?? {}).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...categories.map((c) => c[1]));

  return (
    <div className="space-y-12">
      <Section title="Project health" aside="Score out of 100">
        {boardQ.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !boardQ.data?.length ? (
          <Empty>No projects yet.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left text-xs text-stone-500">
                <th className="w-10 py-2 font-medium">No.</th>
                <th className="py-2 font-medium">Project</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Assets</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Verified</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">SDGs</th>
                <th className="py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {boardQ.data.map((e) => (
                <tr key={e.project.id} onClick={() => setTab("projects")} className="cursor-pointer hover:bg-stone-100/60">
                  <td className="py-2.5 text-xs tabular-nums text-stone-500">{String(e.rank).padStart(2, "0")}</td>
                  <td className="py-2.5">
                    <span className="font-medium text-stone-900">{e.project.name}</span>
                    {e.project.location && <span className="ml-2 text-xs text-stone-500">{e.project.location}</span>}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-stone-700 sm:table-cell">{e.assetCount}</td>
                  <td className="hidden py-2.5 text-right tabular-nums text-stone-700 sm:table-cell">{e.verifiedCount}</td>
                  <td className="hidden py-2.5 text-right tabular-nums text-stone-700 sm:table-cell">{e.sdgCount}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-stone-900">{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="SDG coverage" aside={`${sdgCounts.size} of 17 goals`}>
        <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 md:grid-cols-[repeat(17,minmax(0,1fr))]">
          {Object.entries(SDG).map(([n, [label, color]]) => {
            const count = sdgCounts.get(+n) ?? 0;
            return (
              <li
                key={n}
                title={`SDG ${n} · ${label}${count ? ` · ${count} project${count === 1 ? "" : "s"}` : " · not covered"}`}
                className={`flex aspect-square items-center justify-center rounded-sm text-xs font-semibold tabular-nums ${count ? "" : "border border-dashed border-stone-300"}`}
                style={count ? { background: color, color: "#fff" } : undefined}
              >
                <span className={count ? "" : "text-stone-400"}>{n}</span>
                <span className="sr-only">
                  {label}: {count ? `${count} projects` : "not covered"}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Evidence by category">
        {analyticsQ.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : categories.length === 0 ? (
          <Empty>No analyzed media yet.</Empty>
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {categories.map(([name, n]) => (
              <li key={name} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-4 py-2 text-sm">
                <span className="truncate capitalize text-stone-800">{name}</span>
                <span className="h-1.5 bg-stone-100">
                  <span className="block h-full bg-stone-600" style={{ width: `${(n / catMax) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-stone-700">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="AI confidence">
        {conf.n === 0 ? (
          <Empty>No analyzed media yet.</Empty>
        ) : (
          <p className="text-sm tabular-nums text-stone-700">
            <span className="font-semibold text-stone-900">{conf.n}</span> analyzed · average{" "}
            <span className="font-semibold text-stone-900">{conf.avg}%</span> · {conf.high} high (≥75%) ·{" "}
            {conf.mid} medium · <span className={conf.low ? "text-amber-700" : ""}>{conf.low} low (&lt;50%)</span>
          </p>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <Section title="Geographic reach" aside={`${countries.length} countries`}>
          {countries.length === 0 ? (
            <Empty>No project locations yet.</Empty>
          ) : (
            <ul className="divide-y divide-stone-200 border-y border-stone-200">
              {countries.map(([c, n]) => (
                <li key={c} className="flex justify-between py-2 text-sm">
                  <span className="text-stone-800">{c}</span>
                  <span className="tabular-nums text-stone-600">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Most used tags">
          {tags.length === 0 ? (
            <Empty>No tags yet.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {tags.map(([t, n]) => (
                <li key={t} className="text-stone-800">
                  {t} <span className="tabular-nums text-stone-500">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <AiUsagePanel />
    </div>
  );
}

function goals(p: Project): number[] {
  const all = (p.sdgGoals ?? "").split(/[,;]/).map((s) => parseInt(s.replace(/\D/g, ""), 10));
  return [...new Set(all.filter((n) => n >= 1 && n <= 17))];
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {aside && <span className="text-sm tabular-nums text-stone-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-stone-500">{children}</p>;
}
