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
  // icon/emoji are accepted for compatibility but not drawn: the title carries the state.
  void icon;
  void emoji;
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {actionLabel && onAction && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
