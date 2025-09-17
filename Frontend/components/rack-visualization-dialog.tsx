"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HardDrive,
  Server,
  Monitor,
  Wifi,
  Database,
  Cpu,
  Eye,
  AlertCircle,
  CheckCircle,
  Circle,
  Activity,
  Settings,
  Save,
} from "lucide-react";
import { devicesApi, Device, Rack } from "@/lib/api-service";
import { toast } from "sonner";

interface RackVisualizationDialogProps {
  rack: Rack;
  trigger?: React.ReactNode;
}

interface RackUnit {
  unitNumber: number;
  device?: Device;
  isOccupied: boolean;
  isDeviceStart?: boolean;
  isDeviceContinuation?: boolean;
  deviceStartPosition?: number;
}

const getDeviceIcon = (deviceType?: string) => {
  switch (deviceType?.toLowerCase()) {
    case "server":
      return <Server className="h-4 w-4" />;
    case "switch":
    case "network":
    case "router":
      return <Wifi className="h-4 w-4" />;
    case "storage":
      return <Database className="h-4 w-4" />;
    case "monitor":
      return <Monitor className="h-4 w-4" />;
    case "compute":
    case "cpu":
      return <Cpu className="h-4 w-4" />;
    case "sensor":
      return <Activity className="h-4 w-4" />;
    default:
      return <HardDrive className="h-4 w-4" />;
  }
};

const getDeviceColor = (deviceType?: string) => {
  switch (deviceType?.toLowerCase()) {
    case "server":
      return "bg-blue-500";
    case "switch":
    case "network":
    case "router":
      return "bg-green-500";
    case "storage":
      return "bg-purple-500";
    case "monitor":
      return "bg-orange-500";
    case "compute":
    case "cpu":
      return "bg-red-500";
    case "sensor":
      return "bg-teal-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "online":
    case "running":
      return "text-green-500";
    case "inactive":
    case "offline":
    case "stopped":
      return "text-red-500";
    case "maintenance":
    case "updating":
      return "text-yellow-500";
    default:
      return "text-gray-500";
  }
};

const getStatusIcon = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "online":
    case "running":
      return <CheckCircle className="h-3 w-3" />;
    case "inactive":
    case "offline":
    case "stopped":
      return <AlertCircle className="h-3 w-3" />;
    case "maintenance":
    case "updating":
      return <Circle className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
};

