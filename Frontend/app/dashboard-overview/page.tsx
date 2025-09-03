import Status from "./components/containment-status-tabs";
import Racks from "./components/containment-racks-tabs";
import Users from "./components/containment-user-tabs";
import Info from "./components/containment-info-tabs";
import Control from "./components/containment-control-tabs";
import InfoUser from "./components/containment-user-login-tabs";
import Sensor from "./components/containment-average-sensor-tabs";
import CCTV from "./components/containment-cctv-tabs";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Layout } from "lucide-react";

export default function DashboardOverview() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IOT Containment Monitoring</h1>
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <InfoUser />
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          {/* Left Column (60% width) */}
          <div className="flex flex-col gap-4">
            <Status />
            <Sensor />
          </div>

          {/* Right Column (40% width) */}
          <div className="flex flex-col gap-2">
            <Control />
            <Info />
            <Users />
          </div>
        </div>
        <Racks />
        <CCTV />
      </div>
    </SidebarInset>
  );
}
