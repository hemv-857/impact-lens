"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Copy,
  CopyPlus,
  Download,
  History,
  Megaphone,
  FileBarChart,
  FileDiff,
  ScrollText,
  Check,
  Printer,
  ExternalLink,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { MarkdownRenderer } from "@/components/impactlens/MarkdownRenderer";
import { ReportSchedules } from "@/components/impactlens/ReportSchedules";
import {
  useCloneReport,
  useCreateReport,
  useMedia,
  useProjects,
  useReports,
} from "@/components/impactlens/impact-hooks";
import { reportPdfUrl } from "@/lib/api";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { Report } from "@/lib/types";

const REPORT_TYPES = [
  {
    value: "impact",
    label: "Impact Report",
    icon: <FileBarChart className="size-4" />,
    desc: "Document visible outcomes & evidence",
  },
  {
    value: "summary",
    label: "Project Summary",
    icon: <ScrollText className="size-4" />,
    desc: "Stakeholder-ready summary",
  },
  {
    value: "campaign",
    label: "Campaign Story",
    icon: <Megaphone className="size-4" />,
    desc: "Mobilize public support",
  },
  {
    value: "comparison",
    label: "Before/After Report",
    icon: <FileDiff className="size-4" />,
    desc: "Demonstrate measurable change",
  },
] as const;

const TONES = ["professional", "emotional", "data-driven"] as const;

