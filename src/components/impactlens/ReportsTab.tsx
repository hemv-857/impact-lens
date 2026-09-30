"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Copy,
  CopyPlus,
  Download,
  ArrowLeft,
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
import { Thumb } from "@/components/impactlens/Thumb";
import { EvidenceMark, evidenceState } from "@/components/impactlens/EvidenceMark";
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
import { MarkdownRenderer } from "@/components/impactlens/MarkdownRenderer";
import { ReportSchedules } from "@/components/impactlens/ReportSchedules";
import { ShareDialog } from "@/components/impactlens/ShareDialog";
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
import { formatDateTime, timeAgo, accessionNo } from "@/lib/format";
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
  const openReportId = useImpactStore((s) => s.openReportId);
  const setOpenReportId = useImpactStore((s) => s.setOpenReportId);

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
  const [shareOpenId, setShareOpenId] = React.useState<string | null>(null);

  // Apply preset project from store (e.g., when jumping from projects tab)
  React.useEffect(() => {
    if (reportsProjectId) {
      setProjectId(reportsProjectId);
      setReportsProjectId(null);
    }
  }, [reportsProjectId, setReportsProjectId]);

  React.useEffect(() => {
    if (openReportId) {
      setActiveReportId(openReportId);
      setResult(null);
      setOpenReportId(null);
    }
  }, [openReportId, setOpenReportId]);

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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Form */}
        <Card className="gap-0 p-4 lg:col-span-2 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-stone-900">
            New report
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-stone-500">
                Report type
              </Label>
              <div role="radiogroup" aria-label="Report type" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-stone-200 bg-stone-200">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={type === t.value}
                    title={t.desc}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "px-3 py-2 text-left text-sm transition",
                      type === t.value
                        ? "bg-stone-900 font-medium text-white"
                        : "bg-white text-stone-700 hover:bg-stone-50"
                    )}
                  >
                    {t.label}
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
                Variants
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
                  // Verified evidence first: the report should cite what the org has checked.
                  [...mediaQ.data].sort((x, y) => Number(y.verified) - Number(x.verified)).map((a) => {
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
                          <Thumb asset={a} />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-stone-800">
                            {a.title || a.aiCaption || "Untitled"}
                          </span>
                          <span className="block truncate text-[11px] text-stone-500">
                            <span className="font-mono text-stone-600">{accessionNo(a.id)}</span>
                            {a.location ? ` · ${a.location}` : ""}
                          </span>
                        </span>
                        <EvidenceMark state={evidenceState(a)} />
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
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
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

        {/* Result, or the register of past reports when nothing is open */}
        <div className={cn("lg:col-span-3", activeReport && "order-first lg:order-none")}>
          {create.isPending && !activeReport ? (
            <Card className="p-6">
              <ReportGenerating />
            </Card>
          ) : activeReport ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setActiveReportId(null);
                  setResult(null);
                }}
                className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft className="size-3.5" /> Past reports
              </button>
              <ReportView
                report={activeReport}
                onCopy={() => onCopy(activeReport)}
                onDownload={() => onDownload(activeReport)}
                onShare={() => setShareOpenId(activeReport.id)}
              />
            </div>
          ) : (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-stone-900">Past reports</h2>
                {reportsQ.data && reportsQ.data.length > 0 && (
                  <span className="text-sm tabular-nums text-stone-500">{reportsQ.data.length}</span>
                )}
              </div>
              {reportsQ.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !reportsQ.data || reportsQ.data.length === 0 ? (
                <p className="border-y border-stone-200 py-6 text-sm text-stone-500">
                  Pick the evidence to cite, then generate your first report.
                </p>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {reportsQ.data
                    .slice()
                    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                    .map((r) => (
                      <PastReportRow
                        key={r.id}
                        report={r}
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
                        onShare={() => setShareOpenId(r.id)}
                      />
                    ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <ShareDialog
        reportId={shareOpenId}
        open={shareOpenId !== null}
        onOpenChange={(o) => {
          if (!o) setShareOpenId(null);
        }}
      />
    </div>
  );
}

function ReportGenerating() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-base font-semibold text-stone-800">Writing from your evidence…</h3>
      <p className="mt-1 text-sm text-stone-500">Usually 8–20 seconds.</p>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-stone-400"
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
  onShare,
}: {
  report: Report;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
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
            <Badge variant="outline" className="capitalize">
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
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="size-3.5" /> Share
            </Button>
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
          <p className="mt-1 text-base font-medium text-stone-700">
            {report.headline}
          </p>
        )}

        {report.summary && (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-stone-700">
            {report.summary}
          </p>
        )}

        {metricsEntries.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-stone-200 py-4 sm:grid-cols-4">
            {metricsEntries.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs capitalize text-stone-500">{k.replace(/[_-]/g, " ")}</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-900">
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-4">
          <MarkdownRenderer content={report.narrative} />
        </div>

        {report.callToAction && (
          <div className="mt-6 border-t border-stone-200 pt-4">
            <p className="text-xs font-medium text-stone-500">Call to action</p>
            <p className="mt-1 text-base font-medium text-stone-900">{report.callToAction}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function PastReportRow({
  report,
  onOpen,
  onClone,
  cloning,
  onShare,
}: {
  report: Report;
  onOpen: () => void;
  onClone: () => void;
  cloning: boolean;
  onShare: () => void;
}) {
  const iconBtn =
    "rounded p-1.5 text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-900 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50";
  return (
    <li className="group flex items-center gap-2 transition-colors">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-3 text-left">
        <span className="block truncate text-sm font-medium text-stone-900 group-hover:underline group-hover:underline-offset-4 sm:text-base">
          {report.title}
        </span>
        <span className="mt-1 flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded bg-stone-100 px-1.5 py-px text-stone-600 group-hover:bg-stone-200">
            {report.type[0].toUpperCase() + report.type.slice(1)}
          </span>
          <span className="tabular-nums">
            {report.mediaIds.length === 0
              ? "No citations"
              : `Cites ${report.mediaIds.length} asset${report.mediaIds.length === 1 ? "" : "s"}`}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgo(report.createdAt)}</span>
        </span>
      </button>
      <button type="button" onClick={onShare} className={iconBtn} title="Share (read-only link)" aria-label="Share report">
        <Share2 className="size-3.5" />
      </button>
      <button type="button" onClick={onClone} disabled={cloning} className={iconBtn} title="Clone report" aria-label="Clone report">
        {cloning ? <Loader2 className="size-3.5 animate-spin" /> : <CopyPlus className="size-3.5" />}
      </button>
    </li>
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
