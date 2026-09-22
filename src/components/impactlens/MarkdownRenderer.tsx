"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Renders a markdown string with ImpactLens styling (see globals.css `.markdown-body`).
 */
export function MarkdownRenderer({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const src = React.useMemo(() => content ?? "", [content]);
  if (!src.trim()) {
    return (
      <p className="text-sm italic text-stone-400">
        No narrative generated yet.
      </p>
    );
  }
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown>{src}</ReactMarkdown>
    </div>
  );
}