export function ReportsTab() {
  const reportsProjectId = useImpactStore((s) => s.reportsProjectId);
  const setReportsProjectId = useImpactStore((s) => s.setReportsProjectId);
  const reportsComparisonId = useImpactStore((s) => s.reportsComparisonId);

  const [type, setType] = React.useState<
    "impact" | "summary" | "campaign" | "comparison"
  >("impact");
  const [tone, setTone] = React.useState<
    "professional" | "emotional" | "data-driven"
  >("professional");
  const [projectId, setProjectId] = React.useState<string>("none");
  const [audience, setAudience] = React.useState("");
  const [variantCount, setVariantCount] = React.useState(1);
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<Report | null>(null);
  const [activeReportId, setActiveReportId] = React.useState<string | null>(
    null
  );

  const projectsQ = useProjects();
  const reportsQ = useReports();
  const mediaQ = useMedia({ limit: 60, projectId: projectId !== "none" ? projectId : undefined });
  const create = useCreateReport();
  const cloneMut = useCloneReport();
  const { toast } = useToast();
  const [sharingId, setSharingId] = React.useState<string | null>(null);
  const shareReport = async (id: string) => {
    setSharingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/share`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !body?.url) throw new Error(body?.error ?? "Request failed");
      await navigator.clipboard.writeText(`${window.location.origin}${body.url}`);
      toast({ title: "Share link copied", description: "Anyone with the link can read this report." });
    } catch (e) {
      toast({
        title: "Share failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSharingId(null);
    }
  };

  // Apply preset project from store (e.g., when jumping from projects tab)
  React.useEffect(() => {
    if (reportsProjectId) {
      setProjectId(reportsProjectId);
      setReportsProjectId(null);
    }
  }, [reportsProjectId, setReportsProjectId]);

  // Comparison reports: auto-switch type
  React.useEffect(() => {
    if (reportsComparisonId) {
      setType("comparison");
    }
  }, [reportsComparisonId]);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onGenerate = async () => {
    if (selectedAssetIds.length === 0 && type !== "comparison") {
      toast({
        title: "Pick at least one media asset",
        description: "Reports draw on field-media evidence.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await create.mutateAsync({
        type,
        tone,
        projectId: projectId !== "none" ? projectId : undefined,
        assetIds: selectedAssetIds,
        audience: audience.trim() || undefined,
        comparisonId: reportsComparisonId ?? undefined,
        variantCount,
      });
      const isMulti = typeof res === "object" && res !== null && "reports" in res;
      const first = isMulti ? res.reports[0] : res;
      if (!first) throw new Error("No report returned");
      setResult(first);
      setActiveReportId(first.id);
      if (isMulti) {
        toast({
          title: `${res.reports.length} report variants generated`,
          description: res.warning ? `Partial: ${res.warning}` : first.title,
        });
      } else {
        toast({ title: "Report generated", description: first.title });
      }
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onCopy = async (r: Report) => {
    const md = renderReportMarkdown(r);
    try {
      await navigator.clipboard.writeText(md);
      toast({ title: "Copied markdown to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const onDownload = (r: Report) => {
    const md = renderReportMarkdown(r);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Find active report object: either freshly generated, or from past list
  const activeReport =
    result ??
    (activeReportId
      ? reportsQ.data?.find((r) => r.id === activeReportId) ?? null
      : null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Reports
        </h1>
        <p className="text-sm text-stone-500">
          Generate donor-ready impact reports, summaries & campaign stories
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Form */}
        <Card className="gap-0 p-4 lg:col-span-2 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-800">
            Configure report
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-stone-500">
                Report type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-2.5 text-left transition",
                      type === t.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                      <span
                        className={cn(
                          type === t.value
                            ? "text-emerald-700"
                            : "text-stone-500"
                        )}
                      >
                        {t.icon}
                      </span>
                      {t.label}
                    </span>
                    <span className="text-[10px] leading-tight text-stone-500">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) =>
                    setTone(v as (typeof TONES)[number])
                  }
                >
                  <SelectTrigger className="w-full capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">Project</Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v);
                    setSelectedAssetIds([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All media</SelectItem>
                    {projectsQ.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">
                Report variants
                <span className="ml-1.5 font-normal text-stone-400">
                  each gets a different angle
                </span>
              </Label>
              <Select
                value={String(variantCount)}
                onValueChange={(v) => setVariantCount(parseInt(v, 10) || 1)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 report (single draft)</SelectItem>
                  <SelectItem value="2">2 variants (evidence + story)</SelectItem>
                  <SelectItem value="3">3 variants (+ data-first)</SelectItem>
                  <SelectItem value="4">4 variants (+ urgency)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audience" className="text-xs text-stone-500">
                Audience (optional)
              </Label>
              <Input
                id="audience"
                placeholder="Donors, government partners, public…"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">
                Media evidence ({selectedAssetIds.length} selected)
              </Label>
              <div className="scrollbar-thin max-h-72 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-1">
                {mediaQ.isLoading ? (
                  <div className="space-y-1 p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !mediaQ.data || mediaQ.data.length === 0 ? (
                  <p className="p-3 text-center text-xs text-stone-400">
                    No media available. Try a different project or upload first.
                  </p>
                ) : (
                  mediaQ.data.map((a) => {
                    const checked = selectedAssetIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAsset(a.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md p-1.5 text-left transition",
                          checked
                            ? "bg-emerald-50 ring-1 ring-emerald-200"
                            : "hover:bg-stone-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border",
                            checked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-stone-300 bg-white"
                          )}
                        >
                          {checked && <Check className="size-3" />}
                        </span>
                        <div className="relative size-10 shrink-0 overflow-hidden rounded bg-stone-100">
                          { }
                          <img
                            src={a.thumbnailUrl || a.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-stone-800">
                            {a.title || a.aiCaption || "Untitled"}
                          </span>
                          <span className="block truncate text-[10px] text-stone-400">
                            {a.location ?? "—"}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              onClick={onGenerate}
              disabled={create.isPending}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate report
            </Button>

            <ReportSchedules
              projectId={projectId !== "none" ? projectId : undefined}
              type={type}
              tone={tone}
              audience={audience}
            />
          </div>
        </Card>

        {/* Result */}
        <div className="lg:col-span-3">
          {create.isPending && !activeReport ? (
            <Card className="p-6">
              <ReportGenerating />
            </Card>
          ) : activeReport ? (
            <ReportView
              report={activeReport}
              onCopy={() => onCopy(activeReport)}
              onDownload={() => onDownload(activeReport)}
            />
          ) : (
            <EmptyState
              emoji="📄"
              title="No report yet"
              description="Configure the form on the left and click Generate report. Your AI-generated narrative will appear here."
            />
          )}
        </div>
      </div>

      {/* Past reports */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-stone-500" />
          <h2 className="text-base font-semibold text-stone-900">
            Past reports
          </h2>
        </div>
        {reportsQ.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : !reportsQ.data || reportsQ.data.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="No reports yet"
            description="Generate your first report above to see it here."
          />
        ) : (
          <div className="scrollbar-thin grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {reportsQ.data
              .slice()
              .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
              .map((r) => (
                <PastReportCard
                  key={r.id}
                  report={r}
                  active={r.id === activeReportId}
                  onOpen={() => {
                    setActiveReportId(r.id);
                    setResult(null);
                  }}
                  onClone={async () => {
                    try {
                      const cloned = await cloneMut.mutateAsync(r.id);
                      toast({ title: "Report cloned", description: cloned.title });
                      setActiveReportId(cloned.id);
                    } catch (e) {
                      toast({
                        title: "Clone failed",
                        description: e instanceof Error ? e.message : "Unknown error",
                        variant: "destructive",
                      });
                    }
                  }}
                  cloning={cloneMut.isPending}
                  onShare={() => shareReport(r.id)}
                  sharing={sharingId === r.id}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReportGenerating() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Sparkles className="size-12 animate-pulse text-emerald-500" />
      <h3 className="mt-4 text-lg font-semibold text-stone-800">
        Generating your report…
      </h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">
        The LLM is analyzing your field evidence and writing donor-ready
        narrative. This usually takes 8–20 seconds.
      </p>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-emerald-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function ReportView({
  report,
  onCopy,
  onDownload,
}: {
  report: Report;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const metricsEntries = React.useMemo(() => {
    if (!report.metrics) return [];
    return Object.entries(report.metrics);
  }, [report.metrics]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="gap-0 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-200 capitalize"
            >
              {report.type}
            </Badge>
            {report.tone && (
              <Badge variant="outline" className="capitalize">
                {report.tone}
              </Badge>
            )}
            <span className="text-xs text-stone-400">
              {formatDateTime(report.createdAt)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="size-3.5" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="size-3.5" /> .md
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => window.open(reportPdfUrl(report.id), "_blank", "noopener,noreferrer")}
              title="Open print-ready view — save as PDF from browser print dialog"
            >
              <Printer className="size-3.5" /> PDF
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-stone-900">
          {report.title}
        </h2>
        {report.headline && (
          <p className="mt-1 text-base font-medium text-emerald-800">
            {report.headline}
          </p>
        )}

        {report.summary && (
          <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm leading-relaxed text-stone-700">
              {report.summary}
            </p>
          </div>
        )}

        {metricsEntries.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metricsEntries.map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"
              >
                <p className="text-2xl font-bold tracking-tight text-emerald-800">
                  {String(v)}
                </p>
                <p className="text-[11px] capitalize text-stone-500">
                  {k.replace(/[_-]/g, " ")}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <MarkdownRenderer content={report.narrative} />
        </div>

        {report.callToAction && (
          <div className="mt-5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Call to action
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{report.callToAction}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function PastReportCard({
  report,
  active,
  onOpen,
  onClone,
  cloning,
  onShare,
  sharing,
}: {
  report: Report;
  active: boolean;
  onOpen: () => void;
  onClone?: () => void;
  cloning?: boolean;
  onShare?: () => void;
  sharing?: boolean;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "lift-on-hover group cursor-pointer gap-0 p-4",
        active && "ring-2 ring-emerald-500"
      )}
    >
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-200 capitalize"
        >
          {report.type}
        </Badge>
        <div className="flex items-center gap-1">
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              disabled={sharing}
              className="rounded p-1 text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-emerald-700 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
              title="Copy read-only share link"
              aria-label="Share report"
            >
              {sharing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Share2 className="size-3" />
              )}
            </button>
          )}
          {onClone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClone();
              }}
              disabled={cloning}
              className="rounded p-1 text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-emerald-700 group-hover:opacity-100 disabled:opacity-50"
              title="Clone report"
              aria-label="Clone report"
            >
              {cloning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CopyPlus className="size-3" />
              )}
            </button>
          )}
          <span className="text-[11px] text-stone-400">{timeAgo(report.createdAt)}</span>
        </div>
      </div>
      <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-stone-900">
        {report.title}
      </h4>
      {report.headline && (
        <p className="mt-1 line-clamp-2 text-xs text-stone-500">
          {report.headline}
        </p>
      )}
      <p className="mt-2 line-clamp-2 text-xs text-stone-500">
        {report.summary}
      </p>
    </Card>
  );
}

function renderReportMarkdown(r: Report): string {
  const metrics = r.metrics
    ? Object.entries(r.metrics)
        .map(([k, v]) => `- **${k.replace(/[_-]/g, " ")}**: ${v}`)
        .join("\n")
    : "";
  return `# ${r.title}

> ${r.headline ?? ""}

## Summary
${r.summary}

${metrics ? `## Metrics\n${metrics}\n` : ""}
## Narrative
${r.narrative ?? ""}

---

**Call to action:** ${r.callToAction ?? ""}

---
_Type: ${r.type} · Tone: ${r.tone ?? "professional"} · Generated: ${formatDateTime(r.createdAt)}_
`;
}
