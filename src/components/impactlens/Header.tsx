"use client";

import * as React from "react";
import { Menu, Leaf, Sparkles, Command, Search, Clock } from "lucide-react";
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

interface NavItem {
  id: ImpactTab;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: <Leaf className="size-4" /> },
  { id: "library", label: "Media Library", icon: <Sparkles className="size-4" /> },
  { id: "projects", label: "Projects", icon: <Leaf className="size-4" /> },
  { id: "compare", label: "Before / After", icon: <Leaf className="size-4" /> },
  { id: "timeline", label: "Timeline", icon: <Clock className="size-4" /> },
  { id: "reports", label: "Reports", icon: <Leaf className="size-4" /> },
  { id: "search", label: "Semantic Search", icon: <Leaf className="size-4" /> },
  { id: "campaign", label: "Campaign Studio", icon: <Leaf className="size-4" /> },
];

export function Header() {
  const activeTab = useImpactStore((s) => s.activeTab);
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const setPaletteOpen = useImpactStore((s) => s.setPaletteOpen);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const onPick = (t: ImpactTab) => {
    setTab(t);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => setTab("overview")}
          className="flex items-center gap-2.5 text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
            <Leaf className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-stone-900">
              Impact<span className="text-emerald-600">Lens</span>
            </span>
            <span className="hidden text-[10px] uppercase tracking-wider text-stone-400 sm:block">
              AI Sustainability Media
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: Command palette trigger + CTA + mobile menu */}
        <div className="flex items-center gap-2">
          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-500 transition hover:border-stone-300 hover:bg-stone-100 md:flex"
            title="Open command palette (Cmd+K)"
          >
            <Search className="size-3.5" />
            <span>Quick actions…</span>
            <kbd className="flex items-center gap-0.5 rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px] font-medium text-stone-400">
              <Command className="size-2.5" />K
            </kbd>
          </button>
          <Button
            onClick={() => setUploadOpen(true)}
            className="hidden bg-emerald-600 text-white hover:bg-emerald-700 sm:inline-flex"
            size="sm"
          >
            <Sparkles className="size-4" />
            Analyze media
          </Button>
          {/* Mobile sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-stone-200 p-4">
                <SheetTitle className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
                    <Leaf className="size-4" />
                  </span>
                  ImpactLens
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-2">
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPick(item.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-stone-700 hover:bg-stone-100"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                <div className="mt-2 border-t border-stone-200 pt-2">
                  <Button
                    onClick={() => {
                      setUploadOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Sparkles className="size-4" />
                    Analyze media
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
