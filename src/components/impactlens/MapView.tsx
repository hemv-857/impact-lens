"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Project } from "@/lib/types";

// Leaflet's default marker icons 404 under bundlers — build dots as divIcons instead.
function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
function pinIcon(fill: string, size: number, ring: string, label?: string) {
  const tag = label
    ? `<span style="position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:5px;white-space:nowrap;background:#16201c;color:#fff;padding:2px 6px;border-radius:4px;font:500 10px/1.4 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.35)">${esc(
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

/** Leaflet + OpenStreetMap; a pin opens its project via onSelect. */
export function MapView({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect?: (p: Project) => void;
}) {
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

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-900">Project sites</h2>
        <span className="text-sm tabular-nums text-stone-500">
          {mapped.length} of {projects.length} mapped
        </span>
      </div>
      {mapped.length === 0 ? (
        <p className="border-y border-stone-200 py-6 text-sm text-stone-500">
          Add latitude and longitude to a project to place it here.
        </p>
      ) : (
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-md border border-stone-200 bg-stone-100 sm:aspect-[21/9]">
          {mounted && (
            <MapContainer center={[20, 0]} zoom={2} minZoom={2} worldCopyJump className="h-full w-full">
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={18}
              />
              <FitBounds positions={positions} />
              {mapped.map((p) => {
                const on = hover === p.id;
                // Pins are ink, not category hue: the name label identifies the site on hover.
                return (
                  <Marker
                    key={p.id}
                    position={[p.lat as number, p.lng as number]}
                    title={p.name}
                    icon={pinIcon("#16201c", on ? 16 : 12, "#ffffff", on ? p.name : undefined)}
                    eventHandlers={{
                      click: () => onSelect?.(p),
                      mouseover: () => setHover(p.id),
                      mouseout: () => setHover(null),
                    }}
                  />
                );
              })}
            </MapContainer>
          )}
        </div>
      )}
    </section>
  );
}
