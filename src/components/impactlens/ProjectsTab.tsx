"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Loader2,
  MapPin,
  CalendarDays,
  Images,
  FileText,
  ArrowRight,
  Clock,
  LayoutGrid,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ProjectCard, ProjectCardSkeleton } from "@/components/impactlens/ProjectCard";
import { MediaCard, MediaCardSkeleton } from "@/components/impactlens/MediaCard";
import { EmptyState } from "@/components/impactlens/EmptyState";
import dynamic from "next/dynamic";

// Leaflet touches `window` at import time — load the map only on the client.
const MapView = dynamic(
  () => import("@/components/impactlens/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <Card className="h-64 animate-pulse gap-0" /> }
);
import { TimelineView } from "@/components/impactlens/TimelineView";
import { ProjectComparison } from "@/components/impactlens/ProjectComparison";
import { ProjectHealthScore } from "@/components/impactlens/ProjectHealthScore";
import {
  useCreateProject,
  useMedia,
  useProjects,
} from "@/components/impactlens/impact-hooks";
import { useImpactStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import type { Project } from "@/lib/types";

const CATEGORIES = [
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
  "other",
];

const STATUSES = ["active", "planning", "completed"] as const;

export function ProjectsTab() {
  const projectsQ = useProjects();
  const create = useCreateProject();
  const setTab = useImpactStore((s) => s.setTab);
  const setReportsProjectId = useImpactStore((s) => s.setReportsProjectId);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailProject, setDetailProject] = React.useState<Project | null>(null);
  const [compareOpen, setCompareOpen] = React.useState(false);

  const openProjectId = useImpactStore((s) => s.openProjectId);
  const setOpenProjectId = useImpactStore((s) => s.setOpenProjectId);
  React.useEffect(() => {
    const p = openProjectId && projectsQ.data?.find((x) => x.id === openProjectId);
    if (p) {
      setDetailProject(p);
      setOpenProjectId(null);
    }
  }, [openProjectId, projectsQ.data, setOpenProjectId]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCompareOpen(true)}
            className="border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            <GitCompare className="size-4" />
            Compare
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            New project
          </Button>
        </div>
      </div>

      {projectsQ.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : projectsQ.isError ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load projects"
          description={
            projectsQ.error instanceof Error
              ? projectsQ.error.message
              : "Unknown error"
          }
        />
      ) : !projectsQ.data || projectsQ.data.length === 0 ? (
        <EmptyState
          emoji="🌍"
          title="No projects yet"
          description="Create your first project to organize media, run comparisons, and generate impact reports."
          actionLabel="Create project"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {projectsQ.data.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => setDetailProject(p)}
              />
            ))}
          </motion.div>
          {/* Where the work is: secondary to the project list */}
          <div className="pt-6">
            <MapView
              projects={projectsQ.data}
              onSelect={(p) => setDetailProject(p)}
            />
          </div>
        </>
      )}

      {/* New project dialog */}
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          try {
            const p = await create.mutateAsync(data);
            toast({ title: "Project created", description: p.name });
            setDialogOpen(false);
            setDetailProject(p);
          } catch (e) {
            toast({
              title: "Couldn't create project",
              description: e instanceof Error ? e.message : "Unknown error",
              variant: "destructive",
            });
          }
        }}
        pending={create.isPending}
      />

      {/* Project detail sheet */}
      <ProjectDetailSheet
        project={detailProject}
        onOpenChange={(o) => !o && setDetailProject(null)}
        onGenerateReport={(p) => {
          setReportsProjectId(p.id);
          setDetailProject(null);
          setTab("reports");
        }}
      />

      {/* Project comparison modal */}
      <ProjectComparison open={compareOpen} onOpenChange={setCompareOpen} />
    </div>
  );
}

interface NewProjectForm {
  name: string;
  description?: string;
  location?: string;
  region?: string;
  category?: string;
  status: "active" | "planning" | "completed";
  startDate?: string;
  endDate?: string;
  sdgGoals?: string;
  coverUrl?: string;
  lat?: number;
  lng?: number;
}

function NewProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: NewProjectForm) => void;
  pending: boolean;
}) {
  const [form, setForm] = React.useState<NewProjectForm>({
    name: "",
    status: "active",
    category: "reforestation",
  });

  React.useEffect(() => {
    if (!open) {
      setForm({ name: "", status: "active", category: "reforestation" });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Group related media, comparisons and reports under a single
            initiative.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="p-name">Name *</Label>
            <Input
              id="p-name"
              placeholder="Hillside Reforestation Initiative"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={2}
              placeholder="Short project description"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-loc">Location</Label>
            <Input
              id="p-loc"
              placeholder="Rural hillside, East Africa"
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-reg">Region</Label>
            <Input
              id="p-reg"
              placeholder="East Africa"
              value={form.region ?? ""}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as NewProjectForm["status"] })
              }
            >
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-start">Start date</Label>
            <Input
              id="p-start"
              type="date"
              value={form.startDate ?? ""}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-end">End date</Label>
            <Input
              id="p-end"
              type="date"
              value={form.endDate ?? ""}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="p-sdg">UN SDG goals</Label>
            <Input
              id="p-sdg"
              placeholder="13,15,1 (comma-separated SDG numbers)"
              value={form.sdgGoals ?? ""}
              onChange={(e) => setForm({ ...form, sdgGoals: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="p-cover">Cover image URL (optional)</Label>
            <Input
              id="p-cover"
              placeholder="https://…"
              value={form.coverUrl ?? ""}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-lat">Latitude (optional)</Label>
            <Input
              id="p-lat"
              type="number"
              step="0.0001"
              placeholder="-0.6023"
              value={form.lat ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  lat: e.target.value === "" ? undefined : parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-lng">Longitude (optional)</Label>
            <Input
              id="p-lng"
              type="number"
              step="0.0001"
              placeholder="36.0"
              value={form.lng ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  lng: e.target.value === "" ? undefined : parseFloat(e.target.value),
                })
              }
            />
          </div>
          <p className="col-span-2 text-[11px] text-stone-400">
            Coordinates enable map placement. Find them via Google Maps → right-click.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) return;
              onSubmit(form);
            }}
            disabled={pending || !form.name.trim()}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailSheet({
  project,
  onOpenChange,
  onGenerateReport,
}: {
  project: Project | null;
  onOpenChange: (o: boolean) => void;
  onGenerateReport: (p: Project) => void;
}) {
  const open = !!project;
  const [view, setView] = React.useState<"grid" | "timeline">("grid");
  const projectMediaQ = useMedia({
    projectId: project?.id,
    limit: 60,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-2xl md:max-w-3xl"
      >
        {project && (
          <>
            <SheetHeader className="border-b border-stone-200 bg-white p-4">
              <SheetTitle className="text-base">{project.name}</SheetTitle>
              <SheetDescription className={cn("text-xs", !project.description && "sr-only")}>
                {project.description ?? project.name}
              </SheetDescription>
            </SheetHeader>

            <div className="scrollbar-thin flex-1 overflow-y-auto bg-stone-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                {project.category && (
                  <Badge variant="outline" className="capitalize">
                    {project.category}
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {project.status}
                </Badge>
                {project.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {project.location}
                  </span>
                )}
                {(project.startDate || project.endDate) && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(project.startDate)} → {formatDate(project.endDate)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Images className="size-3" />
                  {project.assetCount ?? 0} asset{project.assetCount === 1 ? "" : "s"}
                </span>
              </div>

              {project.sdgGoals && (
                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-stone-500">SDGs:</span>
                  {project.sdgGoals
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((g) => (
                      <Badge
                        key={g}
                        variant="outline"
                        className="bg-teal-50 text-teal-800 border-teal-200"
                      >
                        SDG {g}
                      </Badge>
                    ))}
                </div>
              )}

              <Separator className="my-3" />

              {/* Project health score */}
              <div className="mb-3">
                <ProjectHealthScore project={project} assets={projectMediaQ.data ?? []} />
              </div>

              <Separator className="my-3" />

              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-800">
                  Project media
                </h3>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex rounded-md border border-stone-200 bg-white p-0.5">
                    <button
                      onClick={() => setView("grid")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                        view === "grid"
                          ? "bg-stone-900 text-white"
                          : "text-stone-500 hover:text-stone-800"
                      )}
                      title="Grid view"
                    >
                      <LayoutGrid className="size-3" /> Grid
                    </button>
                    <button
                      onClick={() => setView("timeline")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition",
                        view === "timeline"
                          ? "bg-stone-900 text-white"
                          : "text-stone-500 hover:text-stone-800"
                      )}
                      title="Timeline view"
                    >
                      <Clock className="size-3" /> Timeline
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onGenerateReport(project)}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <FileText className="size-3.5" /> Report
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>

              {projectMediaQ.isLoading ? (
                view === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <MediaCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                )
              ) : !projectMediaQ.data || projectMediaQ.data.length === 0 ? (
                <EmptyState
                  emoji="🖼️"
                  title="No media in this project yet"
                  description="Assign assets to this project from the Media Library or upload new ones."
                />
              ) : view === "timeline" ? (
                <TimelineView assets={projectMediaQ.data} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {projectMediaQ.data.map((a) => (
                    <MediaCard key={a.id} asset={a} compact />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
