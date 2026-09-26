// GET /api/report-pdf?id=<reportId>
// Returns a print-ready HTML page for the report (opens in new tab; user clicks
// Ctrl+P / browser print → save as PDF). This avoids heavy PDF libs.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReport } from "@/lib/serialize";
import { formatDateTime } from "@/lib/format";
import { getAuthContext, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const report = await db.report.findFirst({ where: { id, orgId: auth.orgId } });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const r = serializeReport(report);

    const metricsRows = r.metrics
      ? Object.entries(r.metrics)
          .map(
            ([k, v]) => `<div class="metric"><div class="v">${String(v)}</div><div class="k">${escapeHtml(k.replace(/[_-]/g, " "))}</div></div>`
          )
          .join("")
      : "";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(r.title)} — ImpactLens Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 24px; }
  .brand-bar { background: linear-gradient(135deg, #047857 0%, #0f766e 50%, #134e4a 100%); color: white; padding: 20px 24px; border-radius: 8px; margin: -24px -24px 24px; }
  .brand-bar .brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85; }
  .brand-bar .doc-type { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; background: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 999px; display: inline-block; margin-top: 6px; }
  h1 { font-size: 26px; font-weight: 700; margin: 16px 0 4px; line-height: 1.2; }
  .headline { font-size: 15px; color: #047857; font-style: italic; margin: 4px 0 12px; font-weight: 600; }
  .meta { font-size: 11px; color: #78716c; margin-bottom: 20px; border-bottom: 1px solid #e7e5e4; padding-bottom: 10px; }
  .summary { background: #f5f5f4; border-left: 4px solid #047857; padding: 12px 16px; margin: 16px 0; font-size: 13px; border-radius: 0 4px 4px 0; }
  .summary .label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #78716c; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #047857; margin: 22px 0 8px; border-bottom: 1px solid #d6d3d1; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 6px; color: #1c1917; }
  p { font-size: 13px; margin: 8px 0; }
  ul, ol { font-size: 13px; padding-left: 22px; }
  li { margin: 4px 0; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .metric { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px; text-align: center; }
  .metric .v { font-size: 20px; font-weight: 700; color: #047857; }
  .metric .k { font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; }
  .cta { background: linear-gradient(135deg, #047857, #134e4a); color: white; padding: 14px 18px; border-radius: 8px; margin: 24px 0 8px; }
  .cta .label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85; }
  .cta .text { font-size: 14px; font-weight: 600; margin-top: 4px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e7e5e4; font-size: 10px; color: #a8a29e; text-align: center; }
  .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1c1917; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-family: -apple-system, sans-serif; font-size: 13px; z-index: 100; }
  .print-bar button { background: #047857; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .print-bar button:hover { background: #065f46; }
  .print-bar .hint { opacity: 0.7; font-size: 11px; }
  @media print { .print-bar { display: none; } body { padding: 0; } .brand-bar { margin: 0 0 16px; } }
  .narrative { font-size: 13px; }
  .narrative strong { font-weight: 700; color: #1c1917; }
  .narrative blockquote { border-left: 3px solid #047857; padding-left: 12px; margin: 10px 0; color: #57534e; font-style: italic; }
  .narrative code { background: #f5f5f4; padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: 'Courier New', monospace; }
</style>
</head>
<body>
  <div class="print-bar">
    <span><strong>ImpactLens</strong> — Print / Save as PDF</span>
    <span>
      <button onclick="window.print()">Print / Save PDF</button>
      <span class="hint" style="margin-left:8px">Ctrl+P</span>
    </span>
  </div>
  <div class="brand-bar">
    <div class="brand">ImpactLens · AI Impact Media</div>
    <div class="doc-type">${escapeHtml(r.type)} report · ${escapeHtml(r.tone ?? "professional")} tone</div>
  </div>
  <h1>${escapeHtml(r.title)}</h1>
  ${r.headline ? `<div class="headline">${escapeHtml(r.headline)}</div>` : ""}
  <div class="meta">Generated ${formatDateTime(r.createdAt)} · Report ID ${escapeHtml(r.id)}</div>
  ${r.summary ? `<div class="summary"><div class="label">Executive summary</div>${escapeHtml(r.summary)}</div>` : ""}
  ${metricsRows ? `<h2>Metrics &amp; KPIs</h2><div class="metrics">${metricsRows}</div>` : ""}
  ${r.narrative ? `<h2>Full report</h2><div class="narrative">${renderMarkdownLite(r.narrative)}</div>` : ""}
  ${r.callToAction ? `<div class="cta"><div class="label">Call to action</div><div class="text">${escapeHtml(r.callToAction)}</div></div>` : ""}
  <div class="footer">
    Generated by ImpactLens — AI-Powered Impact &amp; Sustainability Media Platform<br/>
    This report was produced from AI-analyzed field media evidence. Verify source assets before publication.
  </div>
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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

// Minimal markdown subset: headings, bold, italic, lists, blockquotes, code.
function renderMarkdownLite(md: string): string {
  // Escape first
  let s = escapeHtml(md);
  // Code blocks (fenced)
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre style="background:#1c1917;color:#f5f5f4;padding:12px;border-radius:6px;overflow-x:auto;font-size:11px">${code}</pre>`);
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
