// Public read-only report view. Reachable only with a valid share token;
// 404s otherwise. No auth, no interactivity, no org data beyond the report.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { MarkdownRenderer } from "@/components/impactlens/MarkdownRenderer";
import { Leaf, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Keep tokens out of search indexes and out of Referer headers sent to hosts
// the narrative may embed (markdown images/links).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const report = await db.report.findUnique({
    where: { shareToken: token },
    include: { project: true, org: true },
  });
  if (!report) notFound();

  let metrics: Record<string, string | number> | null = null;
  if (report.metrics) {
    try {
      const v = JSON.parse(report.metrics);
      if (v && typeof v === "object" && !Array.isArray(v)) metrics = v;
    } catch {
      metrics = null;
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
              {report.org ? report.org.name.charAt(0).toUpperCase() : <Leaf className="size-4" />}
            </span>
            <span className="text-lg font-semibold">{report.org ? report.org.name : "ImpactLens"}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3" /> Read-only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500 capitalize">
          {report.type} report
          {report.project ? ` · ${report.project.name}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{report.title}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {new Date(report.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {report.headline && (
          <p className="mt-6 border-l-4 border-emerald-500 pl-4 text-lg font-semibold text-stone-800">
            {report.headline}
          </p>
        )}

        <p className="mt-4 text-stone-600">{report.summary}</p>

        {report.shareNote && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {report.shareNote}
          </p>
        )}

        {metrics && Object.keys(metrics).length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(metrics).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-stone-200 bg-white p-3">
                <dt className="text-xs text-stone-500">{k}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-stone-900">
                  {typeof v === "number" ? v.toLocaleString() : v}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {report.narrative && (
          <article className="markdown-body mt-8 rounded-xl border border-stone-200 bg-white p-6">
            <MarkdownRenderer content={report.narrative} />
          </article>
        )}

        <p className="mt-10 text-center text-xs text-stone-400">
          {report.org ? `Shared by ${report.org.name} · ` : ""}presented with ImpactLens · this link can be revoked by its owner
        </p>
      </main>
    </div>
  );
}
