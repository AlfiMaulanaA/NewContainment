"use client";

import React, { useState, useEffect, Suspense } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, RefreshCw, Loader2 } from "lucide-react";
import MqttStatus from "@/components/mqtt-status";
import { PageSkeleton } from "@/components/loading-skeleton";

// Lazy load heavy components
const IPConfiguration = React.lazy(() => import("@/components/network/ip-configuration"));
const ModbusTCP = React.lazy(() => import("@/components/network/modbus-tcp"));  
const SNMPConfiguration = React.lazy(() => import("@/components/network/snmp-configuration"));

// Component loading fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading...</span>
  </div>
);

export default function UnifiedNetworkPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ip-config");

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Preload components when user hovers over tabs
  const preloadComponent = (tabValue: string) => {
    if (tabValue === "modbus-tcp") {
      import("@/components/network/modbus-tcp");
    } else if (tabValue === "snmp") {
      import("@/components/network/snmp-configuration");
    }
  };

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Network Configuration</h1>
        </div>
        <div className="flex items-center gap-2">
          <MqttStatus />
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="ip-config" 
              onMouseEnter={() => preloadComponent("ip-config")}
            >
              IP Configuration
            </TabsTrigger>
            <TabsTrigger 
              value="modbus-tcp"
              onMouseEnter={() => preloadComponent("modbus-tcp")}
            >
              Modbus TCP
            </TabsTrigger>
            <TabsTrigger 
              value="snmp"
              onMouseEnter={() => preloadComponent("snmp")}
            >
              SNMP
            </TabsTrigger>
          </TabsList>

          {/* IP Configuration Tab */}
          <TabsContent value="ip-config" className="space-y-4">
            <Suspense fallback={<ComponentLoader />}>
              <IPConfiguration isLoading={isLoading} />
            </Suspense>
          </TabsContent>

          {/* Modbus TCP Tab */}
          <TabsContent value="modbus-tcp" className="space-y-4">
            <Suspense fallback={<ComponentLoader />}>
              <ModbusTCP isLoading={isLoading} />
            </Suspense>
          </TabsContent>

          {/* SNMP Tab */}
          <TabsContent value="snmp" className="space-y-4">
            <Suspense fallback={<ComponentLoader />}>
              <SNMPConfiguration isLoading={isLoading} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}