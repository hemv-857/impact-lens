"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageItem {
  id: string;
  createdAt: string;
  kind: string;
  model: string | null;
  durationMs: number;
  ok: boolean;
}

interface UsageResp {
  items: UsageItem[];
  summary: {
    total: number;
    ok: number;
    failed: number;
    avgMs: number;
    byUser: { email: string; count: number }[];
  };
}

/** Org-wide AI call meter. Server route enforces auth; scope is the whole org. */
export function AiUsagePanel() {
  const q = useQuery<UsageResp>({
    queryKey: ["ai-usage"],
    queryFn: async () => {
      const r = await fetch("/api/ai/usage");
      if (!r.ok) throw new Error(`usage ${r.status}`);
      return r.json();
    },
  });

  return (
    <section data-testid="ai-usage">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-900">AI usage</h2>
        <span className="text-sm text-stone-500">Last 50 calls</span>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : q.isError ? (
        <p className="py-2 text-sm text-stone-500">Could not load usage.</p>
      ) : !q.data || q.data.summary.total === 0 ? (
        <p className="py-2 text-sm text-stone-500">No AI calls yet.</p>
      ) : (
        <div>
          <p className="text-sm tabular-nums text-stone-700">
            <span className="font-semibold text-stone-900">{q.data.summary.total}</span> calls ·{" "}
            {q.data.summary.ok} succeeded ·{" "}
            <span className={q.data.summary.failed ? "text-red-700" : ""}>{q.data.summary.failed} failed</span> · avg{" "}
            {q.data.summary.avgMs}ms
          </p>
          {q.data.summary.byUser.length > 0 && (
            <p className="mt-1 text-sm text-stone-500" data-testid="ai-usage-byuser">
              {q.data.summary.byUser.map((u) => `${u.email} ${u.count}`).join(" · ")}
            </p>
          )}
          <ul className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
            {q.data.items.slice(0, 8).map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-stone-800">
                  <span className="capitalize">{it.kind}</span>
                  <span className="truncate font-mono text-xs text-stone-500">{it.model ?? "—"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums text-stone-600">
                  {it.durationMs}ms
                  <span className={it.ok ? "text-stone-600" : "font-medium text-red-700"}>{it.ok ? "ok" : "failed"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
