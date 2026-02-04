"use client"

import React, { useState, Suspense } from "react";
import { StudioProvider, useStudio } from "./StudioContext";

import CategoryTabs from "./CategoryTabs";
import FeatureSidebar from "./FeatureSidebar";
import Header from "@/components/layout/Header";
import { Menu, X, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import HistorySidebar from "@/components/generators/HistorySidebar";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <StudioProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[#0A0E13] text-white font-sans">
        {/* Global Header */}
        <Header />

        {/* Studio Workspace */}
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Studio Top Navigation (Categories) */}
            <CategoryTabs />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Studio Feature Sidebar (Desktop) */}
                <div className="hidden lg:block w-[80px] hover:w-[320px] transition-all duration-300 ease-in-out h-full shrink-0 border-r border-white/10 bg-[#1A1F2E] group overflow-hidden z-20">
                    <FeatureSidebar className="h-full" />
                </div>

                {/* Studio Feature Sidebar (Mobile Drawer) */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-40 w-[280px] bg-[#1A1F2E] transform transition-transform duration-300 ease-in-out lg:hidden border-r border-white/10 mt-[72px] max-h-[calc(100vh-72px)]", 
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
                        <span className="font-semibold text-white">Features</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-[#B0B8C4] hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <FeatureSidebar className="h-[calc(100%-57px)]" />
                </div>

                {/* Mobile Feature Toggle */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-20 p-2 bg-[#1F2833] border border-white/10 rounded-xl shadow-sm lg:hidden hover:bg-[#252D3D] text-[#B0B8C4]"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Studio Main Content */}
                <main className="flex-1 overflow-hidden flex flex-col relative w-full bg-[#0A0E13]">
                    <HistoryToggleButton />
                    {children}
                </main>

                 {/* Right Panel - History Sidebar (Collapsible) */}
                <HistorySidebarConditional />
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
            className="absolute top-4 right-4 p-3 bg-[#1F2833] hover:bg-[#252D3D] border border-white/10 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md z-10 flex items-center gap-2 group"
            title="Hiện lịch sử"
        >
            <History className="w-4 h-4 text-[#6B7280] group-hover:text-white" />
            <span className="text-sm font-medium text-[#6B7280] group-hover:text-white">Lịch sử</span>
        </button>
    );
}

// Conditional History Sidebar Component
function HistorySidebarConditional() {
    const { preferences } = useUserPreferences();
    
    if (!preferences.showHistorySidebar) return null;
    
    return (
        <div className="w-[60px] hover:w-[320px] transition-all duration-300 ease-in-out shrink-0 h-full hidden xl:block border-l border-white/10 bg-[#1A1F2E] relative group z-20">
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
