"use client";

import * as React from "react";
import { MapPin, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { Project } from "@/lib/types";

// Category → pin color map (earthy palette, no blue/indigo)
const CATEGORY_PIN_COLORS: Record<string, { fill: string; glow: string }> = {
  reforestation: { fill: "#16a34a", glow: "rgba(22,163,74,0.6)" },
  solar: { fill: "#d97706", glow: "rgba(217,119,6,0.6)" },
  water: { fill: "#0891b2", glow: "rgba(8,145,178,0.6)" },
  education: { fill: "#7c3aed", glow: "rgba(124,58,237,0.5)" },
  cleanup: { fill: "#0d9488", glow: "rgba(13,148,136,0.6)" },
  agriculture: { fill: "#65a30d", glow: "rgba(101,163,13,0.6)" },
  infrastructure: { fill: "#78716c", glow: "rgba(120,113,108,0.6)" },
  conservation: { fill: "#059669", glow: "rgba(5,150,105,0.6)" },
  community: { fill: "#e11d48", glow: "rgba(225,29,72,0.5)" },
  energy: { fill: "#ea580c", glow: "rgba(234,88,12,0.6)" },
  other: { fill: "#a8a29e", glow: "rgba(168,162,158,0.5)" },
  default: { fill: "#f59e0b", glow: "rgba(245,158,11,0.6)" },
};

/**
 * MapView — a lightweight, dependency-free world map visualization.
 * Projects with lat/lng are placed on a simplified equirectangular projection
 * (lon -180..180 → 0..100% x; lat 90..-90 → 0..100% y).
 * Clicking a pin selects it and shows a detail card.
 *
 * Uses an inline SVG world map silhouette (low-poly) so no external assets.
 */
export function MapView({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect?: (p: Project) => void;
}) {
  const [selected, setSelected] = React.useState<Project | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);

  const mapped = projects.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number"
  );

  // Equirectangular projection: x = (lng+180)/360, y = (90-lat)/180
  const projectXY = (p: Project) => ({
    x: ((p.lng! + 180) / 360) * 100,
    y: ((90 - p.lat!) / 180) * 100,
  });

  if (mapped.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Globe2 className="size-4 text-emerald-600" />
          Project map
        </h3>
        <EmptyState
          emoji="🗺️"
          title="No mapped projects"
          description="Add coordinates (lat/lng) to projects to see them on the world map."
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-stone-100 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Globe2 className="size-4 text-emerald-600" />
            Project map
          </h3>
          <p className="text-xs text-stone-500">{mapped.length} projects across the globe</p>
        </div>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-teal-950">
        {/* Stylized world map silhouette (simplified continents as SVG paths) */}
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#134e4a" />
            </linearGradient>
            <radialGradient id="pinGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="500" fill="url(#ocean)" />
          {/* Latitude/longitude grid */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 62.5}
              x2="1000"
              y2={i * 62.5}
              stroke="#0d9488"
              strokeOpacity="0.18"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 83.3}
              y1="0"
              x2={i * 83.3}
              y2="500"
              stroke="#0d9488"
              strokeOpacity="0.18"
              strokeWidth="0.5"
            />
          ))}
          {/* Simplified continent silhouettes (rough paths) */}
          <g fill="#0c3b34" fillOpacity="0.85" stroke="#0f766e" strokeWidth="0.8">
            {/* North America */}
            <path d="M 80 110 Q 120 90 180 100 L 230 95 Q 270 100 285 130 L 290 175 Q 270 210 240 230 L 200 250 Q 160 245 140 220 L 110 190 Q 85 160 80 110 Z" />
            {/* South America */}
            <path d="M 240 270 Q 270 260 290 280 L 295 320 Q 285 370 270 410 L 250 440 Q 230 420 225 380 L 230 320 Z" />
            {/* Europe */}
            <path d="M 470 110 Q 500 95 530 100 L 555 115 Q 560 140 540 160 L 510 165 Q 480 155 470 135 Z" />
            {/* Africa */}
            <path d="M 490 190 Q 520 180 555 190 L 575 230 Q 570 290 550 340 L 525 370 Q 500 350 490 310 L 485 250 Z" />
            {/* Asia */}
            <path d="M 560 95 Q 620 85 700 95 L 780 110 Q 830 120 860 150 L 870 190 Q 840 220 790 225 L 700 215 Q 630 205 580 180 L 555 150 Z" />
            {/* Southeast Asia / Indonesia */}
            <path d="M 770 250 Q 800 245 830 255 L 845 270 Q 835 285 810 285 L 780 275 Z" />
            {/* Australia */}
            <path d="M 820 310 Q 855 300 885 315 L 895 340 Q 880 360 850 360 L 825 350 Q 815 330 820 310 Z" />
          </g>
        </svg>

        {/* Project pins (HTML positioned over SVG) */}
        {mapped.map((p) => {
          const { x, y } = projectXY(p);
          const isSelected = selected?.id === p.id;
          const isHover = hover === p.id;
          const catColor = CATEGORY_PIN_COLORS[p.category ?? ""] ?? CATEGORY_PIN_COLORS.default;
          return (
            <button
              key={p.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(p);
                onSelect?.(p);
              }}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              aria-label={`${p.name} — ${p.location}`}
            >
              {/* Glow */}
              <span
                className="absolute left-1/2 top-1/2 -z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 transition-all"
                style={{
                  background: `radial-gradient(circle, ${catColor.glow} 0%, transparent 70%)`,
                  transform: isSelected || isHover ? "scale(1.6)" : "scale(1)",
                }}
              />
              {/* Pin */}
              <span
                className={`block rounded-full border-2 shadow-lg transition-all ${
                  isSelected
                    ? "size-4 border-white"
                    : isHover
                      ? "size-3.5 border-white/80"
                      : "size-3 border-white/70"
                }`}
                style={{ background: catColor.fill }}
              />
              {/* Label on hover/select */}
              {(isHover || isSelected) && (
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
                  {p.name}
                </span>
              )}
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-1 rounded-md bg-stone-900/80 px-2.5 py-1.5 text-[10px] text-emerald-50 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-amber-400" />
            <span>{mapped.length} project sites</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {Object.entries(CATEGORY_PIN_COLORS).filter(([k]) => k !== "default").map(([cat, c]) => (
              <span key={cat} className="flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: c.fill }} />
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selected project detail */}
      {selected && (
        <div className="border-t border-stone-100 bg-stone-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-semibold text-stone-900">
                  {selected.name}
                </h4>
                <CategoryBadge category={selected.category} />
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="size-3" /> {selected.location}
                {typeof selected.lat === "number" && (
                  <span className="ml-2 font-mono text-[10px] text-stone-400">
                    {selected.lat!.toFixed(2)}°, {selected.lng!.toFixed(2)}°
                  </span>
                )}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                selected.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : selected.status === "completed"
                    ? "bg-stone-100 text-stone-600 border-stone-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
              }
            >
              {selected.status}
            </Badge>
          </div>
          {selected.description && (
            <p className="mt-2 line-clamp-2 text-xs text-stone-600">
              {selected.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
            <span>{selected.assetCount ?? 0} assets</span>
            {selected.sdgGoals && (
              <span className="flex items-center gap-1">
                SDG: {selected.sdgGoals.split(",").map((g) => (
                  <Badge key={g} variant="secondary" className="bg-teal-50 text-teal-700 px-1.5 py-0 text-[10px]">
                    {g.trim()}
                  </Badge>
                ))}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
