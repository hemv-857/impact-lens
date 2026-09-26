"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, LogOut } from "lucide-react";
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

export function AccountMenu() {
  const { data: session, update } = useSession();
  const qc = useQueryClient();
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[190px] gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            {initial}
          </span>
          <span className="truncate text-xs font-medium">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-stone-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut({ callbackUrl: "/auth" })}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
