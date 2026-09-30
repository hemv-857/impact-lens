"use client";

import * as React from "react";
import { FileText, FolderKanban, Home, Images, Menu, Moon, Plus, Search, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useImpactStore, type ImpactTab } from "@/lib/store";
import { useMedia } from "@/components/impactlens/impact-hooks";
import { AccountMenu } from "@/components/impactlens/AccountMenu";

/** Four sections, each answering one question. Views are the tabs inside a section. */
export const SECTIONS: {
  id: string;
  label: string;
  icon: LucideIcon;
  views: { id: ImpactTab; label: string }[];
}[] = [
  { id: "home", label: "Home", icon: Home, views: [{ id: "overview", label: "Home" }] },
  {
    id: "library",
    label: "Library",
    icon: Images,
    views: [
      { id: "library", label: "Media" },
      { id: "search", label: "Search" },
      { id: "timeline", label: "Timeline" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    views: [
      { id: "projects", label: "Projects" },
      { id: "compare", label: "Before / After" },
      { id: "insights", label: "Insights" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    views: [
      { id: "reports", label: "Reports" },
      { id: "campaign", label: "Campaigns" },
    ],
  },
];

export function sectionOf(tab: ImpactTab) {
  return SECTIONS.find((s) => s.views.some((v) => v.id === tab)) ?? SECTIONS[0];
}

/** The lens: an ember tile, an aperture ring, a point of focus. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden className={cn("size-7", className)}>
      <rect width="30" height="30" rx="8" className="fill-emerald-600" />
      <circle cx="15" cy="15" r="8" fill="none" strokeWidth="2.4" className="stroke-white dark:stroke-[#1c0f06]" />
      <circle cx="15" cy="15" r="2.6" className="fill-white dark:fill-[#1c0f06]" />
    </svg>
  );
}

function SectionNav({ onPick }: { onPick: (t: ImpactTab) => void }) {
  const activeTab = useImpactStore((s) => s.activeTab);
  const current = sectionOf(activeTab);
  // Shares the Home query's cache key, so this costs no extra request.
  const mediaQ = useMedia({ limit: 200 });
  const toReview = (mediaQ.data ?? []).filter((a) => !a.verified).length;
  const navId = React.useId();

  return (
    <nav aria-label="Sections" className="flex flex-col gap-0.5 px-3">
      {SECTIONS.map((s) => {
        const active = s.id === current.id;
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-describedby={s.id === "home" && toReview > 0 ? `${navId}-review` : undefined}
            onClick={() => onPick(s.views[0].id)}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-stone-100 text-stone-900 dark:bg-[#231e1a]"
                : "text-stone-500 hover:bg-stone-100/70 hover:text-stone-900 dark:hover:bg-[#1b1714]"
            )}
          >
            <Icon
              className={cn("size-[18px] shrink-0", active ? "text-emerald-600" : "text-stone-400 group-hover:text-stone-600")}
              strokeWidth={1.75}
            />
            {s.label}
            {s.id === "home" && toReview > 0 && (
              <span
                id={`${navId}-review`}
                aria-hidden="true"
                className="ml-auto rounded-md bg-emerald-50 px-1.5 text-xs font-semibold tabular-nums leading-5 text-emerald-700"
                title={`${toReview} awaiting review`}
              >
                {toReview}
                <span className="sr-only"> awaiting review</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5" aria-label="ImpactLens home">
      <Mark />
      <span className="text-base font-semibold tracking-tight text-stone-900">ImpactLens</span>
    </button>
  );
}

/** Desktop: fixed left rail. Below lg the same nav lives in a sheet opened from the top bar. */
export function Sidebar() {
  const setTab = useImpactStore((s) => s.setTab);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Brand onClick={() => setTab("overview")} />
      </div>
      <div className="mt-4 flex-1">
        <SectionNav onPick={setTab} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <AccountMenu wide />
      </div>
    </aside>
  );
}

export function Header() {
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const setPaletteOpen = useImpactStore((s) => s.setPaletteOpen);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const onPick = (t: ImpactTab) => {
    setTab(t);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 border-sidebar-border bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center px-6">
              <Brand onClick={() => onPick("overview")} />
            </div>
            <div className="mt-2 flex-1">
              <SectionNav onPick={onPick} />
            </div>
            <div className="border-t border-sidebar-border p-3">
              <AccountMenu wide />
            </div>
          </SheetContent>
        </Sheet>
        <div className="lg:hidden">
          <Brand onClick={() => setTab("overview")} />
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-400 transition-colors hover:border-stone-300 md:flex"
          title="Search and commands (⌘K)"
        >
          <Search className="size-4" />
          <span>Search assets, projects, reports…</span>
          <kbd className="ml-auto rounded border border-stone-200 px-1.5 font-mono text-[11px] text-stone-400">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="size-5" />
          </Button>
          <ThemeToggle />
          <Button
            onClick={() => setUploadOpen(true)}
            className="h-10 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add media</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-10" aria-hidden="true" />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      aria-pressed={dark}
      title={dark ? "Light theme" : "Dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="hidden size-10 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:flex"
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
