"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  analyzeMedia,
  bulkMediaAction,
  cloneReport,
  createCampaign,
  createComparison,
  createMedia,
  createNote,
  createProject,
  createReport,
  createSchedule,
  deleteMedia,
  deleteNote,
  deleteSavedSearch,
  deleteSchedule,
  fetchAnalytics,
  fetchComparisons,
  fetchLeaderboard,
  fetchMedia,
  fetchMediaById,
  fetchNotes,
  fetchProjects,
  fetchReports,
  fetchSchedules,
  fetchSavedSearches,
  generateCampaignVariants,
  toggleFavorite,
  updateNote,
  type MediaQuery,
  type BulkActionInput,
  saveSearch,
  semanticSearch,
  seedSampleData,
  updateSchedule,
  updateMediaTags,
} from "@/lib/api";

export const qk = {
  analytics: ["analytics"] as const,
  media: (q: MediaQuery) => ["media", q] as const,
  mediaById: (id: string) => ["media", id] as const,
  projects: ["projects"] as const,
  comparisons: ["comparisons"] as const,
  reports: ["reports"] as const,
  searches: ["searches"] as const,
  search: (query: string) => ["search", query] as const,
  leaderboard: ["leaderboard"] as const,
  notes: (assetId: string) => ["notes", assetId] as const,
  schedules: ["schedules"] as const,
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

export function useUpdateMediaTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      updateMediaTags(id, tags),
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

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; favorite?: boolean }) =>
      toggleFavorite(args.id, args.favorite),
    onSuccess: (asset) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.setQueryData(qk.mediaById(asset.id), asset);
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

export function useBulkMediaAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkActionInput) => bulkMediaAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: qk.analytics });
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

// ----- Saved searches -----
export function useSavedSearches() {
  return useQuery({ queryKey: qk.searches, queryFn: fetchSavedSearches });
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSearch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.searches });
    },
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.searches });
    },
  });
}

// ----- Campaign variants (A/B testing) -----
export function useGenerateCampaignVariants() {
  return useMutation({
    mutationFn: generateCampaignVariants,
  });
}

// ----- Project leaderboard -----
export function useLeaderboard(limit = 10) {
  return useQuery({ queryKey: qk.leaderboard, queryFn: () => fetchLeaderboard(limit) });
}

// ----- Asset Notes -----
export function useNotes(assetId: string | null) {
  return useQuery({
    queryKey: qk.notes(assetId ?? ""),
    queryFn: () => fetchNotes(assetId!),
    enabled: !!assetId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.notes(variables.assetId) });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, assetId }: { id: string; body: string; assetId: string }) =>
      updateNote(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.notes(variables.assetId) });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) => deleteNote(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.notes(variables.assetId) });
    },
  });
}

// ----- Report Clone -----
export function useCloneReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cloneReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reports });
    },
  });
}

// ----- Report schedules (recurring generation + email delivery) -----
export function useSchedules() {
  return useQuery({ queryKey: qk.schedules, queryFn: fetchSchedules });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.schedules }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof updateSchedule>[1]) =>
      updateSchedule(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.schedules }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.schedules }),
  });
}
