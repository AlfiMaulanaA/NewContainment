"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Layout,
  ArrowLeft,
  Server,
  Zap,
  Wind,
  AlertTriangle,
  Lightbulb,
  Thermometer,
  Shield,
  DoorOpen,
  DoorClosed,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  containmentsApi,
  racksApi,
  containmentStatusApi,
  devicesApi,
  Containment,
  Rack,
  ContainmentStatus,
  Device,
  ContainmentType,
  getContainmentTypeString,
} from "@/lib/api-service";

// Get containment type color with advanced gradient and styling
const getContainmentTypeColor = (type: ContainmentType): string => {
  switch (type) {
    case ContainmentType.HotAisleContainment:
      return "text-red-700 bg-gradient-to-r from-red-50/50 via-red-100/50 to-red-50/50 border border-red-300/60 shadow-sm rounded-full font-medium px-3 py-1 transition-all duration-300 hover:shadow-md hover:from-red-100/70 hover:via-red-200/70 hover:to-red-100/70 hover:border-red-400/80 hover:scale-[1.02] backdrop-blur-sm";
    case ContainmentType.ColdAisleContainment:
      return "text-blue-700 bg-gradient-to-r from-blue-50/50 via-blue-100/50 to-blue-50/50 border border-blue-300/60 shadow-sm rounded-full font-medium px-3 py-1 transition-all duration-300 hover:shadow-md hover:from-blue-100/70 hover:via-blue-200/70 hover:to-blue-100/70 hover:border-blue-400/80 hover:scale-[1.02] backdrop-blur-sm";
    default:
      return "text-gray-700 bg-gradient-to-r from-gray-50/50 via-gray-100/50 to-gray-50/50 border border-gray-300/60 shadow-sm rounded-full font-medium px-3 py-1 transition-all duration-300 hover:shadow-md hover:from-gray-100/70 hover:via-gray-200/70 hover:to-gray-100/70 hover:border-gray-400/80 hover:scale-[1.02] backdrop-blur-sm";
  }
};
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ContainmentLayoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const containmentId = searchParams.get("containmentId");
  const containmentName = searchParams.get("containmentName") || "";

  const [containment, setContainment] = useState<Containment | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [containmentStatus, setContainmentStatus] =
    useState<ContainmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: "rack" | "ceiling" | "utility";
    data: any;
  } | null>(null);

  // Load containment status
  const loadContainmentStatus = async () => {
    if (!containmentId) return;

    setStatusLoading(true);
    try {
      const statusResult = await containmentStatusApi.getLatestStatus(
        parseInt(containmentId)
      );
      if (statusResult.success && statusResult.data) {
        setContainmentStatus(statusResult.data);
      } else {
        setContainmentStatus(null);
      }
    } catch (error: any) {
      console.error("Failed to load containment status:", error);
      setContainmentStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  // Load device counts for racks (memoized callback for performance)
  const loadDeviceCounts = useCallback(async (racks: Rack[]) => {
    try {
      const deviceCountPromises = racks.map(async (rack) => {
        const result = await devicesApi.getDevicesByRack(rack.id);
        return {
          rackId: rack.id,
          count: result.success && result.data ? result.data.length : 0,
          devices: result.success && result.data ? result.data : [],
        };
      });

      const counts = await Promise.all(deviceCountPromises);
      const deviceCountMap: Record<number, number> = {};
      const allDevices: Device[] = [];

      counts.forEach(({ rackId, count, devices }) => {
        deviceCountMap[rackId] = count;
        allDevices.push(...devices);
      });

      setDeviceCounts(deviceCountMap);
      setDevices(allDevices);
    } catch (error: any) {
      console.error("Failed to load device counts:", error);
    }
  }, []);

  // Load containment and racks data
  useEffect(() => {
    const loadData = async () => {
      if (!containmentId) return;

      setLoading(true);
      try {
        const [containmentResult, racksResult] = await Promise.all([
          containmentsApi.getContainment(parseInt(containmentId)),
          racksApi.getRacksByContainment(parseInt(containmentId)),
        ]);

        if (containmentResult.success && containmentResult.data) {
          setContainment(containmentResult.data);
        } else {
          toast.error("Failed to load containment data");
        }

        if (racksResult.success && racksResult.data) {
          setRacks(racksResult.data);
          // Load device counts after setting racks
          await loadDeviceCounts(racksResult.data);
        } else {
          toast.error("Failed to load racks data");
        }

        // Load initial status
        await loadContainmentStatus();
      } catch (error: any) {
        toast.error(error.message || "Error loading data");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up polling for status updates
    const statusInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadContainmentStatus();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(statusInterval);
  }, [containmentId]);

  // Fixed 3 columns, dynamic rows based on racks (memoized for performance)
  const getGridDimensions = useMemo(() => {
    const rackCount = racks.length;
    const cols = 3; // Always 3 columns (left, middle, right)

    // Calculate rows needed:
    // - 1 row for top utilities
    // - Dynamic rows for racks (2 racks per row max, middle column is ceiling)
    // - 1 row for bottom utilities
    const rackRows = Math.ceil(rackCount / 2); // 2 racks per row (left and right columns)
    const totalRows = 2 + rackRows; // top utilities + rack rows + bottom utilities

    return {
      cols: 3, // Always 3 columns
      rows: totalRows,
      rackRows: rackRows,
      maxRacksPerRow: 2, // Only left and right columns have racks
    };
  }, [racks.length]);

  // Get rack data by position (now dynamic)
  const getRackByPosition = (position: number): Rack | null => {
    if (position >= racks.length) return null;
    return racks[position] || null;
  };

  // Get device count for a rack
  const getDeviceCount = (rackId: number): number => {
    return deviceCounts[rackId] || 0;
  };

  // Get device status color for rack
  const getDeviceStatusColor = (rackId: number): string => {
    const rackDevices = devices.filter((device) => device.rackId === rackId);
    if (rackDevices.length === 0) return "bg-gray-400";

    const hasError = rackDevices.some(
      (device) =>
        device.status?.toLowerCase().includes("error") ||
        device.status?.toLowerCase().includes("offline")
    );
    const hasWarning = rackDevices.some((device) =>
      device.status?.toLowerCase().includes("warning")
    );

    if (hasError) return "bg-red-500 animate-pulse";
    if (hasWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Get device types summary for a rack
  const getDeviceTypesSummary = (rackId: number): string[] => {
    const rackDevices = devices.filter((device) => device.rackId === rackId);
    const types = [...new Set(rackDevices.map((device) => device.type))];
    return types.slice(0, 3); // Show max 3 types
  };

  // Helper functions for status handling
  const getUtilityStatus = (type: string) => {
    if (!containmentStatus) return { status: false, lastUpdate: null };

    switch (type) {
      case "smoke":
        return {
          status: containmentStatus.smokeDetectorStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.smokeDetectorStatus
            ? "Smoke detected!"
            : "No smoke detected",
        };
      case "fss":
        return {
          status: containmentStatus.fssStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.fssStatus
            ? "FSS Active"
            : "FSS Standby",
        };
      case "emergency_temp":
        return {
          status: containmentStatus.emergencyTemp,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.emergencyTemp
            ? "Temperature alert!"
            : "Temperature normal",
        };
      case "lighting":
        return {
          status: containmentStatus.lightingStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.lightingStatus
            ? "Lights on"
            : "Lights off",
        };
      case "emergency":
        return {
          status: containmentStatus.emergencyStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.emergencyStatus
            ? "EMERGENCY ACTIVE!"
            : "System normal",
        };
      case "door_front":
        return {
          status: containmentStatus.limitSwitchFrontDoorStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.limitSwitchFrontDoorStatus
            ? "Door closed"
            : "Door open",
        };
      case "door_back":
        return {
          status: containmentStatus.limitSwitchBackDoorStatus,
          lastUpdate: containmentStatus.updatedAt,
          description: containmentStatus.limitSwitchBackDoorStatus
            ? "Door closed"
            : "Door open",
        };
      default:
        return { status: false, lastUpdate: null, description: "Unknown" };
    }
  };

  const getStatusIcon = (status: boolean, type: string) => {
    const iconProps = { className: "h-5 w-5" };

    switch (type) {
      case "smoke":
        return status ? (
          <Flame {...iconProps} className="h-5 w-5 text-red-500" />
        ) : (
          <Flame {...iconProps} className="h-5 w-5 text-gray-400" />
        );
      case "fss":
        return status ? (
          <Shield {...iconProps} className="h-5 w-5 text-blue-500" />
        ) : (
          <Shield {...iconProps} className="h-5 w-5 text-gray-400" />
        );
      case "emergency_temp":
        return status ? (
          <Thermometer {...iconProps} className="h-5 w-5 text-red-500" />
        ) : (
          <Thermometer {...iconProps} className="h-5 w-5 text-gray-400" />
        );
      case "lighting":
        return status ? (
          <Lightbulb {...iconProps} className="h-5 w-5 text-yellow-500" />
        ) : (
          <Lightbulb {...iconProps} className="h-5 w-5 text-gray-400" />
        );
      case "emergency":
        return status ? (
          <AlertTriangle
            {...iconProps}
            className="h-5 w-5 text-red-500 animate-pulse"
          />
        ) : (
          <AlertTriangle {...iconProps} className="h-5 w-5 text-green-500" />
        );
      case "door_front":
      case "door_back":
        return status ? (
          <DoorClosed {...iconProps} className="h-5 w-5 text-green-500" />
        ) : (
          <DoorOpen {...iconProps} className="h-5 w-5 text-yellow-500" />
        );
      default:
        return status ? (
          <CheckCircle2 {...iconProps} className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle {...iconProps} className="h-5 w-5 text-gray-400" />
        );
    }
  };

  const getStatusBadge = (status: boolean, type: string) => {
    switch (type) {
      case "smoke":
      case "emergency_temp":
      case "emergency":
        return (
          <Badge
            variant={status ? "destructive" : "default"}
            className={
              !status ? "bg-green-100 text-green-800 border-green-300" : ""
            }
          >
            {status ? "ALERT" : "Normal"}
          </Badge>
        );
      case "door_front":
      case "door_back":
        return (
          <Badge
            variant="default"
            className={
              status
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-yellow-100 text-yellow-800 border-yellow-300"
            }
          >
            {status ? "Closed" : "Open"}
          </Badge>
        );
      case "lighting":
        return (
          <Badge
            variant="default"
            className={
              status
                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                : "bg-gray-100 text-gray-800 border-gray-300"
            }
          >
            {status ? "Active" : "Inactive"}
          </Badge>
        );
      case "fss":
        return (
          <Badge
            variant="default"
            className={
              status
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-gray-100 text-gray-800 border-gray-300"
            }
          >
            {status ? "Active" : "Standby"}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="default"
            className={
              status
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-gray-100 text-gray-800 border-gray-300"
            }
          >
            {status ? "Active" : "Inactive"}
          </Badge>
        );
    }
  };

  // Grid item component using forwardRef to fix the ref warning
  const GridItem = React.forwardRef<
    HTMLDivElement,
    {
      children: React.ReactNode;
      className?: string;
      onClick?: () => void;
      title?: string;
      type?: "rack" | "ceiling" | "utility" | "door" | "default";
    }
  >(({ children, className = "", onClick, title, type = "default" }, ref) => {
    const baseClass =
      "border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-center font-medium transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50";

    const typeClasses = {
      rack: "bg-gray-800 dark:bg-gray-900 text-white dark:text-gray-100 hover:bg-gray-700 dark:hover:bg-gray-800 cursor-pointer min-h-[120px] border-gray-600 dark:border-gray-700",
      ceiling:
        "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer min-h-[80px] text-gray-800 dark:text-gray-200",
      utility:
        "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer min-h-[60px] py-4 border-gray-300 dark:border-gray-600",
      door: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer min-h-[60px] py-4 border-blue-300 dark:border-blue-700",
      default:
        "bg-white dark:bg-gray-800 min-h-[60px] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700",
    };

    return (
      <div
        ref={ref}
        className={cn(baseClass, typeClasses[type], className)}
        onClick={onClick}
        title={title}
      >
        {children}
      </div>
    );
  });

  GridItem.displayName = "GridItem";

  // Handle item click (memoized callback for performance)
  const handleItemClick = useCallback(
    (type: "rack" | "ceiling" | "utility", data: any) => {
      setSelectedItem({ type, data });
    },
    []
  );

  if (loading) {
    return (
      <SidebarInset>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/management/containments")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
          </Button>
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Layout className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Containment Layout
            {containment && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {containment.name}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {containment && (
            <Badge className={getContainmentTypeColor(containment.type)}>
              {getContainmentTypeString(containment.type)}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadContainmentStatus}
            disabled={statusLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${statusLoading ? "animate-spin" : ""}`}
            />
            Refresh Status
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/management/racks?containmentId=${containmentId}&containmentName=${encodeURIComponent(
                  containmentName
                )}`
              )
            }
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Racks
          </Button>
        </div>
      </header>

      {/* Containment Info Card */}
      {containment && (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {containment.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Location:</span>{" "}
                {containment.location}
              </div>
              <div>
                <span className="font-medium">Type:</span>{" "}
                {getContainmentTypeString(containment.type)}
              </div>
              <div>
                <span className="font-medium">Total Racks:</span> {racks.length}
              </div>
              <div>
                <span className="font-medium">Total Devices:</span>{" "}
                <Badge variant="outline" className="ml-1">
                  {devices.length}
                </Badge>
              </div>
            </div>
            {containment.description && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Description:</span>{" "}
                {containment.description}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content - Split Layout */}
      <div className="flex gap-4 m-4">
        {/* Left Side - 2D Grid Layout */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Containment Physical Layout</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {/* Grid Background Pattern */}
            <div className="absolute inset-0 opacity-10 dark:opacity-20">
              <svg width="100%" height="100%" className="h-full w-full">
                <defs>
                  <pattern
                    id="containment-grid"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="1"
                      fill="currentColor"
                      className="text-gray-400 dark:text-gray-500"
                      opacity="0.3"
                    />
                  </pattern>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="url(#containment-grid)"
                />
              </svg>
            </div>

            {/* Fixed 3 Columns, Dynamic Rows Layout */}
            <div
              className={`grid gap-4 max-w-4xl mx-auto relative z-10`}
              style={{
                gridTemplateColumns: `repeat(3, minmax(0, 1fr))`, // Always 3 columns
                gridTemplateRows: `repeat(${getGridDimensions.rows}, auto)`, // Dynamic rows
              }}
            >
              {/* Row 1: Top Utility Systems - Fixed */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="utility"
                      onClick={() => {
                        const smokeStatus = getUtilityStatus("smoke");
                        const fssStatus = getUtilityStatus("fss");
                        handleItemClick("utility", {
                          name: "Smoke/FSS",
                          type: "safety",
                          smokeStatus: smokeStatus.status,
                          fssStatus: fssStatus.status,
                          lastUpdate: smokeStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("smoke").status ||
                            getUtilityStatus("fss").status,
                          "fss"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">Smoke/FSS</span>
                          {getStatusBadge(
                            getUtilityStatus("smoke").status ||
                              getUtilityStatus("fss").status,
                            "fss"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Fire Safety System</p>
                      <p className="text-sm">
                        Smoke:{" "}
                        {getUtilityStatus("smoke").status
                          ? "DETECTED"
                          : "Clear"}
                      </p>
                      <p className="text-sm">
                        FSS:{" "}
                        {getUtilityStatus("fss").status ? "Active" : "Standby"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="door"
                      onClick={() => {
                        const doorStatus = getUtilityStatus("door_back");
                        handleItemClick("utility", {
                          name: "Automatic Sliding Back Door",
                          type: "access",
                          status: doorStatus.status,
                          description: doorStatus.description,
                          lastUpdate: doorStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("door_back").status,
                          "door_back"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">Back Door</span>
                          <span className="text-xs text-muted-foreground">
                            Auto Sliding
                          </span>
                          {getStatusBadge(
                            getUtilityStatus("door_back").status,
                            "door_back"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Back Access Door</p>
                      <p className="text-sm">
                        Status: {getUtilityStatus("door_back").description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="utility"
                      onClick={() => {
                        const tempStatus = getUtilityStatus("emergency_temp");
                        handleItemClick("utility", {
                          name: "EMG Temp",
                          type: "environmental",
                          status: tempStatus.status,
                          description: tempStatus.description,
                          lastUpdate: tempStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("emergency_temp").status,
                          "emergency_temp"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">EMG Temp</span>
                          {getStatusBadge(
                            getUtilityStatus("emergency_temp").status,
                            "emergency_temp"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Emergency Temperature</p>
                      <p className="text-sm">
                        Status: {getUtilityStatus("emergency_temp").description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Dynamic Rack Rows - Modified ordering: right=odd(1,3,5), left=even(2,4,6) */}
              {Array.from({ length: getGridDimensions.rackRows }).map(
                (_, rowIndex) => {
                  // New ordering: right side = odd numbers (1,3,5,7...), left side = even numbers (2,4,6,8...)
                  const rightRackIndex = rowIndex; // 0,1,2,3... -> maps to racks[0,1,2,3] (positions 1,2,3,4...)
                  const leftRackIndex = rowIndex + getGridDimensions.rackRows; // offset by total rows

                  // Get racks with new ordering
                  const rightRack = racks[rightRackIndex]; // Right side: 1st, 2nd, 3rd... rack
                  const leftRack = racks[leftRackIndex]; // Left side: continues after right side
                  const ceilingNumber = rowIndex + 1;

                  return (
                    <React.Fragment key={`rack-row-${rowIndex}`}>
                      {/* Left Column - Rack */}
                      {leftRack ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <GridItem
                                type="rack"
                                onClick={() =>
                                  handleItemClick("rack", leftRack)
                                }
                              >
                                <div className="flex flex-row items-center justify-center gap-3 w-full p-2">
                                  <div className="flex items-center gap-2">
                                    <Server className="h-6 w-6" />
                                    <div
                                      className={`h-2 w-2 rounded-full ${getDeviceStatusColor(
                                        leftRack.id
                                      )}`}
                                    ></div>
                                  </div>
                                  <div className="flex flex-col items-start gap-1 flex-1">
                                    <span className="font-medium text-sm">
                                      {leftRack.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {getDeviceCount(leftRack.id)} device
                                        {getDeviceCount(leftRack.id) !== 1
                                          ? "s"
                                          : ""}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        {leftRack.capacityU || 42}U
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </GridItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 max-w-xs">
                                <p className="font-medium">{leftRack.name}</p>
                                <div className="text-sm space-y-1">
                                  <p>
                                    • Devices: {getDeviceCount(leftRack.id)}
                                  </p>
                                  <p>• Capacity: {leftRack.capacityU || 42}U</p>
                                  <p>
                                    • Status:{" "}
                                    {leftRack.isActive ? "Active" : "Inactive"}
                                  </p>
                                  {getDeviceTypesSummary(leftRack.id).length >
                                    0 && (
                                    <p>
                                      • Types:{" "}
                                      {getDeviceTypesSummary(leftRack.id).join(
                                        ", "
                                      )}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground border-t pt-1">
                                  Click to view devices and details
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center min-h-[120px] bg-gray-50 dark:bg-gray-800">
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            Available Position
                          </span>
                        </div>
                      )}

                      {/* Middle Column - Ceiling */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <GridItem
                              type="ceiling"
                              onClick={() =>
                                handleItemClick("ceiling", {
                                  name:
                                    containment?.type === 1
                                      ? `Polycarbonate Partition ${ceilingNumber}`
                                      : `Ceiling ${ceilingNumber}`,
                                  zone: ceilingNumber,
                                  status: "operational",
                                  totalCeilings: getGridDimensions.rackRows,
                                  rackRow: rowIndex + 1,
                                  isPolycarbonate: containment?.type === 1,
                                })
                              }
                            >
                              <div className="flex flex-row items-center gap-2">
                                {containment?.type === 1 ? <Flame className="h-5 w-5" /> : <Wind className="h-5 w-5" />}
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-xs font-medium">
                                    {containment?.type === 1
                                      ? `POLYCARBONATE ${ceilingNumber}`
                                      : `CEILING ${ceilingNumber}`}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    {containment?.type === 1
                                      ? "Partition"
                                      : `Row ${rowIndex + 1}`}
                                  </div>
                                </div>
                              </div>
                            </GridItem>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">
                                {containment?.type === 1
                                  ? `Polycarbonate Partition ${ceilingNumber}`
                                  : `Ceiling Section ${ceilingNumber}`}
                              </p>
                              <p className="text-sm">
                                {containment?.type === 1
                                  ? `Physical barrier for hot aisle containment row ${
                                      rowIndex + 1
                                    }`
                                  : `Environmental control for rack row ${
                                      rowIndex + 1
                                    }`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {containment?.type === 1
                                  ? "Temperature isolation & airflow separation"
                                  : "Air circulation & monitoring"}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Right Column - Rack */}
                      {rightRack ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <GridItem
                                type="rack"
                                onClick={() =>
                                  handleItemClick("rack", rightRack)
                                }
                              >
                                <div className="flex flex-row items-center justify-center gap-3 w-full p-2">
                                  <div className="flex items-center gap-2">
                                    <Server className="h-6 w-6" />
                                    <div
                                      className={`h-2 w-2 rounded-full ${getDeviceStatusColor(
                                        rightRack.id
                                      )}`}
                                    ></div>
                                  </div>
                                  <div className="flex flex-col items-start gap-1 flex-1">
                                    <span className="font-medium text-sm">
                                      {rightRack.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {getDeviceCount(rightRack.id)} device
                                        {getDeviceCount(rightRack.id) !== 1
                                          ? "s"
                                          : ""}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        {rightRack.capacityU || 42}U
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </GridItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 max-w-xs">
                                <p className="font-medium">{rightRack.name}</p>
                                <div className="text-sm space-y-1">
                                  <p>
                                    • Devices: {getDeviceCount(rightRack.id)}
                                  </p>
                                  <p>
                                    • Capacity: {rightRack.capacityU || 42}U
                                  </p>
                                  <p>
                                    • Status:{" "}
                                    {rightRack.isActive ? "Active" : "Inactive"}
                                  </p>
                                  {getDeviceTypesSummary(rightRack.id).length >
                                    0 && (
                                    <p>
                                      • Types:{" "}
                                      {getDeviceTypesSummary(rightRack.id).join(
                                        ", "
                                      )}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground border-t pt-1">
                                  Click to view devices and details
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center min-h-[120px] bg-gray-50 dark:bg-gray-800">
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            Available Position
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }
              )}

              {/* Bottom Row: Bottom Utility Systems - Fixed */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="utility"
                      onClick={() => {
                        const emergencyStatus = getUtilityStatus("emergency");
                        handleItemClick("utility", {
                          name: "Emergency Status",
                          type: "safety",
                          status: emergencyStatus.status,
                          description: emergencyStatus.description,
                          lastUpdate: emergencyStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("emergency").status,
                          "emergency"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">Emergency</span>
                          <span className="text-xs text-muted-foreground">
                            Status
                          </span>
                          {getStatusBadge(
                            getUtilityStatus("emergency").status,
                            "emergency"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Emergency System</p>
                      <p className="text-sm">
                        Status: {getUtilityStatus("emergency").description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="door"
                      onClick={() => {
                        const doorStatus = getUtilityStatus("door_front");
                        handleItemClick("utility", {
                          name: "Automatic Sliding Front Door",
                          type: "access",
                          status: doorStatus.status,
                          description: doorStatus.description,
                          lastUpdate: doorStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("door_front").status,
                          "door_front"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">
                            Front Door
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Auto Sliding
                          </span>
                          {getStatusBadge(
                            getUtilityStatus("door_front").status,
                            "door_front"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Front Access Door</p>
                      <p className="text-sm">
                        Status: {getUtilityStatus("door_front").description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GridItem
                      type="utility"
                      onClick={() => {
                        const lightingStatus = getUtilityStatus("lighting");
                        handleItemClick("utility", {
                          name: "Lighting",
                          type: "environmental",
                          status: lightingStatus.status,
                          description: lightingStatus.description,
                          lastUpdate: lightingStatus.lastUpdate,
                        });
                      }}
                    >
                      <div className="flex flex-row items-center gap-2">
                        {getStatusIcon(
                          getUtilityStatus("lighting").status,
                          "lighting"
                        )}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium">Lighting</span>
                          {getStatusBadge(
                            getUtilityStatus("lighting").status,
                            "lighting"
                          )}
                        </div>
                      </div>
                    </GridItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">Lighting System</p>
                      <p className="text-sm">
                        Status: {getUtilityStatus("lighting").description}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="flex justify-center mt-8">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-800 rounded"></div>
                  <span>Server Racks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-400 rounded"></div>
                  <span>Ceiling Sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>Access Doors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 border rounded"></div>
                  <span>Utility Systems</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Status Summary */}
        <Card className="w-80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Status Summary
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {containmentStatus?.updatedAt
                  ? new Date(containmentStatus.updatedAt).toLocaleTimeString()
                  : "No data"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {containmentStatus ? (
              <>
                {/* Overall Status */}
                <div
                  className={`p-3 rounded-lg ${
                    containmentStatus.emergencyStatus
                      ? "bg-red-100 border border-red-300"
                      : "bg-green-100 border border-green-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {containmentStatus.emergencyStatus ? (
                      <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    <span className={`font-semibold text-sm ${containmentStatus.emergencyStatus?"text-red-600":"text-green-600"}`}>
                      {containmentStatus.emergencyStatus
                        ? "EMERGENCY ACTIVE"
                        : "SYSTEM NORMAL"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {containmentStatus.emergencyStatus
                      ? "Critical situation detected - immediate action required"
                      : "All systems operating within normal parameters"}
                  </p>
                </div>

                {/* Emergency Systems */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Emergency Systems
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(
                          containmentStatus.smokeDetectorStatus,
                          "smoke"
                        )}
                        <span className="text-sm">Smoke Detector</span>
                      </div>
                      {getStatusBadge(
                        containmentStatus.smokeDetectorStatus,
                        "smoke"
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(containmentStatus.fssStatus, "fss")}
                        <span className="text-sm">Fire Suppression</span>
                      </div>
                      {getStatusBadge(containmentStatus.fssStatus, "fss")}
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(
                          containmentStatus.emergencyTemp,
                          "emergency_temp"
                        )}
                        <span className="text-sm">Emergency Temp</span>
                      </div>
                      {getStatusBadge(
                        containmentStatus.emergencyTemp,
                        "emergency_temp"
                      )}
                    </div>
                  </div>
                </div>

                {/* Access Control */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Access Control
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(
                          containmentStatus.limitSwitchFrontDoorStatus,
                          "door_front"
                        )}
                        <span className="text-sm">Front Door</span>
                      </div>
                      {getStatusBadge(
                        containmentStatus.limitSwitchFrontDoorStatus,
                        "door_front"
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(
                          containmentStatus.limitSwitchBackDoorStatus,
                          "door_back"
                        )}
                        <span className="text-sm">Back Door</span>
                      </div>
                      {getStatusBadge(
                        containmentStatus.limitSwitchBackDoorStatus,
                        "door_back"
                      )}
                    </div>
                  </div>
                </div>

                {/* Environmental */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Environmental
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(
                          containmentStatus.lightingStatus,
                          "lighting"
                        )}
                        <span className="text-sm">Lighting</span>
                      </div>
                      {getStatusBadge(
                        containmentStatus.lightingStatus,
                        "lighting"
                      )}
                    </div>
                    {containment?.type === 2 && (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(
                            containmentStatus.selenoidStatus,
                            "default"
                          )}
                          <span className="text-sm">Ceiling Control</span>
                        </div>
                        {getStatusBadge(
                          containmentStatus.selenoidStatus,
                          "default"
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Status */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">MQTT Connection</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      Connected
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last update:{" "}
                    {containmentStatus.mqttTimestamp
                      ? new Date(
                          containmentStatus.mqttTimestamp
                        ).toLocaleString()
                      : "Never"}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No Status Data</p>
                <p className="text-sm">Waiting for MQTT data...</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={loadContainmentStatus}
                  disabled={statusLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      statusLoading ? "animate-spin" : ""
                    }`}
                  />
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.type === "rack" && <Server className="h-5 w-5" />}
              {selectedItem?.type === "ceiling" && (containment?.type === 1 ? <Flame className="h-5 w-5" /> : <Wind className="h-5 w-5" />)}
              {selectedItem?.type === "utility" && (
                <Settings className="h-5 w-5" />
              )}
              {selectedItem?.type === "rack"
                ? selectedItem.data.name
                : selectedItem?.data.name}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "rack" &&
                `Server rack details and configuration`}
              {selectedItem?.type === "ceiling" &&
                `Ceiling section environmental controls`}
              {selectedItem?.type === "utility" &&
                `Utility system monitoring and control`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {selectedItem?.type === "rack" && selectedItem.data && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Rack Name:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.name}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-sm">
                      <Badge
                        variant={
                          selectedItem.data.isActive ? "default" : "secondary"
                        }
                      >
                        {selectedItem.data.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.capacityU || 42}U
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Devices:</span>
                    <p className="text-sm">
                      <Badge variant="outline" className="ml-1">
                        {getDeviceCount(selectedItem.data.id)} devices
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Device Types:</span>
                    <p className="text-sm text-muted-foreground">
                      {getDeviceTypesSummary(selectedItem.data.id).join(", ") ||
                        "No devices"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.createdAt
                        ? new Date(
                            selectedItem.data.createdAt
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Device Status Summary */}
                {getDeviceCount(selectedItem.data.id) > 0 && (
                  <div className="mt-4">
                    <span className="font-medium">Device Status Summary:</span>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-sm font-medium text-green-700">
                          {
                            devices.filter(
                              (d) =>
                                d.rackId === selectedItem.data.id &&
                                d.status?.toLowerCase().includes("active")
                            ).length
                          }
                        </div>
                        <div className="text-xs text-green-600">Active</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <div className="text-sm font-medium text-yellow-700">
                          {
                            devices.filter(
                              (d) =>
                                d.rackId === selectedItem.data.id &&
                                d.status?.toLowerCase().includes("warning")
                            ).length
                          }
                        </div>
                        <div className="text-xs text-yellow-600">Warning</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-sm font-medium text-red-700">
                          {
                            devices.filter(
                              (d) =>
                                d.rackId === selectedItem.data.id &&
                                (d.status?.toLowerCase().includes("error") ||
                                  d.status?.toLowerCase().includes("offline"))
                            ).length
                          }
                        </div>
                        <div className="text-xs text-red-600">
                          Error/Offline
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItem.data.description && (
                  <div className="mt-4">
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.description}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      router.push(
                        `/management/devices/rack?rackId=${
                          selectedItem.data.id
                        }&rackName=${encodeURIComponent(
                          selectedItem.data.name
                        )}`
                      );
                      setSelectedItem(null);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Devices ({getDeviceCount(selectedItem.data.id)})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push(
                        `/management/racks?containmentId=${containmentId}&containmentName=${encodeURIComponent(
                          containmentName
                        )}`
                      );
                      setSelectedItem(null);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Rack
                  </Button>
                </div>
              </>
            )}

            {selectedItem?.type === "ceiling" && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">
                      {selectedItem.data.isPolycarbonate
                        ? "Partition Zone:"
                        : "Ceiling Zone:"}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Zone {selectedItem.data.zone} of{" "}
                      {selectedItem.data.totalCeilings ||
                        getGridDimensions.rackRows}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-sm">
                      <Badge variant="default">
                        {selectedItem.data.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Rack Row:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.isPolycarbonate
                        ? "Separates"
                        : "Controls"}{" "}
                      rack row{" "}
                      {selectedItem.data.rackRow || selectedItem.data.zone}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">
                      {selectedItem.data.isPolycarbonate
                        ? "Total Partitions:"
                        : "Total Ceiling Zones:"}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.totalCeilings ||
                        getGridDimensions.rackRows}{" "}
                      {selectedItem.data.isPolycarbonate
                        ? "partitions"
                        : "zones"}{" "}
                      total
                    </p>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Function:</span>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.data.isPolycarbonate
                      ? `Physical barrier providing temperature isolation for hot aisle containment row ${
                          selectedItem.data.rackRow || selectedItem.data.zone
                        }. This polycarbonate partition separates hot and cold air streams, preventing mixing and improving cooling efficiency in the hot aisle configuration.`
                      : `Environmental control and air circulation management for rack row ${
                          selectedItem.data.rackRow || selectedItem.data.zone
                        }. This ceiling section covers the middle column between rack positions, providing optimal airflow management for the adjacent server racks.`}
                  </p>
                </div>

                {/* Rack Information */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-sm text-gray-800">
                      Adjacent Racks
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>
                      • Controls airflow for up to 2 racks in row{" "}
                      {selectedItem.data.rackRow || selectedItem.data.zone}
                    </p>
                    <p>
                      • Position: Middle column between left and right rack
                      positions
                    </p>
                    <p>
                      • Layout: 3-column fixed layout (Rack - Ceiling - Rack)
                    </p>
                  </div>
                </div>

                {getGridDimensions.rackRows > 3 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      {containment?.type === 1 ? <Flame className="h-4 w-4 text-red-600" /> : <Wind className="h-4 w-4 text-blue-600" />}
                      <span className="font-medium text-sm text-blue-800">
                        Extended Layout
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      This containment uses an extended layout with{" "}
                      {getGridDimensions.rackRows} ceiling zones to accommodate{" "}
                      {racks.length} racks across {getGridDimensions.rackRows}{" "}
                      rows.
                    </p>
                  </div>
                )}

                {/* Layout Summary */}
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>Layout Summary:</strong>
                    </p>
                    <p>• Fixed 3 columns: Left Rack | Ceiling | Right Rack</p>
                    <p>
                      • Dynamic rows: {getGridDimensions.rows} total (2 utility
                      + {getGridDimensions.rackRows} rack rows)
                    </p>
                    <p>
                      • Capacity: Up to {getGridDimensions.rackRows * 2} racks
                      maximum
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedItem?.type === "utility" && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">System Type:</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.data.type}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-sm">
                      {selectedItem.data.name === "Smoke/FSS" ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Smoke:</span>
                            {getStatusBadge(
                              selectedItem.data.smokeStatus,
                              "smoke"
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">FSS:</span>
                            {getStatusBadge(selectedItem.data.fssStatus, "fss")}
                          </div>
                        </div>
                      ) : (
                        getStatusBadge(
                          selectedItem.data.status,
                          selectedItem.data.name
                            .toLowerCase()
                            .replace(/[^a-z]/g, "_")
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.data.description || (
                      <>
                        {selectedItem.data.name === "Smoke/FSS" &&
                          "Fire detection and suppression system monitoring containment safety."}
                        {selectedItem.data.name === "EMG Temp" &&
                          "Emergency temperature monitoring for environmental safety."}
                        {selectedItem.data.name === "Emergency Status" &&
                          "Emergency response and alert system monitoring."}
                        {selectedItem.data.name === "Lighting" &&
                          "Intelligent lighting system for the containment area."}
                        {selectedItem.data.name.includes("Door") &&
                          "Automated access control for containment entry/exit."}
                      </>
                    )}
                  </p>
                </div>
                {selectedItem.data.lastUpdate && (
                  <div>
                    <span className="font-medium">Last Update:</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedItem.data.lastUpdate).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
