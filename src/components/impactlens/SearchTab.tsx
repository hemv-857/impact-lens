"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/components/impactlens/MediaCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useSearch } from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";

const EXAMPLE_QUERIES = [
  "tree planting in arid regions",
  "vegetation recovery",
  "community engagement",
  "clean water access",
  "renewable energy infrastructure",
  "before after transformation",
  "children in classroom",
  "solar installation progress",
];

export function SearchTab() {
  const [input, setInput] = React.useState("");
  const [query, setQuery] = React.useState<string | null>(null);
  const searchQ = useSearch(query);
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (q.length < 2) return;
    setQuery(q);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Semantic Search
        </h1>
        <p className="text-sm text-stone-500">
          Search your library by meaning — the AI ranks every asset by
          relevance to your query.
        </p>
      </div>

      {/* Big search bar */}
      <Card className="gap-0 p-4 sm:p-6">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-400" />
            <Input
              autoFocus
              placeholder="Search by meaning: 'tree planting in arid regions' or 'solar installation progress'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-11 pl-11 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={searchQ.isFetching || input.trim().length < 2}
            className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {searchQ.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Search
          </Button>
        </form>

        {/* Example chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-400">Try:</span>
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setInput(q);
                setQuery(q);
              }}
              className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* Results */}
      {!query && (
        <EmptyState
          emoji="🔍"
          title="Search your media library"
          description="Type a natural-language query above. Results are ranked by AI-computed relevance, not just keyword match."
        />
      )}

      {query && searchQ.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      )}

      {query && searchQ.isError && (
        <EmptyState
          emoji="⚠️"
          title="Search failed"
          description={
            searchQ.error instanceof Error
              ? searchQ.error.message
              : "Unknown error"
          }
          actionLabel="Retry"
          onAction={() => searchQ.refetch()}
        />
      )}

      {query && !searchQ.isLoading && searchQ.data && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {searchQ.data.hits.length === 0
                ? `No matches for “${query}”`
                : `${searchQ.data.hits.length} result${
                    searchQ.data.hits.length === 1 ? "" : "s"
                  } for “${query}”`}
            </p>
          </div>
          {searchQ.data.hits.length === 0 ? (
            <EmptyState
              emoji="🌱"
              title="No semantic matches"
              description="Try a broader or rephrased query, or ingest more media first."
              actionLabel="Analyze new media"
              onAction={() => setUploadOpen(true)}
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {searchQ.data.hits.map((hit) => (
                <div key={hit.asset.id} className="relative">
                  <MediaCard asset={hit.asset} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "bg-white/95 shadow-sm",
                        hit.score >= 0.7
                          ? "text-emerald-700 border-emerald-200"
                          : hit.score >= 0.4
                            ? "text-amber-700 border-amber-200"
                            : "text-stone-600 border-stone-200"
                      )}
                    >
                      <TrendingUp className="size-3" />
                      {Math.round(hit.score * 100)}% match
                    </Badge>
                  </div>
                  {hit.reason && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="line-clamp-2 text-[11px] text-white/90">
                        {hit.reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
