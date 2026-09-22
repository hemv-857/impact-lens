"use client";

import { cn } from "@/lib/utils";

/**
 * Confidence bar: emerald when ≥0.7, amber when 0.4–0.7, red when <0.4.
 */
export function ConfidenceBar({
  value,
  className,
  showLabel = true,
  label,
  compact = false,
}: {
  value: number | null | undefined;
  className?: string;
  showLabel?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const v = typeof value === "number" ? value : 0;
  const pctVal = Math.round(v * 100);
  const color =
    v >= 0.7
      ? "bg-emerald-500"
      : v >= 0.4
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-stone-200",
          compact ? "h-1 max-w-[60px]" : "h-1.5 max-w-[120px]"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.max(2, pctVal)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("tabular-nums text-stone-500", compact ? "text-[9px]" : "text-[11px]")}>
          {label ?? `${pctVal}%`}
        </span>
      )}
    </div>
  );
}
