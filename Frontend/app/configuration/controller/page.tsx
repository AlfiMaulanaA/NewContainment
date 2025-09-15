// Modified UI template page
"use client";

import { Settings, Cpu, Cog, Timer, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import ConfigPin from "@/components/pin-config";
import SystemConfig from "@/components/system-config";
import SensorIntervalsConfig from "@/components/sensor-intervals-config";
import SystemManagement from "@/components/system-management";

// Main function for the system configuration page
export default function ConfigurationPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-lg font-semibold">IoT System Configuration</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="pin-config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pin-config" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Pin Configuration
            </TabsTrigger>
            <TabsTrigger
              value="system-config"
              className="flex items-center gap-2"
            >
              <Cog className="h-4 w-4" />
              System Settings
            </TabsTrigger>
            <TabsTrigger
              value="sensor-intervals"
              className="flex items-center gap-2"
            >
              <Timer className="h-4 w-4" />
              Sensor Intervals
            </TabsTrigger>
            <TabsTrigger
              value="system-management"
              className="flex items-center gap-2"
            >
              <Terminal className="h-4 w-4" />
              System Management
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pin-config">
            <ConfigPin />
          </TabsContent>
          <TabsContent value="system-config">
            <SystemConfig />
          </TabsContent>
          <TabsContent value="sensor-intervals">
            <SensorIntervalsConfig />
          </TabsContent>
          <TabsContent value="system-management">
            <SystemManagement />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
