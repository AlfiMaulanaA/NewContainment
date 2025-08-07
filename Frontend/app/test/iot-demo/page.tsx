"use client";

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TestTube } from "lucide-react";
import IoTStatusTabs from "@/components/iot-status-tabs";
import IoTStatusWidget from "@/components/iot-status-widget";
import IoTTestControls from "@/components/iot-test-controls";

export default function IoTDemoPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <TestTube className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IoT Widgets Demo</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Test Controls */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Data Generator</h2>
          <IoTTestControls />
        </div>

        {/* Widget Demo */}
        <div>
          <h2 className="text-xl font-semibold mb-4">IoT Status Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <IoTStatusWidget containmentId={1} containmentName="Server Room A" />
            <IoTStatusWidget containmentId={2} containmentName="Server Room B" />
            <IoTStatusWidget containmentId={1} containmentName="Demo Widget" showViewButton={false} />
          </div>
        </div>

        {/* Full Tabs Demo */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Full IoT Status Dashboard</h2>
          <IoTStatusTabs />
        </div>
      </div>
    </SidebarInset>
  );
}