"use client";

import React, { Suspense } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Loader2 } from "lucide-react";
import RealtimeClock from "@/components/realtime-clock";
import Refresh from "@/components/refresh-button";
import { DashboardCarousel } from "@/components/dashboard-carousel";
import { DashboardSettingsShortcut } from "@/components/dashboard-settings-shortcut";

// Lazy load heavy components for better performance
const ContainmentStatusTabs = React.lazy(
  () => import("@/app/dashboard-overview/components/containment-status-realtime-tabs")
);
// const ContainmentStatusTabs = React.lazy( // OLD: Database-polled status
//   () => import("@/components/containment-status-tabs")
// );
const ContainmentRacks = React.lazy(
  () => import("@/components/containment-card-racks-tabs")
);
const CCTVMonitoring = React.lazy(
  () => import("@/components/dashboard-cctv-section")
);
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

export default function ContainmentDashboard() {
  const appName =
    process.env.NEXT_PUBLIC_APP_DESC || "IOT Containment Dashboard";

  const { preferences } = useDashboardPreferences();

  // Define dashboard components - conditionally include CCTV based on settings
  const baseComponents = [ContainmentStatusTabs, ContainmentRacks];
  const baseComponentNames = ["Containment Status Overview", "Rack Management"];

  // Add CCTV component only if enabled
  const dashboardComponents = preferences.cctvSettings?.enabled
    ? [...baseComponents, CCTVMonitoring]
    : baseComponents;

  const componentNames = preferences.cctvSettings?.enabled
    ? [...baseComponentNames, "CCTV Monitoring"]
    : baseComponentNames;

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{appName}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!useIsMobile() && <RealtimeClock />}
          <Refresh />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Suspense
          fallback={
            <div className="w-full min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Loading Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Preparing your IoT monitoring components...
                  </p>
                </div>
                {/* Skeleton loading preview */}
                <div className="mt-6 space-y-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-64 mx-auto"></div>
                  <div className="h-32 bg-gray-100 rounded-lg w-full max-w-4xl mx-auto"></div>
                  <div className="flex justify-center space-x-2">
                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                    <div className="h-2 w-6 bg-primary rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <DashboardCarousel
            components={dashboardComponents}
            componentNames={componentNames}
            showControls={false} // Hide all controls on dashboard
            className="w-full"
          />
        </Suspense>
      </div>

      {/* Settings Shortcut */}
      <DashboardSettingsShortcut />
    </SidebarInset>
  );
}
