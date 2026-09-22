"use client";

import { motion } from "framer-motion";
import { MapPin, CalendarDays, Images, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { formatDate } from "@/lib/format";
import type { Project } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-stone-200 text-stone-700 border-stone-300",
  planning: "bg-amber-100 text-amber-800 border-amber-200",
};

function parseSdgGoals(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export function ProjectCard({
  project,
  onClick,
  className,
}: {
  project: Project;
  onClick?: () => void;
  className?: string;
}) {
  const sdgs = parseSdgGoals(project.sdgGoals);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="lift-on-hover group h-full cursor-pointer gap-0 overflow-hidden p-0"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-200">
          {project.coverUrl ? (
             
            <img
              src={project.coverUrl}
              alt={`Cover image for ${project.name}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50">
              <Target className="size-10 text-emerald-300" aria-hidden />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <CategoryBadge category={project.category} />
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                STATUS_STYLES[project.status] ?? STATUS_STYLES.active
              )}
            >
              {project.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-semibold text-stone-900">
              {project.name}
            </h3>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
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
          {sdgs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sdgs.slice(0, 6).map((g) => (
                <Badge
                  key={g}
                  variant="outline"
                  className="bg-teal-50 text-teal-800 border-teal-200"
                >
                  SDG {g}
                </Badge>
              ))}
              {sdgs.length > 6 && (
                <span className="text-[11px] text-stone-400">
                  +{sdgs.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-0">
      <div className="aspect-[16/9] w-full animate-pulse bg-stone-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
      </div>
    </Card>
  );
}
