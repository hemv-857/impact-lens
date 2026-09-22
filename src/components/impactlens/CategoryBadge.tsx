"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface CategoryStyle {
  /** Tailwind classes for solid badge */
  badge: string;
  /** Tailwind classes for soft/dot color */
  dot: string;
  /** Accent text color */
  text: string;
}

/**
 * Earthy color map for each category. Avoids indigo/blue entirely.
 */
export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  reforestation: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  solar: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  water: {
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    dot: "bg-teal-500",
    text: "text-teal-700",
  },
  education: {
    badge: "bg-stone-200 text-stone-800 border-stone-300",
    dot: "bg-stone-600",
    text: "text-stone-700",
  },
  cleanup: {
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-600",
    text: "text-cyan-700",
  },
  agriculture: {
    badge: "bg-lime-100 text-lime-800 border-lime-300",
    dot: "bg-lime-600",
    text: "text-lime-700",
  },
  infrastructure: {
    badge: "bg-stone-100 text-stone-700 border-stone-300",
    dot: "bg-stone-500",
    text: "text-stone-600",
  },
  conservation: {
    badge: "bg-green-100 text-green-800 border-green-300",
    dot: "bg-green-600",
    text: "text-green-700",
  },
  community: {
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  energy: {
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  other: {
    badge: "bg-stone-100 text-stone-600 border-stone-300",
    dot: "bg-stone-400",
    text: "text-stone-500",
  },
};

export function categoryStyle(cat?: string | null): CategoryStyle {
  if (!cat) return CATEGORY_STYLES.other;
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.other;
}

export function CategoryBadge({
  category,
  className,
  compact = false,
}: {
  category?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const s = categoryStyle(category);
  const label = category ?? "uncategorized";
  return (
    <Badge
      variant="outline"
      className={cn(s.badge, "capitalize", compact ? "px-1.5 py-0 text-[9px]" : className)}
    >
      {compact ? label.slice(0, 6) : label}
    </Badge>
  );
}
