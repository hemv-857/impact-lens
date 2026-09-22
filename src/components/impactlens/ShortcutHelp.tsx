"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X, Command, ArrowUpDown, CornerDownLeft, Search } from "lucide-react";
import { useImpactStore } from "@/lib/store";

interface ShortcutItem {
  keys: React.ReactNode;
  description: string;
  group: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: <><Command className="inline size-3" /> K</>, description: "Open command palette", group: "Global" },
  { keys: <kbd className="rounded border border-stone-200 bg-stone-50 px-1 text-[10px]">Esc</kbd>, description: "Close palette / dialogs", group: "Global" },
  { keys: <kbd className="rounded border border-stone-200 bg-stone-50 px-1 text-[10px]">?</kbd>, description: "Open this shortcut help", group: "Global" },
  { keys: <ArrowUpDown className="inline size-3" />, description: "Navigate list items", group: "Command palette" },
  { keys: <CornerDownLeft className="inline size-3" />, description: "Select highlighted command", group: "Command palette" },
  { keys: <><Search className="inline size-3" /> type</>, description: "Filter commands by keyword", group: "Command palette" },
  { keys: <kbd className="rounded border border-stone-200 bg-stone-50 px-1 text-[10px]">1-8</kbd>, description: "Jump to tab (Overview→Campaign, incl. Timeline)", group: "Navigation" },
  { keys: <kbd className="rounded border border-stone-200 bg-stone-50 px-1 text-[10px]">U</kbd>, description: "Open upload / analyze dialog", group: "Actions" },
];

export function ShortcutHelp() {
  const [open, setOpen] = React.useState(false);

  // Global ? shortcut + digit-tab shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.tagName === "SELECT";
      // ? opens help
      if (e.key === "?" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      // Digit shortcuts 1-8 → tabs (only when not typing and no modifier)
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && /^[1-8]$/.test(e.key)) {
        const tabs = ["overview", "library", "projects", "compare", "timeline", "reports", "search", "campaign"] as const;
        const idx = parseInt(e.key, 10) - 1;
        const tab = tabs[idx];
        if (tab) {
          e.preventDefault();
          useImpactStore.getState().setTab(tab);
        }
      }
      // U → upload dialog
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        useImpactStore.getState().setUploadOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const groups = React.useMemo(() => {
    const map = new Map<string, ShortcutItem[]>();
    for (const s of SHORTCUTS) {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <Keyboard className="size-4 text-emerald-600" />
                Keyboard shortcuts
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-4">
              {groups.map(([group, items]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {items.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-stone-50"
                      >
                        <span className="text-sm text-stone-700">{s.description}</span>
                        <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
                          {s.keys}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 bg-stone-50 px-5 py-2 text-center text-[11px] text-stone-400">
              Press <kbd className="rounded border border-stone-200 bg-white px-1 text-[10px]">?</kbd> anywhere to open this help
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
