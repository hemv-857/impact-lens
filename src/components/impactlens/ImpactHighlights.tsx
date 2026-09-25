"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Quote, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useImpactStore } from "@/lib/store";

interface Highlight {
  emoji: string;
  title: string;
  description: string;
  metric?: { value: string; label: string };
  accent: string; // tailwind gradient classes
  tab?: "library" | "projects" | "compare" | "reports" | "search" | "campaign" | "timeline";
}

const HIGHLIGHTS: Highlight[] = [
  {
    emoji: "🌍",
    title: "Global reach across 10 countries",
    description: "Your projects span from Kenya's Rift Valley to the Scottish Highlands, covering diverse ecosystems and communities.",
    metric: { value: "10", label: "regions" },
    accent: "from-emerald-600 to-teal-700",
    tab: "projects",
  },
  {
    emoji: "🤖",
    title: "100% AI-analyzed evidence",
    description: "Every media asset has been processed through computer-vision AI, extracting captions, signals, objects, and confidence scores.",
    metric: { value: "100%", label: "analyzed" },
    accent: "from-teal-600 to-emerald-800",
    tab: "library",
  },
  {
    emoji: "📊",
    title: "Impact reports ready for donors",
    description: "Generate professional, evidence-backed impact reports in seconds — complete with metrics, narrative, and call-to-action.",
    metric: { value: "PDF", label: "export" },
    accent: "from-amber-500 to-orange-600",
    tab: "reports",
  },
  {
    emoji: "⚖️",
    title: "Before / after visual comparison",
    description: "Demonstrate visible change with AI-powered before/after analysis — vegetation recovery, infrastructure progress, and more.",
    metric: { value: "VLM", label: "comparison" },
    accent: "from-lime-600 to-emerald-700",
    tab: "compare",
  },
  {
    emoji: "📣",
    title: "Campaign Studio with platform previews",
    description: "Generate platform-ready social content with realistic mockups for Instagram, LinkedIn, Twitter, and newsletters.",
    metric: { value: "4", label: "platforms" },
    accent: "from-orange-500 to-rose-600",
    tab: "campaign",
  },
];

const ROTATION_MS = 6000;

/**
 * ImpactHighlights — an auto-rotating carousel of featured impact stories.
 * Pauses on hover. Each slide has an emoji, title, description, metric, and CTA.
 */
export function ImpactHighlights() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const setTab = useImpactStore((s) => s.setTab);

  React.useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % HIGHLIGHTS.length);
    }, ROTATION_MS);
    return () => clearInterval(t);
  }, [paused]);

  const current = HIGHLIGHTS[index];

  return (
    <Card
      className={cn(
        "relative overflow-hidden gap-0 border-0 p-0 shadow-lg",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={cn("relative bg-gradient-to-br p-6 text-white sm:p-8", current.accent)}
        >
          {/* Decorative pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 size-48 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-12 -left-8 size-40 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{current.emoji}</span>
                <Badge className="border-white/20 bg-white/15 text-white backdrop-blur">
                  <Sparkles className="mr-1 size-3" />
                  Featured
                </Badge>
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {current.title}
              </h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/90">
                {current.description}
              </p>
              {current.tab && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 bg-white/95 text-stone-800 hover:bg-white"
                  onClick={() => setTab(current.tab!)}
                >
                  Explore <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>

            {/* Metric */}
            {current.metric && (
              <div className="shrink-0 rounded-xl bg-white/15 p-4 text-center backdrop-blur">
                <p className="text-3xl font-bold tabular-nums">{current.metric.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/80">{current.metric.label}</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between bg-stone-900 px-4 py-2">
        <div className="flex items-center gap-1.5">
          {HIGHLIGHTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-emerald-400" : "w-1.5 bg-stone-600 hover:bg-stone-500"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-stone-400">
            {index + 1} / {HIGHLIGHTS.length}
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded p-1 text-stone-400 transition hover:text-white"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
        </div>
      </div>
    </Card>
  );
}
