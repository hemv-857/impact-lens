"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMedia,
  createCampaign,
  createComparison,
  createMedia,
  createProject,
  createReport,
  deleteMedia,
  fetchAnalytics,
  fetchComparisons,
  fetchMedia,
  fetchMediaById,
  fetchProjects,
  fetchReports,
  type MediaQuery,
  semanticSearch,
  seedSampleData,
} from "@/lib/api";

export const qk = {
  analytics: ["analytics"] as const,
  media: (q: MediaQuery) => ["media", q] as const,
  mediaById: (id: string) => ["media", id] as const,
  projects: ["projects"] as const,
  comparisons: ["comparisons"] as const,
  reports: ["reports"] as const,
  search: (query: string) => ["search", query] as const,
};

export function useAnalytics() {
  return useQuery({ queryKey: qk.analytics, queryFn: fetchAnalytics });
}

export function useMedia(q: MediaQuery = {}) {
  return useQuery({ queryKey: qk.media(q), queryFn: () => fetchMedia(q) });
}

export function useMediaById(id: string | null) {
  return useQuery({
    queryKey: qk.mediaById(id ?? ""),
    queryFn: () => fetchMediaById(id!),
    enabled: !!id,
  });
}

export function useProjects() {
  return useQuery({ queryKey: qk.projects, queryFn: fetchProjects });
}

export function useComparisons() {
  return useQuery({ queryKey: qk.comparisons, queryFn: fetchComparisons });
}

export function useReports() {
  return useQuery({ queryKey: qk.reports, queryFn: fetchReports });
}

export function useSearch(query: string | null) {
  return useQuery({
    queryKey: qk.search(query ?? ""),
    queryFn: () => semanticSearch(query!),
    enabled: !!query && query.trim().length > 1,
  });
}

// ----- Mutations -----
export function useCreateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMedia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: qk.analytics });
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useAnalyzeMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: analyzeMedia,
    onSuccess: (asset) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: qk.analytics });
      qc.setQueryData(qk.mediaById(asset.id), asset);
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: qk.analytics });
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.analytics });
    },
  });
}

export function useCreateComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createComparison,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.comparisons });
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports });
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports });
    },
  });
}

export function useSeedData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: seedSampleData,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
