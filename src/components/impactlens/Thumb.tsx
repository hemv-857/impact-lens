"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { accessionNo } from "@/lib/format";

/** Asset thumbnail; a missing file falls back to a ruled placeholder carrying the accession number. */
export function Thumb({
  asset,
  alt = "",
  className,
  loading = "lazy",
}: {
  asset: { id: string; url: string; thumbnailUrl: string | null };
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [broken, setBroken] = React.useState(false);
  if (broken) {
    return (
      <span
        role="img"
        aria-label={alt || "Image unavailable"}
        className={cn(
          "flex h-full w-full items-center justify-center border border-dashed border-stone-300 bg-stone-100 font-mono text-[10px] text-stone-500",
          className
        )}
      >
        {accessionNo(asset.id)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.thumbnailUrl || asset.url}
      alt={alt}
      loading={loading}
      onError={() => setBroken(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
