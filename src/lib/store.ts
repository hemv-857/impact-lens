"use client";

import { create } from "zustand";

export type ImpactTab =
  | "overview"
  | "library"
  | "projects"
  | "compare"
  | "reports"
  | "search"
  | "campaign";

interface ImpactLensState {
  // Navigation
  activeTab: ImpactTab;
  setTab: (t: ImpactTab) => void;

  // Selected asset drawer
  selectedAssetId: string | null;
  openAsset: (id: string | null) => void;

  // Upload dialog
  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;

  // Command palette
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  // Reports tab: preselected project for report generation
  reportsProjectId: string | null;
  setReportsProjectId: (id: string | null) => void;

  // Reports tab: preselected comparison for report generation
  reportsComparisonId: string | null;
  setReportsComparisonId: (id: string | null) => void;

  // Compare tab: preselected before/after assets
  compareBeforeId: string | null;
  compareAfterId: string | null;
  setComparePair: (before: string | null, after: string | null) => void;
}

export const useImpactStore = create<ImpactLensState>((set) => ({
  activeTab: "overview",
  setTab: (t) => set({ activeTab: t }),

  selectedAssetId: null,
  openAsset: (id) => set({ selectedAssetId: id }),

  uploadOpen: false,
  setUploadOpen: (open) => set({ uploadOpen: open }),

  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  reportsProjectId: null,
  setReportsProjectId: (id) => set({ reportsProjectId: id }),

  reportsComparisonId: null,
  setReportsComparisonId: (id) => set({ reportsComparisonId: id }),

  compareBeforeId: null,
  compareAfterId: null,
  setComparePair: (before, after) =>
    set({ compareBeforeId: before, compareAfterId: after }),
}));
