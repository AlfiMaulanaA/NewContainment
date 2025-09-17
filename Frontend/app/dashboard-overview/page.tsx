"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { containmentsApi } from "@/lib/api";

import Dashboard1 from "./components/dashboard-1";
import Dashboard2 from "./components/dashboard-2";
import Dashboard3 from "./components/dashboard-3";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Layout,
  RefreshCw
} from "lucide-react";
import { RealtimeClock } from "@/components/RealtimeClock";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

interface ContainmentData {
  id: number;
  type: number;
}

export default function DashboardOverview() {
  const [containmentData, setContainmentData] = useState<ContainmentData | null>(null);
  const searchParams = useSearchParams();

  const { preferences } = useDashboardPreferences();

  const dashboardComponents = [
    {
      name: "Dashboard 1",
      component: (props: any) => (
        <Dashboard1
          containmentData={containmentData}
          displayType={preferences.displayType}
          carouselMode={preferences.carouselMode}
          {...props}
        />
      )
    },
    {
      name: "Dashboard 2",
      component: (props: any) => (
        <Dashboard2
          containmentData={containmentData}
          displayType={preferences.displayType}
          carouselMode={preferences.carouselMode}
          {...props}
        />
      )
    },
    {
      name: "Dashboard 3",
      component: (props: any) => (
        <Dashboard3
          containmentData={containmentData}
          displayType={preferences.displayType}
          carouselMode={preferences.carouselMode}
          {...props}
        />
      )
    }
  ];

  useEffect(() => {
    const loadContainmentData = async () => {
      try {
        const containmentId = searchParams.get('containmentId');
        if (containmentId) {
          const response = await containmentsApi.getContainment(parseInt(containmentId));
          if (response.success && response.data) {
            setContainmentData({
              id: response.data.id,
              type: response.data.type
            });
          }
        }
      } catch (error) {
        console.error("Failed to load containment data:", error);
      }
    };

    loadContainmentData();
  }, [searchParams]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const renderDashboardContent = () => {
    // Get selected dashboard component
    const selectedDashboard = dashboardComponents.find((_, index) =>
      index === parseInt(preferences.selectedDashboardLayout.split('-')[1]) - 1
    ) || dashboardComponents[0];

    return (
      <div className="flex-1 p-4">
        <div className="space-y-4">
          <selectedDashboard.component containmentData={containmentData} />
        </div>
      </div>
    );
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <Layout className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IOT Containment Monitoring</h1>
        </div>

        {/* Real-time Clock with integrated refresh */}
        <div className="flex items-center gap-4">
          <RealtimeClock onRefresh={handleRefresh} />
        </div>
      </header>

      {renderDashboardContent()}
    </SidebarInset>
  );
}