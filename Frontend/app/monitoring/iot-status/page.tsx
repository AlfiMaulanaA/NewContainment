"use client";

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Activity } from "lucide-react";
import IoTStatusTabs from "@/components/iot-status-tabs";

export default function IoTStatusPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Activity className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IoT Status Monitoring</h1>
        </div>
      </header>

      <div className="p-4">
        <IoTStatusTabs />
      </div>
    </SidebarInset>
  );
}