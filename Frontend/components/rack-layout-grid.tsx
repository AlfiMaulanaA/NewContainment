"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Server,
  Activity,
  AlertTriangle,
  Thermometer,
  Wind,
  Settings,
  Power,
  Eye,
  HardDrive,
  Cpu,
  Router,
  Zap,
} from "lucide-react";
import { Rack, Device, DeviceType } from "@/lib/api-service";

interface RackLayoutGridProps {
  racks: Rack[];
  devices: Device[];
  showLabels?: boolean;
  showDevices?: boolean;
  onRackClick?: (rack: Rack) => void;
  className?: string;
}

interface RackPosition {
  row: number;
  col: number;
  rackKey: string;
  label: string;
}

// Rack positions based on the 3D layout image
const RACK_POSITIONS: RackPosition[] = [
  { row: 1, col: 0, rackKey: "rack6", label: "RACK 6" },
  { row: 1, col: 2, rackKey: "rack3", label: "RACK 3" },
  { row: 2, col: 0, rackKey: "rack5", label: "RACK 5" },
  { row: 2, col: 2, rackKey: "rack2", label: "RACK 2" },
  { row: 3, col: 0, rackKey: "rack4", label: "RACK 4" },
  { row: 3, col: 2, rackKey: "rack1", label: "RACK 1" },
];

// System components (non-rack items)
const SYSTEM_COMPONENTS = [
  {
    row: 0,
    col: 0,
    type: "smoke",
    label: "Smoke/FSS",
    icon: Wind,
    color: "bg-orange-600 border-orange-400",
  },
  {
    row: 0,
    col: 1,
    type: "back-door",
    label: "Automatic Sliding Back Door",
    icon: Settings,
    color: "bg-blue-600 border-blue-400",
  },
  {
    row: 0,
    col: 2,
    type: "emg-temp",
    label: "EMG Temp",
    icon: Thermometer,
    color: "bg-red-600 border-red-400",
  },
  {
    row: 1,
    col: 1,
    type: "ceiling",
    label: "CEILING 3",
    icon: null,
    color: "border-dashed border-gray-600",
    isDashed: true,
  },
  {
    row: 2,
    col: 1,
    type: "ceiling",
    label: "CEILING 2",
    icon: null,
    color: "border-dashed border-gray-600",
    isDashed: true,
  },
  {
    row: 3,
    col: 1,
    type: "ceiling",
    label: "CEILING 1",
    icon: null,
    color: "border-dashed border-gray-600",
    isDashed: true,
  },
  {
    row: 4,
    col: 0,
    type: "emergency",
    label: "Emergency Status",
    icon: AlertTriangle,
    color: "bg-red-600 border-red-400",
  },
  {
    row: 4,
    col: 1,
    type: "front-door",
    label: "Automatic Sliding Front Door",
    icon: Settings,
    color: "bg-green-600 border-green-400",
  },
  {
    row: 4,
    col: 2,
    type: "lighting",
    label: "Lighting",
    icon: Power,
    color: "bg-yellow-600 border-yellow-400",
  },
];

// Device type icons mapping
const DEVICE_ICONS = {
  [DeviceType.Server]: Cpu,
  [DeviceType.Switch]: Router,
  [DeviceType.Router]: Router,
  [DeviceType.Sensor]: Thermometer,
  [DeviceType.PDU]: Zap,
  [DeviceType.PowerMeter]: Power,
  [DeviceType.UPS]: Power,
  [DeviceType.Other]: HardDrive,
};

