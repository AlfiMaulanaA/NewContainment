"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { containmentsApi } from "@/lib/api";
import Status from "./dashboard-overview/components/containment-status-tabs";
import Racks from "./dashboard-overview/components/containment-racks-tabs";
import Users from "./dashboard-overview/components/containment-user-tabs";
import Info from "./dashboard-overview/components/containment-info-tabs";
import Control from "./dashboard-overview/components/containment-control-tabs";
import InfoUser from "./dashboard-overview/components/containment-user-login-tabs";
import Sensor from "./dashboard-overview/components/containment-average-sensor-tabs";
// import CCTV from "./dashboard-overview/components/containment-cctv-tabs";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Layout } from "lucide-react";
import { RealtimeClock } from "@/components/RealtimeClock";

interface ContainmentData {
  id: number;
  type: number;
}

export default function DashboardOverview() {
  const [containmentData, setContainmentData] = useState<ContainmentData | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadContainmentData = async () => {
      try {
        // Get containmentId from URL params or localStorage
        const urlContainmentId = searchParams.get("containmentId");
        const storedContainmentId = localStorage.getItem("selectedContainmentId");
        const containmentId = urlContainmentId ? parseInt(urlContainmentId) :
                              storedContainmentId ? parseInt(storedContainmentId) : null;

        if (containmentId) {
          const result = await containmentsApi.getContainments();
          if (result.success && result.data) {
            const containment = result.data.find((c) => c.id === containmentId);
            if (containment) {
              setContainmentData({
                id: containment.id,
                type: containment.type,
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load containment data:", error);
      }
    };

    loadContainmentData();
  }, [searchParams]);

  // Hide Info component if ContainmentId === 1 and type === 2
  const shouldShowInfo = !(containmentData?.id === 1 && containmentData?.type === 2);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IOT Containment Monitoring</h1>
        </div>
        <div className="ml-auto">
          <RealtimeClock />
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <InfoUser />
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          {/* Left Column (60% width) */}
          <div className="flex flex-col gap-4">
            <Status />
          </div>

          {/* Right Column (40% width) */}
          <div className="flex flex-col gap-2">
            <Control />
            {shouldShowInfo && <Info />}
            {/* <Users /> */}
          </div>
        </div>
        <Sensor />
        <Racks />
        {/* <CCTV /> */}
      </div>
    </SidebarInset>
  );
}
