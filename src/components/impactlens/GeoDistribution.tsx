"use client";

import * as React from "react";
import { Globe2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/impactlens/EmptyState";
import type { Project } from "@/lib/types";

/**
 * GeoDistribution — groups projects by country (parsed from the `location`
 * field) and renders a ranked list with project counts + mini bar gauge.
 */
export function GeoDistribution({ projects }: { projects: Project[] }) {
  const groups = React.useMemo(() => {
    const map = new Map<string, { country: string; count: number; projects: Project[] }>();
    for (const p of projects) {
      const country = extractCountry(p.location);
      const key = country;
      if (!map.has(key)) map.set(key, { country, count: 0, projects: [] });
      const g = map.get(key)!;
      g.count++;
      g.projects.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [projects]);

  const max = groups.length > 0 ? Math.max(...groups.map((g) => g.count)) : 1;

  if (groups.length === 0) {
    return (
      <Card className="gap-0 p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Geographic reach</h3>
        <EmptyState
          emoji="🌍"
          title="No locations yet"
          description="Projects with locations will appear here, grouped by country."
        />
      </Card>
    );
  }

  // Palette: earthy tones (no blue/indigo)
  const PALETTE = ["#059669", "#d97706", "#0d9488", "#65a30d", "#ea580c", "#16a34a", "#78716c", "#ca8a04"];

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
            <Globe2 className="size-4 text-emerald-600" />
            Geographic reach
          </h3>
          <p className="text-xs text-stone-500">{groups.length} regions · {projects.length} projects</p>
        </div>
      </div>
      <ul className="scrollbar-thin max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {groups.map((g, i) => {
          const pct = (g.count / max) * 100;
          const color = PALETTE[i % PALETTE.length];
          return (
            <li key={g.country} className="group">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 truncate text-stone-700">
                  <MapPin className="size-3 shrink-0 text-stone-400" />
                  <span className="font-medium truncate">{g.country}</span>
                </span>
                <Badge variant="secondary" className="bg-stone-100 text-stone-600 tabular-nums">
                  {g.count}
                </Badge>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function extractCountry(location?: string | null): string {
  if (!location) return "Unknown";
  // Common patterns: "City, Country" or "Region, Country" or just "Country"
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "Unknown";
  // Take the last part (typically the country)
  return parts[parts.length - 1] || "Unknown";
}
