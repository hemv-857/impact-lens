"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, LogOut, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchOrgs } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function AccountMenu({ wide = false }: { wide?: boolean }) {
  const { data: session, update } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const orgsQ = useQuery({
    queryKey: ["auth", "orgs"],
    queryFn: fetchOrgs,
    enabled: !!session,
  });

  if (!session) return null;

  const active = orgsQ.data?.find((o) => o.active);
  const label = active?.name ?? session.user?.name ?? session.user?.email ?? "Account";
  const initial = (session.user?.name || session.user?.email || "?").charAt(0).toUpperCase();

  const switchOrg = async (orgId: string) => {
    if (orgId === active?.id) return;
    await update({ orgId });
    // Everything below is scoped by org — drop it all so it refetches.
    await qc.invalidateQueries();
  };

  // ponytail: native prompt is enough for a one-field form; swap for a Dialog if it grows.
  const createOrg = async () => {
    const name = window.prompt("New organization name");
    if (!name?.trim()) return;
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(data.error || "Could not create organization");
      return;
    }
    await update({ orgId: data.id });
    await qc.invalidateQueries();
  };

  // F9: owners hand out a copyable invite code; rotating it revokes the old one.
  const shareInvite = async (regenerate: boolean) => {
    if (regenerate && !window.confirm("Regenerate? The current invite code stops working.")) return;
    const res = await fetch("/api/org/invite", { method: regenerate ? "POST" : "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.code) {
      toast({ title: "Invite code", description: data.error || "Could not fetch invite code", variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(data.code).catch(() => undefined);
    toast({ title: regenerate ? "New invite code copied" : "Invite code copied", description: `Share “${data.code}” — people enter it on sign-up to join ${data.name}.` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {wide ? (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-stone-100 dark:hover:bg-[#1b1714]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-stone-900">{label}</span>
              <span className="block truncate text-xs text-stone-500">{session.user?.email}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-stone-400" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="max-w-[190px] gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
              {initial}
            </span>
            <span className="hidden truncate text-xs font-medium sm:inline">{label}</span>
            <ChevronDown className="hidden size-3.5 shrink-0 text-stone-400 sm:block" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={wide ? "start" : "end"} side={wide ? "top" : "bottom"} className="w-64">
        <DropdownMenuLabel className="truncate text-xs text-stone-500">
          {session.user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgsQ.data && orgsQ.data.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-400">
              Organizations
            </DropdownMenuLabel>
            {orgsQ.data.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onSelect={() => void switchOrg(org.id)}
                className="gap-2"
              >
                <Building2 className="size-4 text-stone-400" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                <span className="text-[10px] uppercase text-stone-400">{org.role}</span>
                {org.active && <Check className="size-4 text-emerald-600" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => void createOrg()} className="gap-2">
          <Building2 className="size-4 text-stone-400" />
          New organization…
        </DropdownMenuItem>
        {active?.role === "owner" && (
          <>
            <DropdownMenuItem onSelect={() => void shareInvite(false)} className="gap-2">
              <UserPlus className="size-4 text-stone-400" />
              Copy invite code
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void shareInvite(true)} className="gap-2">
              <RefreshCw className="size-4 text-stone-400" />
              Regenerate invite code
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // Navigate relatively: signOut()'s server-provided URL uses the
            // NEXTAUTH_URL default (localhost:3000) when that env is unset.
            void signOut({ redirect: false }).then(() => {
              window.location.href = "/auth";
            });
          }}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
