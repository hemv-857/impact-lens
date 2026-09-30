"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/impactlens/CategoryBadge";
import { formatDate } from "@/lib/format";
import type { Project } from "@/lib/types";

// Active is the norm; only the exceptions earn a tag.
const STATUS_STYLES: Record<string, string> = {
  completed: "bg-stone-900/80 text-white border-transparent",
  planning: "bg-white/90 text-stone-600 border-dashed border-stone-300",
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
        className="group h-full cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-stone-300"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-200">
          {project.coverUrl ? (
             
            <img
              src={project.coverUrl}
              alt={`Cover image for ${project.name}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-stone-100" />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <CategoryBadge category={project.category} />
            {STATUS_STYLES[project.status] && (
              <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[project.status])}>
                {project.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-semibold text-stone-900">
              {project.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {[
                project.location,
                `${project.assetCount ?? 0} asset${project.assetCount === 1 ? "" : "s"}`,
                (project.startDate || project.endDate) &&
                  `${formatDate(project.startDate)} → ${formatDate(project.endDate)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
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
