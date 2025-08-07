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
const ContainmentStatusTabs = React.lazy(() => import("@/components/containment-status-tabs"));
const ContainmentRacks = React.lazy(() => import("@/components/containment-card-racks-tabs"));
const CctvDashboardWidget = React.lazy(() => import("@/components/cctv-dashboard-widget"));
// import { 
//   SystemStatusWidget, 
//   ConnectivityWidget, 
//   AlertSummaryWidget, 
//   PowerEnergyWidget 
// } from "@/components/dashboard-widgets";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ContainmentDashboard() {
  const appName = process.env.NEXT_PUBLIC_APP_DESC || "IOT Containment Dashboard";

  // Define dashboard components
  const dashboardComponents = [
    ContainmentStatusTabs,
    ContainmentRacks,
    CctvDashboardWidget,
    // SystemStatusWidget,
    // ConnectivityWidget,
    // AlertSummaryWidget,
    // PowerEnergyWidget
  ];

  // Component names for carousel indicators
  const componentNames = [
    "Containment Status Overview",
    "Rack Management",
    "CCTV Surveillance",
    "System Performance",
    "Connectivity Status", 
    "System Alerts",
    "Power & Energy"
  ];

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
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading dashboard components...</span>
          </div>
        }>
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