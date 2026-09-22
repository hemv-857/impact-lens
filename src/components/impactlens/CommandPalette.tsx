"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Images,
  FolderKanban,
  GitCompareArrows,
  FileText,
  Search as SearchIcon,
  Megaphone,
  Upload,
  Sparkles,
  CornerDownLeft,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useImpactStore, type ImpactTab } from "@/lib/store";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: "Navigate" | "Actions";
  keywords?: string[];
  action: () => void;
}

export function CommandPalette() {
  const open = useImpactStore((s) => s.paletteOpen);
  const setOpen = useImpactStore((s) => s.setPaletteOpen);
  const setTab = useImpactStore((s) => s.setTab);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);

  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useImpactStore.getState().paletteOpen);
      }
      if (e.key === "Escape" && useImpactStore.getState().paletteOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = React.useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: "nav-overview", label: "Overview", hint: "Dashboard home", icon: <LayoutDashboard className="size-4" />, group: "Navigate", keywords: ["home", "dashboard", "stats"], action: () => setTab("overview") },
      { id: "nav-library", label: "Media Library", hint: "Browse assets", icon: <Images className="size-4" />, group: "Navigate", keywords: ["media", "assets", "photos", "images"], action: () => setTab("library") },
      { id: "nav-projects", label: "Projects", hint: "Initiatives & map", icon: <FolderKanban className="size-4" />, group: "Navigate", keywords: ["projects", "initiatives", "map"], action: () => setTab("projects") },
      { id: "nav-compare", label: "Before / After", hint: "Compare media", icon: <GitCompareArrows className="size-4" />, group: "Navigate", keywords: ["compare", "before", "after", "diff"], action: () => setTab("compare") },
      { id: "nav-reports", label: "Reports", hint: "Impact reports", icon: <FileText className="size-4" />, group: "Navigate", keywords: ["reports", "impact", "donor"], action: () => setTab("reports") },
      { id: "nav-search", label: "Semantic Search", hint: "AI search", icon: <SearchIcon className="size-4" />, group: "Navigate", keywords: ["search", "semantic", "ai"], action: () => setTab("search") },
      { id: "nav-campaign", label: "Campaign Studio", hint: "Social content", icon: <Megaphone className="size-4" />, group: "Navigate", keywords: ["campaign", "social", "instagram", "twitter"], action: () => setTab("campaign") },
    ];
    const actions: CommandItem[] = [
      { id: "act-upload", label: "Analyze new media", hint: "Upload or generate", icon: <Upload className="size-4" />, group: "Actions", keywords: ["upload", "analyze", "ingest", "new"], action: () => { setUploadOpen(true); } },
      { id: "act-report", label: "Generate report", hint: "Jump to Reports", icon: <Sparkles className="size-4" />, group: "Actions", keywords: ["generate", "report", "impact"], action: () => setTab("reports") },
      { id: "act-campaign", label: "Generate campaign", hint: "Jump to Campaign Studio", icon: <Megaphone className="size-4" />, group: "Actions", keywords: ["generate", "campaign", "social"], action: () => setTab("campaign") },
    ];
    return [...nav, ...actions];
  }, [setTab, setUploadOpen]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [item.label, item.hint ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  // Reset active index when filter changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) {
        item.action();
        setOpen(false);
      }
    }
  };

  // Scroll active item into view
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-stone-900/40 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <Search className="size-4 text-stone-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search commands or jump to a tab…"
                className="flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
              <kbd className="hidden items-center gap-0.5 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 sm:flex">
                <Command className="size-2.5" />K
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-stone-400">
                  No commands match “{query}”
                </div>
              ) : (
                <>
                  {["Navigate", "Actions"].map((group) => {
                    const groupItems = filtered.filter((i) => i.group === group);
                    if (groupItems.length === 0) return null;
                    return (
                      <div key={group} className="mb-1">
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          {group}
                        </div>
                        {groupItems.map((item) => {
                          const idx = filtered.indexOf(item);
                          const isActive = idx === activeIndex;
                          return (
                            <button
                              key={item.id}
                              data-idx={idx}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => {
                                item.action();
                                setOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition",
                                isActive ? "bg-emerald-50" : "hover:bg-stone-50"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-7 items-center justify-center rounded-md",
                                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                                )}
                              >
                                {item.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-sm font-medium", isActive ? "text-emerald-900" : "text-stone-800")}>
                                  {item.label}
                                </p>
                                {item.hint && (
                                  <p className="text-[11px] text-stone-400">{item.hint}</p>
                                )}
                              </div>
                              {isActive && (
                                <CornerDownLeft className="size-3.5 text-emerald-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-2 text-[11px] text-stone-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px]">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px]">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px]">esc</kbd>
                  close
                </span>
              </div>
              <span className="text-stone-300">ImpactLens Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
