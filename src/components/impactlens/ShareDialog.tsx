"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link2, Unlink } from "lucide-react";

interface ShareState {
  active: boolean;
  url: string | null;
  note: string;
}

const MAX_NOTE = 500;

/**
 * Share options for one report: optional viewer note + copy/revoke the
 * public read-only link. Fetches current state from GET /share on open.
 */
export function ShareDialog({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = React.useState<ShareState | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!open || !reportId) return;
    setState(null);
    setNote("");
    let cancelled = false;
    fetch(`/api/reports/${reportId}/share`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: ShareState) => {
        if (cancelled) return;
        setState(s);
        setNote(s.note);
      })
      .catch(() => {
        if (!cancelled)
          toast({ title: "Could not load share state", variant: "destructive" });
      });
    return () => {
      cancelled = true;
    };
  }, [open, reportId, toast]);

  const copyLink = async () => {
    if (!reportId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const body = (await res.json().catch(() => null)) as
        | { url?: string; note?: string; error?: string }
        | null;
      if (!res.ok || !body?.url) throw new Error(body?.error ?? "Request failed");
      await navigator.clipboard.writeText(`${window.location.origin}${body.url}`);
      setState({ active: true, url: body.url, note: body.note ?? note });
      toast({
        title: "Share link copied",
        description: "Anyone with the link can read this report.",
      });
    } catch (e) {
      toast({
        title: "Share failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!reportId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
      setState((s) => (s ? { ...s, active: false, url: null } : s));
      toast({ title: "Share link revoked", description: "The old link now 404s." });
    } catch (e) {
      toast({
        title: "Revoke failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-emerald-600" /> Share report
            {state?.active && (
              <Badge className="bg-emerald-100 text-emerald-800">Link active</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            A public read-only link — no sign-in needed. You can revoke it anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label htmlFor="share-note" className="text-sm font-medium text-stone-700">
            Note for viewers <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <Textarea
            id="share-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE}
            placeholder="e.g. For the board deck — figures final as of this date"
            className="min-h-20"
          />
          <p className="text-right text-xs text-stone-400">{note.length}/{MAX_NOTE}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {state?.active && (
            <Button variant="outline" onClick={revoke} disabled={busy}>
              <Unlink className="size-4" /> Revoke
            </Button>
          )}
          <Button onClick={copyLink} disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Copy className="size-4" /> {state?.active ? "Copy link" : "Create & copy link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
