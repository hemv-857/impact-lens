"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Loader2,
  TrendingUp,
  Bookmark,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/components/impactlens/MediaCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import {
  useDeleteSavedSearch,
  useSaveSearch,
  useSearch,
  useSavedSearches,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/format";

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
  const savedQ = useSavedSearches();
  const saveMut = useSaveSearch();
  const delMut = useDeleteSavedSearch();
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const { toast } = useToast();

  const submit = (q?: string) => {
    const text = (q ?? input).trim();
    if (text.length < 2) return;
    setInput(text);
    setQuery(text);
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    submit();
  };

  const onSave = async () => {
    if (!query || !searchQ.data) return;
    try {
      await saveMut.mutateAsync({
        query,
        results: searchQ.data.hits.map((h) => ({
          assetId: h.asset.id,
          score: h.score,
          reason: h.reason,
        })),
      });
      toast({ title: "Search saved", description: `“${query}” added to your history.` });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onDeleteSaved = async (id: string) => {
    try {
      await delMut.mutateAsync(id);
    } catch {
      /* toast handled by mutation */
    }
  };

  return (
    <div className="space-y-5">
      {/* Big search bar */}
      <Card className="gap-0 p-4 sm:p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
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
              onClick={() => submit(q)}
              className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Results column (3/4) */}
        <div className="lg:col-span-3 space-y-4">
          {!query && (
            <EmptyState
              emoji="🔍"
              title="Search by what's in the photo, not its filename"
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
                  {searchQ.data.degraded && " — AI ranking unavailable, showing keyword matches"}
                </p>
                {searchQ.data.hits.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSave}
                    disabled={saveMut.isPending}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {saveMut.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Bookmark className="size-3.5" />
                    )}
                    Save search
                  </Button>
                )}
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

        {/* Saved searches sidebar (1/4) */}
        <aside className="lg:col-span-1">
          <Card className="gap-0 p-4 lg:sticky lg:top-4">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">
              Saved searches
              {savedQ.data && savedQ.data.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-stone-100 text-stone-600">
                  {savedQ.data.length}
                </Badge>
              )}
            </h3>
            {savedQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !savedQ.data || savedQ.data.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 p-4 text-center">
                <Bookmark className="mx-auto size-5 text-stone-300" />
                <p className="mt-2 text-xs text-stone-500">
                  Run a search, then click <strong>Save search</strong> to pin it here.
                </p>
              </div>
            ) : (
              <ul className="scrollbar-thin max-h-96 space-y-1.5 overflow-y-auto pr-1">
                <AnimatePresence>
                  {savedQ.data.map((s) => (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      layout
                      className="group rounded-md border border-stone-200 bg-white p-2 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      <button
                        onClick={() => submit(s.query)}
                        className="block w-full text-left"
                      >
                        <p className="line-clamp-2 text-xs font-medium text-stone-800">
                          {s.query}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                          <Clock className="size-2.5" />
                          {timeAgo(s.createdAt)}
                          <span>·</span>
                          <span>{s.hitCount} hits</span>
                        </div>
                      </button>
                      <button
                        onClick={() => onDeleteSaved(s.id)}
                        disabled={delMut.isPending}
                        className="mt-1 flex items-center gap-1 text-[10px] text-stone-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="size-2.5" /> Remove
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