export default function RackVisualizationDialog({
  rack,
  trigger,
}: RackVisualizationDialogProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [rackUnits, setRackUnits] = useState<RackUnit[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const result = await devicesApi.getDevicesByRack(rack.id);
      if (result.success && result.data) {
        setDevices(result.data);
        buildRackUnits(result.data);
      } else {
        toast.error(result.message || "Failed to load devices");
      }
    } catch (error: any) {
      console.error("Error loading devices:", error);
      toast.error("Error loading devices");
    } finally {
      setLoading(false);
    }
  };

  const buildRackUnits = (deviceList: Device[]) => {
    const totalUnits = rack.capacityU || 42; // Default 42U rack
    const units: RackUnit[] = [];

    // Initialize all units as empty
    for (let i = totalUnits; i >= 1; i--) {
      units.push({
        unitNumber: i,
        isOccupied: false,
      });
    }

    // Place devices starting from the top (highest U number)
    let currentPosition = totalUnits;
    deviceList.forEach((device) => {
      if (device.uCapacity) {
        const height = device.uCapacity;
        const startPosition = currentPosition - height + 1; // Start position for this device
        currentPosition -= height; // Next device will start below this one

        // Mark units as occupied - device name only shows at the top unit
        for (let i = 0; i < height; i++) {
          const unitIndex = totalUnits - (startPosition + i);
          if (unitIndex >= 0 && unitIndex < units.length) {
            units[unitIndex] = {
              unitNumber: startPosition + i,
              device: device,
              isOccupied: true,
              isDeviceStart: i === height - 1, // Device name shows at the TOP unit (highest number)
              isDeviceContinuation: i < height - 1, // Other units are continuation
              deviceStartPosition: startPosition,
            };
          }
        }
      }
    });

    setRackUnits(units);
  };

  useEffect(() => {
    loadDevices();
  }, [rack.id]);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-1" />
      View Rack
    </Button>
  );

  const usedUnits = devices.reduce(
    (sum, device) => sum + (device.uCapacity || 0),
    0
  );
  const remainingUnits = (rack.capacityU || 42) - usedUnits;
  const utilizationPercentage = Math.round(
    (usedUnits / (rack.capacityU || 42)) * 100
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Rack Visualization: {rack.name}
          </DialogTitle>
          <DialogDescription>
            View the physical layout and device placement in this rack. Click on
            devices for detailed information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
          {/* Rack Visual */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Rack Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 flex-shrink-0">
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {rack.capacityU || 42}U
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {usedUnits}U
                  </div>
                  <div className="text-xs text-muted-foreground">Used</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {remainingUnits}U
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {utilizationPercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Utilization
                  </div>
                </div>
              </Card>
            </div>

            {/* Rack Visual */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                <div className="text-center mb-2 font-semibold">
                  {rack.name} - {rack.description || "Server Rack"}
                </div>
                <ScrollArea className="flex-1 h-full">
                  <div className="space-y-0.5">
                    {loading ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      rackUnits.map((unit) => (
                        <div
                          key={unit.unitNumber}
                          className={`
                            flex items-center h-8 border rounded-sm cursor-pointer transition-colors
                            ${
                              unit.isOccupied
                                ? unit.device
                                  ? unit.isDeviceStart
                                    ? `${getDeviceColor(
                                        unit.device.type
                                      )} text-white hover:opacity-80`
                                    : "bg-gray-400 dark:bg-gray-600 text-white hover:opacity-80"
                                  : "bg-gray-400 dark:bg-gray-600 text-white"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }
                          `}
                          onClick={() =>
                            unit.device && setSelectedDevice(unit.device)
                          }
                        >
                          {/* Unit Number */}
                          <div className="w-8 text-xs font-mono text-center border-r border-opacity-30 dark:border-gray-500">
                            {unit.unitNumber}
                          </div>

                          {/* Device Info */}
                          <div className="flex-1 px-2 flex items-center justify-between">
                            {unit.device ? (
                              unit.isDeviceStart ? (
                                <>
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    {getDeviceIcon(unit.device.type)}
                                    <span className="text-xs font-medium truncate">
                                      {unit.device.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mr-3">
                                    <span
                                      className={`text-xs ${getStatusColor(
                                        unit.device.status
                                      )}`}
                                    >
                                      {getStatusIcon(unit.device.status)}
                                    </span>
                                    <span className="text-xs">
                                      {unit.device.uCapacity}U
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex-1 flex items-center justify-between">
                                  <div className="text-xs opacity-70 font-medium mr-2.5">
                                    {unit.device.name} (continued)
                                  </div>
                                  <div className="text-xs opacity-60 mr-3">
                                    U{unit.deviceStartPosition}-
                                    {unit.deviceStartPosition! +
                                      (unit.device.uCapacity || 1) -
                                      1}
                                  </div>
                                </div>
                              )
                            ) : unit.isOccupied ? (
                              <div className="text-xs opacity-70">
                                Device Continued
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Available
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Device Details Sidebar */}
          <div className="w-80 flex flex-col min-h-0">
            {/* Legend */}
            <Card className="mb-4 flex-shrink-0">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Legend</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded"></div>
                    <span>Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded"></div>
                    <span>Network/Switch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 dark:bg-purple-600 rounded"></div>
                    <span>Storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded"></div>
                    <span>Monitor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 dark:bg-red-600 rounded"></div>
                    <span>Compute/CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-teal-500 dark:bg-teal-600 rounded"></div>
                    <span>Sensor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"></div>
                    <span>Empty Unit</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device List */}
            <Card className="flex-1 min-h-0">
              <CardContent className="p-4 flex flex-col h-full">
                <h4 className="font-semibold mb-3">
                  Devices ({devices.length})
                </h4>
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-colors
                          ${
                            selectedDevice?.id === device.id
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }
                        `}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className={`p-1 rounded ${getDeviceColor(
                                device.type
                              )} text-white`}
                            >
                              {getDeviceIcon(device.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {device.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Type: {device.type} ({device.uCapacity}U height)
                              </div>
                            </div>
                          </div>
                          <div
                            className={`ml-2 ${getStatusColor(device.status)}`}
                          >
                            {getStatusIcon(device.status)}
                          </div>
                        </div>
                        {device.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {device.description}
                          </div>
                        )}
                      </div>
                    ))}
                    {devices.length === 0 && !loading && (
                      <div className="text-center py-8 text-muted-foreground">
                        <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div>No devices in this rack</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Device Details */}
            {selectedDevice && (
              <Card className="mt-4 flex-shrink-0">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    {getDeviceIcon(selectedDevice.type)}
                    Device Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedDevice.name}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {selectedDevice.type || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Rack ID:</span>{" "}
                      {selectedDevice.rackId}
                    </div>
                    <div>
                      <span className="font-medium">Height:</span>{" "}
                      {selectedDevice.uCapacity}U
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge
                        variant={
                          selectedDevice.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {selectedDevice.status || "Unknown"}
                      </Badge>
                    </div>
                    {selectedDevice.description && (
                      <div>
                        <span className="font-medium">Description:</span>
                        <div className="mt-1 text-muted-foreground">
                          {selectedDevice.description}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
