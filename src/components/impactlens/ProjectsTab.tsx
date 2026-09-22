"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FolderKanban,
  Plus,
  Loader2,
  MapPin,
  CalendarDays,
  Images,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { MapView } from "@/components/impactlens/MapView";
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

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-stone-200 text-stone-700 border-stone-300",
  planning: "bg-amber-100 text-amber-800 border-amber-200",
};

export function ProjectsTab() {
  const projectsQ = useProjects();
  const create = useCreateProject();
  const setTab = useImpactStore((s) => s.setTab);
  const setReportsProjectId = useImpactStore((s) => s.setReportsProjectId);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailProject, setDetailProject] = React.useState<Project | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            Projects
          </h1>
          <p className="text-sm text-stone-500">
            Organize media, comparisons & reports by sustainability initiative
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          New project
        </Button>
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
          {/* Project map view */}
          <MapView
            projects={projectsQ.data}
            onSelect={(p) => setDetailProject(p)}
          />
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
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-5 text-emerald-600" />
            New project
          </DialogTitle>
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
              <SheetTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="size-4 text-emerald-600" />
                {project.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {project.description ?? "No description provided."}
              </SheetDescription>
            </SheetHeader>

            <div className="scrollbar-thin flex-1 overflow-y-auto bg-stone-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                {project.category && (
                  <Badge variant="outline" className="capitalize">
                    {project.category}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    STATUS_STYLES[project.status] ?? STATUS_STYLES.active
                  )}
                >
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
                  {project.assetCount ?? 0} assets
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

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">
                  Project media
                </h3>
                <Button
                  size="sm"
                  onClick={() => onGenerateReport(project)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <FileText className="size-3.5" /> Generate impact report
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>

              {projectMediaQ.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <MediaCardSkeleton key={i} />
                  ))}
                </div>
              ) : !projectMediaQ.data || projectMediaQ.data.length === 0 ? (
                <EmptyState
                  emoji="🖼️"
                  title="No media in this project yet"
                  description="Assign assets to this project from the Media Library or upload new ones."
                />
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