export default function RackLayoutGrid({
  racks,
  devices,
  showLabels = true,
  showDevices = true,
  onRackClick,
  className = "",
}: RackLayoutGridProps) {
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);

  // Get rack by position key
  const getRackByPosition = (rackKey: string): Rack | null => {
    const rackNumber = rackKey.toLowerCase().replace("rack", "").trim();
    return (
      racks.find((rack) => {
        const rackName = rack.name.toLowerCase();
        return (
          rackName.includes(rackNumber) ||
          rackName.includes(rackKey.toLowerCase()) ||
          rackName === `rack ${rackNumber}` ||
          rackName === `rack${rackNumber}`
        );
      }) || null
    );
  };

  // Get device count for a rack
  const getDeviceCount = (rack: Rack): number => {
    return devices.filter((device) => device.rackId === rack.id).length;
  };

  // Get device status color for rack
  const getDeviceStatusColor = (rack: Rack): string => {
    const rackDevices = devices.filter((device) => device.rackId === rack.id);
    if (rackDevices.length === 0) return "bg-gray-400";

    const hasError = rackDevices.some(
      (device) =>
        device.status?.toLowerCase().includes("error") ||
        device.status?.toLowerCase().includes("offline")
    );
    const hasWarning = rackDevices.some((device) =>
      device.status?.toLowerCase().includes("warning")
    );

    if (hasError) return "bg-red-500";
    if (hasWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Get devices for a rack
  const getRackDevices = (rack: Rack): Device[] => {
    return devices.filter((device) => device.rackId === rack.id);
  };

  // Get device type summary for rack
  const getDeviceTypeSummary = (rack: Rack): Record<string, number> => {
    const rackDevices = getRackDevices(rack);
    const summary: Record<string, number> = {};
    rackDevices.forEach((device) => {
      summary[device.type] = (summary[device.type] || 0) + 1;
    });
    return summary;
  };

  // Render rack card
  const renderRackCard = (position: RackPosition) => {
    const rack = getRackByPosition(position.rackKey);
    const deviceCount = rack ? getDeviceCount(rack) : 0;
    const statusColor = rack ? getDeviceStatusColor(rack) : "bg-gray-400";
    const rackDevices = rack ? getRackDevices(rack) : [];
    const deviceSummary = rack ? getDeviceTypeSummary(rack) : {};

    return (
      <TooltipProvider key={position.rackKey}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`
                relative flex flex-col h-28 cursor-pointer transition-all duration-200
                ${
                  rack
                    ? "bg-gray-800 border-2 border-gray-600 hover:border-blue-400 hover:shadow-lg"
                    : "bg-gray-900 border-2 border-gray-700"
                }
                rounded-lg p-3 shadow-xl
                ${hoveredRack === position.rackKey ? "scale-105" : ""}
              `}
              onClick={() => {
                if (rack && onRackClick) {
                  onRackClick(rack);
                }
              }}
              onMouseEnter={() => setHoveredRack(position.rackKey)}
              onMouseLeave={() => setHoveredRack(null)}
            >
              {rack ? (
                <>
                  {/* Rack Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {showLabels && (
                        <span className="text-white font-medium text-sm truncate">
                          {rack.name}
                        </span>
                      )}
                      <Badge
                        variant={rack.isActive ? "default" : "secondary"}
                        className="text-xs px-1"
                      >
                        {rack.isActive ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${statusColor}`}></div>
                  </div>

                  {/* Rack Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    {showDevices && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-300">
                          {deviceCount} devices
                        </div>
                        {deviceCount > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(deviceSummary)
                              .slice(0, 3)
                              .map(([type, count]) => {
                                const IconComponent =
                                  DEVICE_ICONS[type as DeviceType] || HardDrive;
                                return (
                                  <div
                                    key={type}
                                    className="flex items-center gap-1 bg-gray-700 rounded px-1 py-0.5"
                                  >
                                    <IconComponent className="h-2 w-2 text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                      {count}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Capacity indicator */}
                    <div className="text-xs text-gray-400">
                      {rack.capacityU || 42}U
                    </div>
                  </div>

                  {/* Click indicator */}
                  {hoveredRack === position.rackKey && (
                    <div className="absolute top-2 right-2">
                      <Eye className="h-3 w-3 text-blue-400" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {showLabels && position.label}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {rack ? (
              <div className="space-y-1">
                <p className="font-medium">{rack.name}</p>
                <p className="text-xs">
                  {deviceCount} devices • {rack.capacityU || 42}U capacity
                </p>
                {rackDevices.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Devices:</p>
                    {rackDevices.slice(0, 3).map((device) => (
                      <p key={device.id} className="text-xs">
                        • {device.name} ({device.type})
                      </p>
                    ))}
                    {rackDevices.length > 3 && (
                      <p className="text-xs">
                        ... and {rackDevices.length - 3} more
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Click to view details
                </p>
              </div>
            ) : (
              <p>{position.label} - No rack configured</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render system component card
  const renderSystemComponent = (component: any) => {
    const IconComponent = component.icon;

    return (
      <div
        key={`${component.type}-${component.row}-${component.col}`}
        className={`
          flex flex-col items-center justify-center p-2
          ${component.row === 0 ? "justify-start" : "justify-end"}
        `}
      >
        <div
          className={`
            w-full h-12 border-2 rounded-lg flex items-center justify-center
            text-white text-sm font-medium shadow-lg
            ${component.color}
            ${component.isDashed ? "bg-transparent text-gray-400" : ""}
          `}
        >
          {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
          {showLabels && (
            <span className="truncate text-xs">{component.label}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg p-8 overflow-hidden ${className}`}>
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="h-full w-full">
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-3 gap-4 min-h-[500px] relative z-10">
        {/* Create 5x3 grid (0-4 rows, 0-2 cols) */}
        {[...Array(5)].map((_, row) =>
          [...Array(3)].map((_, col) => {
            // Check for system components
            const systemComponent = SYSTEM_COMPONENTS.find(
              (comp) => comp.row === row && comp.col === col
            );
            if (systemComponent) {
              return renderSystemComponent(systemComponent);
            }

            // Check for rack positions
            const rackPosition = RACK_POSITIONS.find(
              (pos) => pos.row === row && pos.col === col
            );
            if (rackPosition) {
              return renderRackCard(rackPosition);
            }

            // Empty cell
            return (
              <div
                key={`empty-${row}-${col}`}
                className="flex items-center justify-center text-gray-600 text-sm"
              >
                {/* Empty space */}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 rounded-lg p-3">
        <div className="text-white text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>All OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span>Error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
            <span>No devices</span>
          </div>
        </div>
      </div>
    </div>
  );
}