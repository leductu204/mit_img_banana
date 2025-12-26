"use client"

import React, { useState } from "react";
import { StudioProvider } from "./StudioContext";
import CategoryTabs from "./CategoryTabs";
import FeatureSidebar from "./FeatureSidebar";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Menu, X, History } from "lucide-react";
import { cn } from "@/lib/utils";
import HistorySidebar from "@/components/generators/HistorySidebar";
import { useStudio } from "./StudioContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <StudioProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Global Sidebar - Only visible on Desktop */}
        <Sidebar />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Global Mobile Navigation - Only visible on Mobile */}
            <MobileNav />

            {/* Studio Workspace */}
            <div className="flex flex-col flex-1 overflow-hidden pt-[57px] md:pt-0">
                {/* Studio Top Navigation (Categories) */}
                <CategoryTabs />

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Studio Feature Sidebar (Desktop) */}
                    <div className="hidden lg:block w-[80px] hover:w-[320px] transition-all duration-300 ease-in-out h-full shrink-0 border-r border-border bg-card group overflow-hidden z-20">
                        <FeatureSidebar className="h-full" />
                    </div>

                    {/* Studio Feature Sidebar (Mobile Drawer) */}
                    {isSidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                    <div className={cn(
                        "fixed inset-y-0 left-0 z-40 w-[280px] bg-background transform transition-transform duration-300 ease-in-out lg:hidden border-r border-border mt-[57px] max-h-[calc(100vh-57px)]", 
                        // Added mt-[57px] to sit below MobileNav
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}>
                        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
                            <span className="font-semibold">Features</span>
                            <button onClick={() => setIsSidebarOpen(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <FeatureSidebar className="h-[calc(100%-57px)]" />
                    </div>

                    {/* Mobile Feature Toggle */}
                    {/* We position this floating or inside the main area contextually */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-4 left-4 z-20 p-2 bg-background border border-border rounded-md shadow-sm lg:hidden hover:bg-muted"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Studio Main Content */}
                    <main className="flex-1 overflow-hidden flex flex-col relative w-full">
                        <HistoryToggleButton />
                        {children}
                    </main>

                     {/* Right Panel - History Sidebar (Collapsible) */}
                    <HistorySidebarConditional />
                </div>
            </div>
        </div>
      </div>
    </StudioProvider>
  );
}

// Show History Button Component
function HistoryToggleButton() {
    const { preferences, toggleHistorySidebar } = useUserPreferences();
    
    if (preferences.showHistorySidebar) return null;
    
    return (
        <button
            onClick={toggleHistorySidebar}
            className="absolute top-4 right-4 p-3 bg-card hover:bg-muted border border-border rounded-lg shadow-sm transition-all duration-200 hover:shadow-md z-10 flex items-center gap-2 group"
            title="Hiện lịch sử"
        >
            <History className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Lịch sử</span>
        </button>
    );
}

// Conditional History Sidebar Component
function HistorySidebarConditional() {
    const { preferences } = useUserPreferences();
    
    if (!preferences.showHistorySidebar) return null;
    
    return (
        <div className="w-[60px] hover:w-[320px] transition-all duration-300 ease-in-out shrink-0 h-full hidden xl:block border-l border-border bg-card relative group z-20">
            <HistorySidebarWrapper />
        </div>
    );
}

function HistorySidebarWrapper() {
   const { setSelectedHistoryJob, selectedHistoryJob } = useStudio();
   
   return (
      <HistorySidebar 
          type="image" 
          onSelect={setSelectedHistoryJob}
          selectedJobId={selectedHistoryJob?.job_id}
      />
   );
}
