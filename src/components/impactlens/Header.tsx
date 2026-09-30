"use client";

import * as React from "react";
import { Menu, Plus, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useImpactStore, type ImpactTab } from "@/lib/store";
import { AccountMenu } from "@/components/impactlens/AccountMenu";

/** Four sections, each answering one question. Views are the tabs inside a section. */
export const SECTIONS: {
  id: string;
  label: string;
  views: { id: ImpactTab; label: string }[];
}[] = [
  { id: "home", label: "Home", views: [{ id: "overview", label: "Home" }] },
  {
    id: "library",
    label: "Library",
    views: [
      { id: "library", label: "Media" },
      { id: "search", label: "Search" },
      { id: "timeline", label: "Timeline" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    views: [
      { id: "projects", label: "Projects" },
      { id: "compare", label: "Before / After" },
      { id: "insights", label: "Insights" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    views: [
      { id: "reports", label: "Reports" },
      { id: "campaign", label: "Campaigns" },
    ],
  },
];

export function sectionOf(tab: ImpactTab) {
  return SECTIONS.find((s) => s.views.some((v) => v.id === tab)) ?? SECTIONS[0];
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden className={cn("size-7", className)}>
      <rect width="30" height="30" rx="5" className="fill-stone-900 dark:fill-stone-100" />
      <circle cx="15" cy="15" r="8" fill="none" strokeWidth="2.2" className="stroke-stone-50 dark:stroke-stone-900" />
      <circle cx="15" cy="15" r="3" className="fill-emerald-400" />
    </svg>
  );
}

export function Header() {
  const activeTab = useImpactStore((s) => s.activeTab);
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const setPaletteOpen = useImpactStore((s) => s.setPaletteOpen);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const current = sectionOf(activeTab);

  const onPick = (t: ImpactTab) => {
    setTab(t);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-stone-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 md:gap-6">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className="flex shrink-0 items-center gap-2"
          aria-label="ImpactLens home"
        >
          <Mark />
          <span className="text-base font-semibold tracking-tight text-stone-900">ImpactLens</span>
        </button>

        <nav aria-label="Sections" className="hidden h-full items-stretch gap-1 md:flex">
          {SECTIONS.map((s) => {
            const active = s.id === current.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onPick(s.views[0].id)}
                className={cn(
                  "relative px-3 text-sm font-medium transition-colors",
                  active ? "text-stone-900" : "text-stone-500 hover:text-stone-900"
                )}
              >
                {s.label}
                <span
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-0.5 bg-stone-900 transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-8 w-52 items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 text-sm text-stone-500 transition hover:border-stone-300 lg:flex"
            title="Search and commands (⌘K)"
          >
            <Search className="size-3.5" />
            <span>Jump to…</span>
            <kbd className="ml-auto font-mono text-[11px] text-stone-400">⌘K</kbd>
          </button>
          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add media</span>
          </Button>
          <ThemeToggle />
          <AccountMenu />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-stone-200 p-4">
                <SheetTitle className="flex items-center gap-2">
                  <Mark className="size-6" />
                  ImpactLens
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                {SECTIONS.map((s) => (
                  <div key={s.id} className="py-1">
                    <button
                      type="button"
                      onClick={() => onPick(s.views[0].id)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm font-semibold",
                        s.id === current.id ? "text-stone-900" : "text-stone-600"
                      )}
                    >
                      {s.label}
                    </button>
                    {s.views.length > 1 &&
                      s.views.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => onPick(v.id)}
                          className={cn(
                            "w-full rounded-md py-1.5 pl-6 pr-3 text-left text-sm",
                            activeTab === v.id
                              ? "bg-stone-200/60 text-stone-900"
                              : "text-stone-500 hover:bg-stone-100"
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-8" aria-hidden="true" />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="hidden size-8 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-900 sm:flex"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
