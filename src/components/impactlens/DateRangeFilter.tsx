"use client";

import * as React from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS = [
  { label: "All time", days: 0 },
  { label: "Today", days: 0, today: true },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
] as const;

export interface DateRangeValue {
  from: string; // ISO date
  to: string; // ISO date
}

/**
 * DateRangeFilter — a compact date-range picker with quick presets.
 * Used on the Overview dashboard to scope KPIs + charts to a time window.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}) {
  const applyPreset = (days: number, today = false) => {
    const end = new Date();
    const start = new Date();
    if (today) {
      start.setHours(0, 0, 0, 0);
    } else if (days === 0) {
      // all time — clear
      onChange({ from: "", to: "" });
      return;
    } else {
      start.setDate(start.getDate() - days);
    }
    onChange({ from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) });
  };

  const activePreset = (() => {
    if (!value.from && !value.to) return "All time";
    const match = PRESETS.find((p) => {
      if (!value.from) return false;
      const expected = (() => {
        const end = new Date();
        const start = new Date();
        if ("today" in p) start.setHours(0, 0, 0, 0);
        else if (p.days === 0) return null;
        else start.setDate(start.getDate() - p.days);
        return start.toISOString().slice(0, 10) === value.from;
      })();
      return expected;
    });
    return match?.label ?? "Custom";
  })();

  const hasFilter = !!(value.from || value.to);

  return (
    <Card className={cn("gap-0 p-3", className)}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-4 text-emerald-600" />
          <span className="text-xs font-semibold text-stone-700">Date range</span>
        </div>
        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => {
            const isActive = activePreset === p.label;
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days, (p as { today?: boolean }).today)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition",
                  isActive
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {/* Custom date inputs */}
        <div className="flex items-end gap-1">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-stone-400">From</Label>
            <Input
              type="date"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="h-8 w-[130px] text-xs"
            />
          </div>
          <span className="pb-1.5 text-xs text-stone-400">→</span>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-stone-400">To</Label>
            <Input
              type="date"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="h-8 w-[130px] text-xs"
            />
          </div>
        </div>
        {/* Clear */}
        {hasFilter && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ from: "", to: "" })}
            className="h-8 px-2 text-xs text-stone-500"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>
    </Card>
  );
}
