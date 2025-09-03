"use client";

import React, { useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Shield, AlertTriangle } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useMQTT } from "@/hooks/useMQTT";
import { useZKTecoDevices } from "@/hooks/useZKTecoDevices";
import { DeviceList } from "@/components/zkteco/device-list";
import { DeviceForm } from "@/components/zkteco/device-form";
import type { ZKTecoDevice } from "@/types/zkteco";

export default function AccessControlDevicePage() {
  useAuthGuard(); // Protect this page
  
  const { isConnected, error: mqttError } = useMQTT();
  const {
    devices,
    loading,
    error,
    testResults,
    testLoading,
    addDevice,
    updateDevice,
    deleteDevice,
    refreshDevices,
    testDevice,
    testAllDevices,
    clearError,
    clearTestResults
  } = useZKTecoDevices();

  // Form state management
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ZKTecoDevice | null>(null);

  // Handle form submissions
  const handleAddDevice = () => {
    setEditingDevice(null);
    setShowForm(true);
    clearError();
  };

  const handleEditDevice = (device: ZKTecoDevice) => {
    setEditingDevice(device);
    setShowForm(true);
    clearError();
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingDevice) {
        // Update existing device
        const success = await updateDevice(editingDevice.id, data);
        if (success) {
          setShowForm(false);
          setEditingDevice(null);
        }
        return success;
      } else {
        // Add new device
        const success = await addDevice(data);
        if (success) {
          setShowForm(false);
        }
        return success;
      }
    } catch (err) {
      return false;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDevice(null);
    clearError();
  };

  const handleDeleteDevice = async (deviceId: string) => {
    return await deleteDevice(deviceId);
  };

  const handleTestDevice = async (deviceId: string) => {
    await testDevice(deviceId);
  };

  const handleTestAllDevices = async () => {
    await testAllDevices();
  };

  const handleRefresh = async () => {
    clearTestResults();
    await refreshDevices();
  };

  // Calculate statistics
  const totalDevices = devices.length;
  const enabledDevices = devices.filter(d => d.enabled).length;
  const onlineDevices = testResults.filter(r => r.status === 'online').length;
  const offlineDevices = testResults.filter(r => r.status === 'offline').length;

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/access-control">Access Control</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Device Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          {/* MQTT Status Indicator */}
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                MQTT Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                MQTT Disconnected
              </>
            )}
          </Badge>

          {/* Device Statistics */}
          {totalDevices > 0 && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Badge variant="outline">{totalDevices} Total</Badge>
              <Badge variant="outline">{enabledDevices} Enabled</Badge>
              {testResults.length > 0 && (
                <>
                  <Badge variant="default" className="bg-green-500">
                    {onlineDevices} Online
                  </Badge>
                  {offlineDevices > 0 && (
                    <Badge variant="destructive">{offlineDevices} Offline</Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* MQTT Connection Alert */}
        {!isConnected && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              MQTT connection is required for device management. Please check your connection settings.
              {mqttError && (
                <div className="mt-1 text-sm opacity-90">
                  Error: {mqttError}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs Navigation */}
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Device Management
            </TabsTrigger>
            <TabsTrigger value="form" disabled={!showForm} className="flex items-center gap-2">
              {editingDevice ? "Edit Device" : "Add Device"}
            </TabsTrigger>
          </TabsList>

          {/* Device List Tab */}
          <TabsContent value="devices" className="space-y-4">
            <DeviceList
              devices={devices}
              testResults={testResults}
              loading={loading}
              testLoading={testLoading}
              error={error}
              onAddDevice={handleAddDevice}
              onEditDevice={handleEditDevice}
              onDeleteDevice={handleDeleteDevice}
              onTestDevice={handleTestDevice}
              onTestAllDevices={handleTestAllDevices}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          {/* Device Form Tab */}
          <TabsContent value="form" className="space-y-4">
            {showForm && (
              <DeviceForm
                device={editingDevice || undefined}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                loading={loading}
                error={error}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}