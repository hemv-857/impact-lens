"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        {emoji ? (
          <span className="text-2xl" role="img" aria-hidden>
            {emoji}
          </span>
        ) : (
          icon ?? (
            <span className="text-2xl" role="img" aria-hidden>
              🌱
            </span>
          )
        )}
      </div>
      <h3 className="text-base font-semibold text-stone-800">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-stone-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
