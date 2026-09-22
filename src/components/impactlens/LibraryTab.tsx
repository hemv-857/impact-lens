"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  Filter,
  Loader2,
  Images,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaCard, MediaCardSkeleton } from "@/components/impactlens/MediaCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useImpactStore } from "@/lib/store";
import { useMedia } from "@/components/impactlens/impact-hooks";
import type { MediaQuery } from "@/lib/api";

const CATEGORIES = [
  "all",
  "reforestation",
  "solar",
  "water",
  "education",
  "cleanup",
  "agriculture",
  "infrastructure",
  "conservation",
  "community",
  "energy",
];

const SOURCES = [
  { value: "all", label: "All sources" },
  { value: "upload", label: "Upload" },
  { value: "generated", label: "AI-generated" },
  { value: "web-search", label: "Web / URL" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "confidence", label: "Confidence (high→low)" },
  { value: "quality", label: "Quality (high→low)" },
];

export function LibraryTab() {
  const setUploadOpen = useImpactStore((s) => s.setUploadOpen);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [sort, setSort] = React.useState("newest");
  const [limit, setLimit] = React.useState(24);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query: MediaQuery = React.useMemo(
    () => ({
      search: debounced || undefined,
      category,
      source,
      verified: verifiedOnly,
      sort,
      limit,
    }),
    [debounced, category, source, verifiedOnly, sort, limit]
  );

  const mediaQ = useMedia(query);

  const totalShown = mediaQ.data?.length ?? 0;
  const hasMore = !mediaQ.isLoading && totalShown >= limit;

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            Media Library
          </h1>
          <p className="text-sm text-stone-500">
            AI-analyzed field media with intelligence, signals & traceability
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Sparkles className="size-4" />
          Analyze new media
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs text-stone-500">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search caption, tags, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c === "all" ? "All categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Sort</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Switch
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
              id="verified-only"
            />
            <Label
              htmlFor="verified-only"
              className="cursor-pointer text-xs text-stone-600"
            >
              Verified only
            </Label>
          </div>

          {(search || category !== "all" || source !== "all" || verifiedOnly || sort !== "newest") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setSource("all");
                setVerifiedOnly(false);
                setSort("newest");
              }}
            >
              <RefreshCw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
          <Filter className="size-3.5" />
          {mediaQ.isLoading
            ? "Loading…"
            : mediaQ.data
              ? `${mediaQ.data.length} asset${mediaQ.data.length === 1 ? "" : "s"} match`
              : "—"}
        </div>
      </Card>

      {/* Grid */}
      {mediaQ.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : mediaQ.isError ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load media"
          description={
            mediaQ.error instanceof Error
              ? mediaQ.error.message
              : "Unknown error"
          }
          actionLabel="Retry"
          onAction={() => mediaQ.refetch()}
        />
      ) : !mediaQ.data || mediaQ.data.length === 0 ? (
        <EmptyState
          emoji="🖼️"
          title="No media found"
          description={
            search || category !== "all" || source !== "all" || verifiedOnly
              ? "Try adjusting your filters."
              : "Upload or generate your first piece of field media to get started."
          }
          actionLabel="Analyze new media"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {mediaQ.data.map((asset) => (
              <MediaCard key={asset.id} asset={asset} />
            ))}
          </motion.div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setLimit((l) => l + 24)}
                disabled={mediaQ.isFetching}
              >
                {mediaQ.isFetching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Images className="size-4" />
                )}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
