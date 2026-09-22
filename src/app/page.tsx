"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/impactlens/Header";
import { Footer } from "@/components/impactlens/Footer";
import { OverviewTab } from "@/components/impactlens/OverviewTab";
import { LibraryTab } from "@/components/impactlens/LibraryTab";
import { ProjectsTab } from "@/components/impactlens/ProjectsTab";
import { CompareTab } from "@/components/impactlens/CompareTab";
import { ReportsTab } from "@/components/impactlens/ReportsTab";
import { SearchTab } from "@/components/impactlens/SearchTab";
import { CampaignTab } from "@/components/impactlens/CampaignTab";
import { AssetDrawer } from "@/components/impactlens/AssetDrawer";
import { UploadDialog } from "@/components/impactlens/UploadDialog";
import { CommandPalette } from "@/components/impactlens/CommandPalette";
import { ShortcutHelp } from "@/components/impactlens/ShortcutHelp";
import { useImpactStore } from "@/lib/store";

export default function Home() {
  const activeTab = useImpactStore((s) => s.activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "overview" && <OverviewTab />}
              {activeTab === "library" && <LibraryTab />}
              {activeTab === "projects" && <ProjectsTab />}
              {activeTab === "compare" && <CompareTab />}
              {activeTab === "reports" && <ReportsTab />}
              {activeTab === "search" && <SearchTab />}
              {activeTab === "campaign" && <CampaignTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />

      {/* Global overlays */}
      <AssetDrawer />
      <UploadDialog />
      <CommandPalette />
      <ShortcutHelp />
    </div>
  );
}
