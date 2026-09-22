"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  GitCompare,
  X,
  Check,
  Minus,
  TrendingUp,
  Images,
  BadgeCheck,
  Target,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useProjects } from "@/components/impactlens/impact-hooks";
import { compareProjects, type ProjectComparisonResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useImpactStore } from "@/lib/store";
import { formatDate } from "@/lib/format";

/**
 * ProjectComparison — a dialog/sheet that lets the user pick two projects
 * and compares them side by side: stats, SDG overlap, shared categories,
 * unique categories, and a summary.
 */
export function ProjectComparison({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const projectsQ = useProjects();
  const { toast } = useToast();
  const openAsset = useImpactStore((s) => s.openAsset);
  const [idA, setIdA] = React.useState<string>("");
  const [idB, setIdB] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ProjectComparisonResponse | null>(null);

  const runComparison = async () => {
    if (!idA || !idB) {
      toast({ title: "Pick both projects", variant: "destructive" });
      return;
    }
    if (idA === idB) {
      toast({ title: "Pick two different projects", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await compareProjects({ projectIdA: idA, projectIdB: idB });
      setResult(r);
    } catch (e) {
      toast({
        title: "Comparison failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-stone-900/40 pt-[6vh] backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="scrollbar-thin max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3 backdrop-blur">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <GitCompare className="size-4 text-emerald-600" />
            Compare projects
          </h3>
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Pickers */}
          <div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">Project A</label>
              <Select value={idA} onValueChange={setIdA}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select project A" /></SelectTrigger>
                <SelectContent>
                  {projectsQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === idB}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <GitCompare className="mb-2 hidden size-4 text-stone-300 sm:block" />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">Project B</label>
              <Select value={idB} onValueChange={setIdB}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select project B" /></SelectTrigger>
                <SelectContent>
                  {projectsQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === idA}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runComparison} disabled={loading || !idA || !idB} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <GitCompare className="size-4" />}
              Compare
            </Button>
          </div>

          {/* Result */}
          {loading && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <GitCompare className="size-10 animate-pulse text-emerald-500" />
                <p className="mt-3 text-sm text-stone-500">Comparing projects…</p>
              </div>
            </Card>
          )}

          {!loading && !result && (
            <EmptyState
              emoji="⚖️"
              title="Pick two projects to compare"
              description="See how two initiatives stack up across assets, SDGs, categories, and analysis coverage."
            />
          )}

          {!loading && result && (
            <ComparisonResult result={result} onOpenAsset={openAsset} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ComparisonResult({
  result,
  onOpenAsset,
}: {
  result: ProjectComparisonResponse;
  onOpenAsset: (id: string) => void;
}) {
  const { a, b, stats, sharedSdgs, sharedCategories, aOnlyCategories, bOnlyCategories, summary } = result;

  const rows: { label: string; icon: React.ReactNode; a: React.ReactNode; b: React.ReactNode; winner?: "a" | "b" | "tie" }[] = [
    { label: "Assets", icon: <Images className="size-3.5" />, a: stats.a.assetCount, b: stats.b.assetCount, winner: stats.a.assetCount > stats.b.assetCount ? "a" : stats.a.assetCount < stats.b.assetCount ? "b" : "tie" },
    { label: "Analyzed", icon: <TrendingUp className="size-3.5" />, a: stats.a.analyzed, b: stats.b.analyzed, winner: stats.a.analyzed > stats.b.analyzed ? "a" : stats.a.analyzed < stats.b.analyzed ? "b" : "tie" },
    { label: "Verified", icon: <BadgeCheck className="size-3.5" />, a: stats.a.verified, b: stats.b.verified, winner: stats.a.verified > stats.b.verified ? "a" : stats.a.verified < stats.b.verified ? "b" : "tie" },
    { label: "Avg confidence", icon: <Target className="size-3.5" />, a: stats.a.avgConfidence !== null ? `${Math.round(stats.a.avgConfidence * 100)}%` : "—", b: stats.b.avgConfidence !== null ? `${Math.round(stats.b.avgConfidence * 100)}%` : "—", winner: (stats.a.avgConfidence ?? 0) > (stats.b.avgConfidence ?? 0) ? "a" : (stats.a.avgConfidence ?? 0) < (stats.b.avgConfidence ?? 0) ? "b" : "tie" },
    { label: "Unique categories", icon: <Target className="size-3.5" />, a: stats.a.uniqueCategories, b: stats.b.uniqueCategories, winner: stats.a.uniqueCategories > stats.b.uniqueCategories ? "a" : stats.a.uniqueCategories < stats.b.uniqueCategories ? "b" : "tie" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary banner */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm text-emerald-900">{summary}</p>
      </div>

      {/* Side-by-side comparison table */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="grid grid-cols-3 border-b border-stone-100 bg-stone-50">
          <div className="p-3">
            <p className="text-xs uppercase tracking-wide text-stone-400">Metric</p>
          </div>
          <div className="border-l border-stone-100 p-3">
            <p className="truncate text-sm font-semibold text-stone-900">{a.name}</p>
            <p className="text-[10px] text-stone-400">{a.location}</p>
          </div>
          <div className="border-l border-stone-100 p-3">
            <p className="truncate text-sm font-semibold text-stone-900">{b.name}</p>
            <p className="text-[10px] text-stone-400">{b.location}</p>
          </div>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 border-b border-stone-50 last:border-0">
            <div className="flex items-center gap-1.5 p-3 text-xs font-medium text-stone-500">
              {row.icon}
              {row.label}
            </div>
            <div className={cn("flex items-center gap-1.5 border-l border-stone-50 p-3 text-sm font-semibold tabular-nums", row.winner === "a" ? "bg-emerald-50/50 text-emerald-800" : "text-stone-700")}>
              {row.winner === "a" && <Check className="size-3 text-emerald-600" />}
              {row.a}
            </div>
            <div className={cn("flex items-center gap-1.5 border-l border-stone-50 p-3 text-sm font-semibold tabular-nums", row.winner === "b" ? "bg-emerald-50/50 text-emerald-800" : "text-stone-700")}>
              {row.winner === "b" && <Check className="size-3 text-emerald-600" />}
              {row.b}
            </div>
          </div>
        ))}
      </Card>

      {/* Shared + unique categories */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-0 p-4">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Check className="size-3" /> Shared ({sharedCategories.length})
          </p>
          {sharedCategories.length === 0 ? (
            <p className="text-xs text-stone-400">No shared categories</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {sharedCategories.map((c) => <CategoryBadge key={c} category={c} compact />)}
            </div>
          )}
        </Card>
        <Card className="gap-0 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Only in {a.name}</p>
          {aOnlyCategories.length === 0 ? (
            <p className="text-xs text-stone-400">None</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {aOnlyCategories.map((c) => <CategoryBadge key={c} category={c} compact />)}
            </div>
          )}
        </Card>
        <Card className="gap-0 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Only in {b.name}</p>
          {bOnlyCategories.length === 0 ? (
            <p className="text-xs text-stone-400">None</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {bOnlyCategories.map((c) => <CategoryBadge key={c} category={c} compact />)}
            </div>
          )}
        </Card>
      </div>

      {/* Shared SDGs */}
      <Card className="gap-0 p-4">
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
          <Target className="size-3" /> Shared SDGs ({sharedSdgs.length})
        </p>
        {sharedSdgs.length === 0 ? (
          <p className="text-xs text-stone-400">No overlapping UN SDG goals</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sharedSdgs.map((s) => (
              <Badge key={s} variant="outline" className="bg-teal-50 text-teal-800 border-teal-200">
                SDG {s}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 border-t border-stone-100 pt-3 text-[11px] text-stone-500">
          <span><strong className="text-stone-700">{a.name}:</strong> SDG {a.sdgGoals || "—"}</span>
          <span><strong className="text-stone-700">{b.name}:</strong> SDG {b.sdgGoals || "—"}</span>
        </div>
      </Card>
    </motion.div>
  );
}
