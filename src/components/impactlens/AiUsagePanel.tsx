"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Timer } from "lucide-react";

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
  summary: { total: number; ok: number; failed: number; avgMs: number };
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
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-stone-900">AI usage</h2>
        <p className="text-sm text-stone-500">
          Model calls made by your organization — most recent 50
        </p>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : q.isError ? (
        <Card className="p-4 text-sm text-stone-500">Could not load usage.</Card>
      ) : !q.data || q.data.summary.total === 0 ? (
        <Card className="p-4 text-sm text-stone-500">
          No AI calls yet — run an analysis or generate a report.
        </Card>
      ) : (
        <Card className="gap-0 p-4">
          <div className="flex flex-wrap gap-4 border-b border-stone-100 pb-3">
            <Stat icon={<Activity className="size-3.5" />} label="Total" value={q.data.summary.total} />
            <Stat icon={<CheckCircle2 className="size-3.5 text-emerald-600" />} label="Succeeded" value={q.data.summary.ok} />
            <Stat icon={<XCircle className="size-3.5 text-red-500" />} label="Failed" value={q.data.summary.failed} />
            <Stat icon={<Timer className="size-3.5" />} label="Avg" value={`${q.data.summary.avgMs}ms`} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {q.data.items.slice(0, 8).map((it) => (
              <li key={it.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-stone-600">
                  <span
                    className={`size-1.5 rounded-full ${it.ok ? "bg-emerald-500" : "bg-red-500"}`}
                    aria-hidden
                  />
                  <span className="capitalize">{it.kind}</span>
                  <span className="text-stone-400">{it.model ?? "—"}</span>
                </span>
                <span className="flex items-center gap-2 text-stone-400">
                  <span>{it.durationMs}ms</span>
                  <Badge variant="outline" className={it.ok ? "text-emerald-700" : "text-red-600"}>
                    {it.ok ? "ok" : "failed"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-stone-600">
      {icon}
      <span className="font-semibold text-stone-900">{value}</span>
      {label}
    </span>
  );
}
