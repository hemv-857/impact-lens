"use client";

import { Leaf, Heart, Keyboard } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
            <Leaf className="size-3.5" />
          </span>
          <span>
            <strong className="font-semibold text-stone-700">ImpactLens</strong>{" "}
            — AI-Powered Impact & Sustainability Media Platform
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
          <span>
            Field media, AI intelligence, before/after comparison, reports &
            campaigns.
          </span>
          <span className="inline-flex items-center gap-1">
            Built with <Heart className="size-3 text-rose-400" /> using any
            OpenAI-compatible AI provider
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-stone-100 bg-stone-50 px-4 py-2 text-[11px] text-stone-400 sm:px-6">
        <span>
          Demo platform — sample field media may be AI-generated for
          illustration. Not affiliated with any real NGO.
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px] font-medium text-stone-500">
            ?
          </kbd>
          <Keyboard className="size-2.5" />
          shortcuts
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-stone-200 bg-white px-1 py-0.5 text-[9px] font-medium text-stone-500">
            ⌘K
          </kbd>
          command palette
        </span>
      </div>
    </footer>
  );
}
