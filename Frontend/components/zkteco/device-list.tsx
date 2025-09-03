"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, 
  Wifi, 
  WifiOff, 
  Edit, 
  Trash2, 
  TestTube, 
  RefreshCw,
  Plus,
  Activity,
  Loader2
} from "lucide-react";
import type { ZKTecoDevice, DeviceConnectionTest } from "@/types/zkteco";

interface DeviceListProps {
  devices: ZKTecoDevice[];
  testResults: DeviceConnectionTest[];
  loading: boolean;
  testLoading: boolean;
  error: string | null;
  onAddDevice: () => void;
  onEditDevice: (device: ZKTecoDevice) => void;
  onDeleteDevice: (deviceId: string) => Promise<boolean>;
  onTestDevice: (deviceId: string) => Promise<void>;
  onTestAllDevices: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function DeviceList({
  devices,
  testResults,
  loading,
  testLoading,
  error,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
  onTestDevice,
  onTestAllDevices,
  onRefresh
}: DeviceListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<ZKTecoDevice | null>(null);

  // Get test result for a device
  const getTestResult = (deviceId: string): DeviceConnectionTest | undefined => {
    return testResults.find(result => result.device_id === deviceId);
  };

  // Handle delete confirmation
  const handleDeleteClick = (device: ZKTecoDevice) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deviceToDelete) {
      const success = await onDeleteDevice(deviceToDelete.id);
      if (success) {
        setDeleteDialogOpen(false);
        setDeviceToDelete(null);
      }
    }
  };

  // Render device status badge
  const renderStatusBadge = (device: ZKTecoDevice) => {
    const testResult = getTestResult(device.id);
    
    if (!device.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    if (testLoading) {
      return (
        <Badge variant="outline" className="animate-pulse">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Testing...
        </Badge>
      );
    }
    
    if (testResult) {
      return testResult.status === 'online' ? (
        <Badge variant="default" className="bg-green-500">
          <Wifi className="h-3 w-3 mr-1" />
          Online
        </Badge>
      ) : (
        <Badge variant="destructive">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      );
    }
    
    return <Badge variant="outline">Unknown</Badge>;
  };

  // Render device info
  const renderDeviceInfo = (device: ZKTecoDevice) => {
    const testResult = getTestResult(device.id);
    
    if (!testResult?.device_info) return null;
    
    return (
      <div className="text-sm text-muted-foreground">
        {testResult.device_info.firmware_version && (
          <div>FW: {testResult.device_info.firmware_version}</div>
        )}
        {testResult.device_info.user_count !== undefined && (
          <div>Users: {testResult.device_info.user_count}</div>
        )}
      </div>
    );
  };

  if (loading && devices.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ZKTeco Devices ({devices.length})
              </CardTitle>
              <CardDescription>
                Manage your ZKTeco access control devices
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onTestAllDevices}
                disabled={testLoading || devices.length === 0}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test All
              </Button>
              
              <Button size="sm" onClick={onAddDevice}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No devices configured</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first ZKTeco device
              </p>
              <Button onClick={onAddDevice}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Device
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const testResult = getTestResult(device.id);
                    
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {device.id}
                            </div>
                            {renderDeviceInfo(device)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-sm">{device.ip}:{device.port}</div>
                            {device.force_udp && (
                              <Badge variant="outline" size="sm">UDP</Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>Timeout: {device.timeout}s</div>
                            {device.password > 0 && (
                              <div>Password: Protected</div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {renderStatusBadge(device)}
                        </TableCell>
                        
                        <TableCell>
                          {testResult?.response_time_ms ? (
                            <span className="text-sm font-mono">
                              {testResult.response_time_ms.toFixed(1)}ms
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onTestDevice(device.id)}
                                disabled={testLoading}
                              >
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Connection
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onEditDevice(device)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Device
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(device)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Device
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete device "{deviceToDelete?.name}"? 
              This action cannot be undone and will remove the device from your access control system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}