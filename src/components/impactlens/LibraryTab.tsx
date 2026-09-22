"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Filter,
  Loader2,
  Images,
  RefreshCw,
  CheckSquare,
  Square,
  Trash2,
  BadgeCheck,
  XCircle,
  FolderInput,
  Sparkle,
  X,
  Download,
  Star,
  StarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaCard, MediaCardSkeleton } from "@/components/impactlens/MediaCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import { useImpactStore } from "@/lib/store";
import { useBulkMediaAction, useMedia, useProjects } from "@/components/impactlens/impact-hooks";
import { useToast } from "@/hooks/use-toast";
import type { MediaQuery } from "@/lib/api";
import { mediaExportUrl } from "@/lib/api";

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
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [sort, setSort] = React.useState("newest");
  const [limit, setLimit] = React.useState(24);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Bulk selection state
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignProjectId, setAssignProjectId] = React.useState<string>("none");

  const bulk = useBulkMediaAction();
  const projectsQ = useProjects();
  const { toast } = useToast();

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
      favorite: favoritesOnly,
      sort,
      limit,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debounced, category, source, verifiedOnly, favoritesOnly, sort, limit, dateFrom, dateTo]
  );

  const mediaQ = useMedia(query);

  const totalShown = mediaQ.data?.length ?? 0;
  const hasMore = !mediaQ.isLoading && totalShown >= limit;

  // Selection helpers
  const toggleSelect = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = React.useCallback(() => {
    if (!mediaQ.data) return;
    setSelected(new Set(mediaQ.data.map((a) => a.id)));
  }, [mediaQ.data]);

  const clearSelection = React.useCallback(() => {
    setSelected(new Set());
  }, []);

  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const runBulk = async (
    action: "analyze" | "verify" | "unverify" | "delete" | "favorite" | "unfavorite",
    successMsg: string
  ) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      toast({
        title: `Bulk ${action} started`,
        description: `Processing ${ids.length} asset${ids.length === 1 ? "" : "s"}…`,
      });
      const r = await bulk.mutateAsync({ ids, action });
      toast({
        title: successMsg,
        description: `${r.processed} succeeded${r.failed > 0 ? `, ${r.failed} failed` : ""}.`,
      });
      if (action === "delete") exitSelectMode();
    } catch (e) {
      toast({
        title: "Bulk action failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onAssign = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0 || assignProjectId === "none") return;
    try {
      const r = await bulk.mutateAsync({ ids, action: "assign", projectId: assignProjectId });
      toast({
        title: "Assets assigned",
        description: `${r.processed} asset${r.processed === 1 ? "" : "s"} moved to project.`,
      });
      setAssignOpen(false);
      exitSelectMode();
    } catch (e) {
      toast({
        title: "Assignment failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

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
        <div className="flex gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className={cn(
              selectMode
                ? "bg-stone-800 text-white hover:bg-stone-900"
                : "border-stone-300 text-stone-700 hover:bg-stone-50"
            )}
          >
            <CheckSquare className="size-4" />
            {selectMode ? "Exit select" : "Select"}
          </Button>
          <a
            href={mediaExportUrl(query)}
            download
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            title="Export current filter as CSV"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Sparkles className="size-4" />
            Analyze new media
          </Button>
        </div>
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
            <Select value={category} onValueChange={setCategory} disabled={selectMode}>
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
            <Select value={source} onValueChange={setSource} disabled={selectMode}>
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
            <Select value={sort} onValueChange={setSort} disabled={selectMode}>
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
              disabled={selectMode}
            />
            <Label
              htmlFor="verified-only"
              className="cursor-pointer text-xs text-stone-600"
            >
              Verified only
            </Label>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Switch
              checked={favoritesOnly}
              onCheckedChange={setFavoritesOnly}
              id="favorites-only"
              disabled={selectMode}
            />
            <Label
              htmlFor="favorites-only"
              className="cursor-pointer text-xs text-stone-600"
            >
              ★ Favorites
            </Label>
          </div>

          {/* Date range */}
          <div className="flex items-end gap-1.5">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={selectMode}
                className="w-[140px]"
              />
            </div>
            <span className="pb-2 text-xs text-stone-400">→</span>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={selectMode}
                className="w-[140px]"
              />
            </div>
          </div>

          {(search || category !== "all" || source !== "all" || verifiedOnly || favoritesOnly || sort !== "newest" || dateFrom || dateTo) && !selectMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setSource("all");
                setVerifiedOnly(false);
                setFavoritesOnly(false);
                setSort("newest");
                setDateFrom("");
                setDateTo("");
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
          {selectMode && (
            <Badge variant="secondary" className="ml-2 bg-emerald-50 text-emerald-700">
              Select mode · {selected.size} selected
            </Badge>
          )}
        </div>
      </Card>

      {/* Bulk action toolbar (sticky) */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-2 z-30"
          >
            <Card className="flex flex-wrap items-center gap-2 border-emerald-200 bg-emerald-50/95 p-3 shadow-md backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                <BadgeCheck className="size-4" />
                {selected.size} selected
              </div>
              <div className="mx-1 h-5 w-px bg-emerald-200" />
              <Button
                size="sm"
                onClick={() => runBulk("analyze", "Bulk analysis complete")}
                disabled={bulk.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {bulk.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkle className="size-3.5" />}
                Analyze all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("verify", "Assets verified")}
                disabled={bulk.isPending}
                className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <BadgeCheck className="size-3.5" /> Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("unverify", "Verification removed")}
                disabled={bulk.isPending}
                className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
              >
                <XCircle className="size-3.5" /> Unverify
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("favorite", "Added to favorites")}
                disabled={bulk.isPending}
                className="border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
              >
                <Star className="size-3.5" /> Favorite
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("unfavorite", "Removed from favorites")}
                disabled={bulk.isPending}
                className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
              >
                <StarOff className="size-3.5" /> Unfavorite
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignOpen(true)}
                disabled={bulk.isPending}
                className="border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              >
                <FolderInput className="size-3.5" /> Assign to project
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("delete", "Assets deleted")}
                disabled={bulk.isPending}
                className="border-red-300 bg-white text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={selectAllVisible} className="text-stone-600">
                  <CheckSquare className="size-3.5" /> Select all visible
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="text-stone-600">
                  <Square className="size-3.5" /> Clear
                </Button>
                <Button size="sm" variant="ghost" onClick={exitSelectMode} className="text-stone-600">
                  <X className="size-3.5" /> Exit
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
              <MediaCard
                key={asset.id}
                asset={asset}
                selectable={selectMode}
                selected={selected.has(asset.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </motion.div>
          {hasMore && !selectMode && (
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

      {/* Assign to project dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selected.size} assets to project</DialogTitle>
            <DialogDescription>
              Move the selected media into a project. This updates each asset's project association.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={assignProjectId} onValueChange={setAssignProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {projectsQ.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onAssign}
              disabled={bulk.isPending || assignProjectId === "none"}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Assign assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
