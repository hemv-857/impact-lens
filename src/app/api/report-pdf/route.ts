// GET /api/report-pdf?id=<reportId>
// Returns a print-ready HTML page for the report (opens in new tab; user clicks
// Ctrl+P / browser print → save as PDF). This avoids heavy PDF libs.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAsset, serializeReport } from "@/lib/serialize";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const report = await db.report.findFirst({
      where: { id, orgId: auth.orgId },
      include: { org: { select: { name: true } }, project: { select: { name: true } } },
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const r = serializeReport(report);
    const orgName = report.org?.name ?? "ImpactLens";
    const issued = new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

    // Evidence appendix: the exact assets the report was written from, numbered in the
    // order the narrative cites them ("Asset 3"), org-scoped, with provenance identifiers.
    const found = r.mediaIds.length
      ? await db.mediaAsset.findMany({ where: { id: { in: r.mediaIds.slice(0, 60) }, orgId: auth.orgId } })
      : [];
    const byId = new Map(found.map((a) => [a.id, a]));
    const evidence = r.mediaIds
      .slice(0, 60)
      .map((id, i) => ({ a: byId.get(id), n: i + 1 }))
      .filter((x): x is { a: NonNullable<typeof x.a>; n: number } => !!x.a);
    const evidenceHtml = evidence
      .map(({ a, n }) => {
        const src = serializeAsset(a);
        const img = src.thumbnailUrl || (src.type === "image" ? src.url : "");
        const when = a.captureDate ?? a.createdAt;
        // placeholder sits under the image, so a missing file degrades to a labelled tile
        const media = `<div class="ph">${escapeHtml(src.type)}</div>${
          img && /^(https:\/\/|\/)/.test(img)
            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(src.aiCaption || src.title)}" onerror="this.remove()" />`
            : ""
        }`;
        return `<figure class="ev"><div class="media">${media}<span class="n">${n}</span></div><figcaption><strong>Asset ${n}</strong> <span class="badge ${
          a.verified ? "ok" : "pending"
        }">${a.verified ? "human-verified" : "not yet verified"}</span><p>${escapeHtml(src.aiCaption || src.title)}</p><span class="prov">${
          src.type
        } · ${when.toISOString().slice(0, 10)}${a.location ? ` · ${escapeHtml(a.location)}` : ""}<br/>ref ${escapeHtml(a.publicId)}</span></figcaption></figure>`;
      })
      .join("");

    const metricsRows = r.metrics
      ? Object.entries(r.metrics)
          .map(([k, v]) => {
            const [label, value] = formatMetric(k, v);
            return `<div class="metric"><div class="v">${escapeHtml(value)}</div><div class="k">${escapeHtml(label)}</div></div>`;
          })
          .join("")
      : "";
    const verifiedCount = evidence.filter((x) => x.a.verified).length;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(r.title)} — ${escapeHtml(orgName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --ink: #1c1917; --ink-2: #44403c; --muted: #78716c; --faint: #a8a29e;
    --rule: #e7e5e4; --paper: #ffffff; --wash: #f7f6f3;
    --brand: #047857; --brand-ink: #064e3b; --brand-wash: #ecfdf5; --brand-line: #a7f3d0;
    --amber: #92400e; --amber-wash: #fef3c7;
    --serif: Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  @page {
    size: A4; margin: 20mm 18mm 22mm;
    @bottom-left { content: "${escapeCss(orgName)} · ${escapeCss(r.title.slice(0, 60))}"; font: 8pt -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #a8a29e; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #a8a29e; }
  }
  * { box-sizing: border-box; }
  html { background: var(--wash); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: var(--ink); font-family: var(--serif); line-height: 1.6; font-size: 15px; }
  .sheet { background: var(--paper); max-width: 800px; margin: 72px auto 48px; padding: 56px 64px 40px; box-shadow: 0 1px 3px rgba(28,25,23,.08), 0 8px 32px rgba(28,25,23,.06); }

  .masthead { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid var(--ink); font-family: var(--sans); }
  .org { display: flex; align-items: center; gap: 10px; }
  .mark { width: 30px; height: 30px; border-radius: 7px; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; }
  .org-name { font-weight: 650; font-size: 14px; letter-spacing: -0.01em; }
  .org-sub { font-size: 11px; color: var(--muted); }
  .issue { text-align: right; font-size: 11px; color: var(--muted); line-height: 1.5; }
  .issue b { color: var(--ink); font-weight: 600; }

  .kicker { margin: 36px 0 10px; font: 600 11px/1 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--brand); }
  h1 { font-size: 34px; line-height: 1.15; font-weight: 700; letter-spacing: -0.015em; margin: 0 0 12px; text-wrap: balance; }
  .dek { font-size: 19px; line-height: 1.45; color: var(--ink-2); font-style: italic; margin: 0 0 22px; text-wrap: pretty; }
  .facts { display: flex; flex-wrap: wrap; gap: 6px 18px; font: 12px/1.4 var(--sans); color: var(--muted); padding: 10px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .facts b { color: var(--ink-2); font-weight: 600; }

  h2 { font: 600 11px/1 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 40px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
  .summary { font-size: 17px; line-height: 1.6; margin: 28px 0 0; padding-left: 18px; border-left: 3px solid var(--brand); }

  /* cell rules are bottom/right shadows; the container clips the outer ones, so a short last row stays white */
  .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
  .metric { padding: 16px 16px 14px; box-shadow: 1px 1px 0 var(--rule); break-inside: avoid; }
  .metric .v { font: 650 22px/1.2 var(--sans); letter-spacing: -0.02em; color: var(--brand-ink); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .metric .k { margin-top: 6px; font: 12px/1.35 var(--sans); color: var(--muted); }

  .narrative { max-width: 66ch; }
  .narrative p { margin: 0 0 14px; text-wrap: pretty; }
  .narrative h2 { font: 700 21px/1.3 var(--serif); letter-spacing: -0.01em; text-transform: none; color: var(--ink); border: 0; padding: 0; margin: 30px 0 10px; break-after: avoid; }
  .narrative h3 { font: 600 16px/1.35 var(--sans); margin: 22px 0 8px; break-after: avoid; }
  .narrative ul, .narrative ol { padding-left: 22px; margin: 0 0 14px; }
  .narrative li { margin: 4px 0; }
  .narrative li::marker { color: var(--brand); }
  .narrative strong { font-weight: 700; }
  .narrative blockquote { margin: 18px 0; padding: 4px 0 4px 18px; border-left: 3px solid var(--brand-line); color: var(--ink-2); font-style: italic; font-size: 17px; }
  .narrative code { font: 12px ui-monospace, "SF Mono", Menlo, monospace; background: var(--wash); padding: 1px 5px; border-radius: 3px; }
  .narrative pre { font: 12px/1.5 ui-monospace, "SF Mono", Menlo, monospace; background: var(--wash); border: 1px solid var(--rule); padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }

  .cta { margin: 36px 0 0; padding: 20px 22px; border: 1px solid var(--brand-line); background: var(--brand-wash); border-radius: 8px; break-inside: avoid; }
  .cta .label { font: 600 11px/1 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--brand); }
  .cta .text { margin-top: 8px; font-size: 18px; line-height: 1.45; font-weight: 600; color: var(--brand-ink); }

  .appendix { break-before: page; }
  .appendix-intro { font: 13px/1.5 var(--sans); color: var(--muted); margin: -4px 0 18px; }
  .evidence { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .ev { margin: 0; break-inside: avoid; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; background: var(--paper); font-family: var(--sans); }
  .ev .media { position: relative; aspect-ratio: 4 / 3; background: var(--wash); }
  .ev img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .ev .ph { position: absolute; inset: 0; display: grid; place-items: center; color: var(--faint); font-size: 11px; text-transform: uppercase; letter-spacing: .1em; }
  .ev .n { position: absolute; top: 8px; left: 8px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: rgba(28,25,23,.82); color: #fff; font: 600 11px/22px var(--sans); text-align: center; }
  .ev figcaption { padding: 10px 12px 12px; font-size: 12px; line-height: 1.4; }
  .ev figcaption strong { font-weight: 600; }
  .ev figcaption p { margin: 6px 0; color: var(--ink-2); }
  .ev .prov { display: block; color: var(--faint); font-size: 10.5px; overflow-wrap: anywhere; }
  .badge { display: inline-block; margin-left: 4px; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; vertical-align: 1px; }
  .badge.ok { background: var(--brand-wash); color: var(--brand); }
  .badge.pending { background: var(--amber-wash); color: var(--amber); }

  .colophon { margin-top: 48px; padding-top: 14px; border-top: 1px solid var(--rule); font: 11px/1.5 var(--sans); color: var(--faint); display: flex; justify-content: space-between; gap: 24px; }

  .print-bar { position: fixed; inset: 0 0 auto 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--rule); font: 13px var(--sans); color: var(--ink-2); }
  .print-bar button { font: 600 13px var(--sans); background: var(--ink); color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
  .print-bar button:hover { background: var(--brand-ink); }
  .print-bar button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .print-bar .hint { color: var(--faint); font-size: 12px; margin-right: 10px; }

  @media (max-width: 720px) {
    .sheet { margin: 56px 0 0; padding: 28px 20px; box-shadow: none; }
    h1 { font-size: 27px; }
    .evidence { grid-template-columns: repeat(2, 1fr); }
    .masthead { flex-direction: column; align-items: flex-start; }
    .issue { text-align: left; }
    .print-bar .hint { display: none; }
  }
  @media print {
    html { background: none; }
    body { font-size: 10.5pt; }
    .print-bar { display: none; }
    .sheet { margin: 0; padding: 0; max-width: none; box-shadow: none; }
    .kicker { margin-top: 28px; }
    h1 { font-size: 24pt; }
    .dek { font-size: 13pt; }
    .summary { font-size: 12pt; }
    .colophon { display: none; }
  }
</style>
</head>
<body>
  <div class="print-bar">
    <span><strong>${escapeHtml(orgName)}</strong> · print preview</span>
    <span><span class="hint">or press Ctrl/⌘ + P</span><button onclick="window.print()">Save as PDF</button></span>
  </div>
  <main class="sheet">
    <header class="masthead">
      <div class="org">
        <div class="mark">${escapeHtml(orgName.charAt(0).toUpperCase())}</div>
        <div><div class="org-name">${escapeHtml(orgName)}</div><div class="org-sub">${report.project ? escapeHtml(report.project.name) : "Prepared with ImpactLens"}</div></div>
      </div>
      <div class="issue"><b>${issued}</b><br/>Ref ${escapeHtml(r.id.slice(-8).toUpperCase())}</div>
    </header>

    <div class="kicker">${escapeHtml(capitalize(r.type))} report</div>
    <h1>${escapeHtml(r.title)}</h1>
    ${r.headline ? `<p class="dek">${escapeHtml(r.headline)}</p>` : ""}
    <div class="facts">
      ${evidence.length ? `<span>Evidence <b>${evidence.length} asset${evidence.length === 1 ? "" : "s"}</b>, ${verifiedCount} human-verified</span>` : ""}
      <span>Tone <b>${escapeHtml(capitalize(r.tone ?? "professional"))}</b></span>
    </div>

    ${r.summary ? `<p class="summary">${escapeHtml(r.summary)}</p>` : ""}
    ${metricsRows ? `<h2>Key figures</h2><div class="metrics">${metricsRows}</div>` : ""}
    ${r.narrative ? `<h2>Report</h2><div class="narrative">${renderMarkdownLite(r.narrative)}</div>` : ""}
    ${r.callToAction ? `<div class="cta"><div class="label">What you can do</div><div class="text">${escapeHtml(r.callToAction)}</div></div>` : ""}
    ${
      evidenceHtml
        ? `<section class="appendix"><h2>Evidence</h2><p class="appendix-intro">The field media this report was written from, numbered as cited in the text. Each item carries its capture date and a reference to the original file.</p><div class="evidence">${evidenceHtml}</div></section>`
        : ""
    }
    <footer class="colophon">
      <span>Drafted with ImpactLens from AI-analysed field media. Verify the source assets before publication.</span>
      <span>Report ID ${escapeHtml(r.id)}</span>
    </footer>
  </main>
  <script>
    // Auto-open print dialog on load (user can cancel)
    window.addEventListener('load', function() { setTimeout(function(){ try { window.print(); } catch(e){} }, 400); });
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("report-pdf failed", err);
    return NextResponse.json({ error: "Failed to render report" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCss(s: string): string {
  return s.replace(/[\\"\n\r<>]/g, " ");
}

// "income_increase_percent": 40 → ["Income increase", "40%"]; "income_generated_usd" → "$18,000".
function formatMetric(key: string, v: string | number): [string, string] {
  const words = (k: string) => capitalize(k.replace(/[_\s-]+/g, " ").trim());
  const unit = typeof v === "number" ? /[_\s-](percent|pct|usd)$/i.exec(key) : null;
  if (typeof v !== "number") return [words(key), v];
  const n = v.toLocaleString("en-US");
  if (!unit) return [words(key), n];
  return [words(key.slice(0, unit.index)), unit[1].toLowerCase() === "usd" ? `$${n}` : `${n}%`];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Minimal markdown subset: headings, bold, italic, lists, blockquotes, code.
function renderMarkdownLite(md: string): string {
  // Escape first
  let s = escapeHtml(md);
  // Code blocks (fenced)
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code}</pre>`);
  // Headings
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  s = s.replace(/^# (.*)$/gm, "<h2>$1</h2>");
  // Bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Blockquote
  s = s.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
  // Inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Lists
  const lines = s.split("\n");
  let html = "";
  let inUl = false, inOl = false;
  for (const ln of lines) {
    if (/^- (.*)/.test(ln)) {
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${ln.replace(/^- /, "")}</li>`;
    } else if (/^\d+\. (.*)/.test(ln)) {
      if (!inOl) { html += "<ol>"; inOl = true; }
      html += `<li>${ln.replace(/^\d+\. /, "")}</li>`;
    } else {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
      if (ln.trim() === "" || /^<(h2|h3|pre|blockquote)/.test(ln.trim())) {
        html += ln;
      } else {
        html += `<p>${ln}</p>`;
      }
    }
  }
  if (inUl) html += "</ul>";
  if (inOl) html += "</ol>";
  return html;
}
