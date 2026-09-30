"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Header, sectionOf } from "@/components/impactlens/Header";
import { OverviewTab } from "@/components/impactlens/OverviewTab";
import { LibraryTab } from "@/components/impactlens/LibraryTab";
import { ProjectsTab } from "@/components/impactlens/ProjectsTab";
import { CompareTab } from "@/components/impactlens/CompareTab";
import { ReportsTab } from "@/components/impactlens/ReportsTab";
import { SearchTab } from "@/components/impactlens/SearchTab";
import { CampaignTab } from "@/components/impactlens/CampaignTab";
import { TimelineTab } from "@/components/impactlens/TimelineTab";
import { InsightsTab } from "@/components/impactlens/InsightsTab";
import { AssetDrawer } from "@/components/impactlens/AssetDrawer";
import { UploadDialog } from "@/components/impactlens/UploadDialog";
import { CommandPalette } from "@/components/impactlens/CommandPalette";
import { ShortcutHelp } from "@/components/impactlens/ShortcutHelp";
import { useImpactStore } from "@/lib/store";

export function Dashboard() {
  const activeTab = useImpactStore((s) => s.activeTab);
  const setTab = useImpactStore((s) => s.setTab);
  const section = sectionOf(activeTab);
  const view = section.views.find((v) => v.id === activeTab)!;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
          {section.views.length > 1 && (
            <div className="mb-6 flex items-end gap-6 border-b border-stone-200">
              <h1 className="pb-2.5 text-xl font-semibold tracking-tight text-stone-900">
                {section.label}
              </h1>
              <div role="tablist" aria-label={`${section.label} views`} className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
                {section.views.map((v) => (
                  <button
                    key={v.id}
                    role="tab"
                    type="button"
                    aria-selected={v.id === activeTab}
                    onClick={() => setTab(v.id)}
                    className={cn(
                      "-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2.5 pt-1 text-sm transition-colors",
                      v.id === activeTab
                        ? "border-stone-900 font-medium text-stone-900"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div key={view.id} className="animate-in fade-in duration-200">
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "library" && <LibraryTab />}
            {activeTab === "projects" && <ProjectsTab />}
            {activeTab === "compare" && <CompareTab />}
            {activeTab === "insights" && <InsightsTab />}
            {activeTab === "reports" && <ReportsTab />}
            {activeTab === "search" && <SearchTab />}
            {activeTab === "campaign" && <CampaignTab />}
            {activeTab === "timeline" && <TimelineTab />}
          </div>
        </div>
      </main>

      <AssetDrawer />
      <UploadDialog />
      <CommandPalette />
      <ShortcutHelp />
    </div>
  );
}
