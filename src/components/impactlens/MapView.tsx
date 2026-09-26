"use client";

import * as React from "react";
import { MapPin, Globe2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Leaflet's default marker icons 404 under bundlers — build dots as divIcons instead.
function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
function pinIcon(fill: string, size: number, ring: string, label?: string) {
  const tag = label
    ? `<span style="position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:5px;white-space:nowrap;background:#1c1917;color:#fff;padding:2px 6px;border-radius:4px;font:500 10px/1.4 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.35)">${esc(
        label
      )}</span>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px"><span style="position:absolute;inset:0;border-radius:9999px;border:2px solid ${ring};background:${fill};box-shadow:0 2px 6px rgba(0,0,0,.35);box-sizing:border-box"></span>${tag}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Fits the viewport to every mapped project once mounted. */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (positions.length > 0) map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 6 });
  }, [map, positions]);
  return null;
}

/**
 * MapView — real slippy map (Leaflet + OpenStreetMap tiles) with category pins.
 * Projects with lat/lng are placed at their true geographic position.
 * Clicking a pin selects it and shows a detail card.
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
  // Leaflet touches `window` — mount-gate so SSR/build stay clean.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const mapped = React.useMemo(
    () => projects.filter((p) => typeof p.lat === "number" && typeof p.lng === "number"),
    [projects]
  );
  const positions = React.useMemo(
    () => mapped.map((p) => [p.lat as number, p.lng as number] as [number, number]),
    [mapped]
  );

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
        {mounted && (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            worldCopyJump
            className="h-full w-full"
            style={{ background: "#134e4a" }}
          >
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={18}
            />
            <FitBounds positions={positions} />
            {mapped.map((p) => {
              const isSelected = selected?.id === p.id;
              const isHover = hover === p.id;
              const catColor =
                CATEGORY_PIN_COLORS[p.category ?? ""] ?? CATEGORY_PIN_COLORS.default;
              return (
                <Marker
                  key={p.id}
                  position={[p.lat as number, p.lng as number]}
                  icon={pinIcon(
                    catColor.fill,
                    isSelected || isHover ? 18 : 14,
                    isSelected ? "#fbbf24" : "#ffffff",
                    isHover || isSelected ? p.name : undefined
                  )}
                  eventHandlers={{
                    click: () => {
                      setSelected(p);
                      onSelect?.(p);
                    },
                    mouseover: () => setHover(p.id),
                    mouseout: () => setHover(null),
                  }}
                />
              );
            })}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-[500] flex flex-col gap-1 rounded-md bg-stone-900/80 px-2.5 py-1.5 text-[10px] text-emerald-50 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-amber-400" />
            <span>{mapped.length} project sites</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {Object.entries(CATEGORY_PIN_COLORS)
              .filter(([k]) => k !== "default")
              .map(([cat, c]) => (
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
                SDG:{" "}
                {selected.sdgGoals.split(",").map((g) => (
                  <Badge
                    key={g}
                    variant="secondary"
                    className="bg-teal-50 text-teal-700 px-1.5 py-0 text-[10px]"
                  >
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
