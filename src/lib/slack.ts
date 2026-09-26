// Slack incoming-webhook notifier. Unconfigured → skipped, never fails caller
// (same contract as sendMail in email.ts).
export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL?.trim());
}

export async function notifySlack(
  text: string
): Promise<{ sent: boolean; reason?: string }> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return { sent: false, reason: "SLACK_WEBHOOK_URL not set" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return { sent: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
}
