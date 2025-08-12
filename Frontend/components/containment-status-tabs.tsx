"use client";

import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Flame,
  Shield,
  Thermometer,
  DoorOpen,
  DoorClosed,
  Lightbulb,
  Building2,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  getContainmentTypeString,
  containmentStatusApi,
  containmentsApi,
  ContainmentStatus,
  Containment,
} from "@/lib/api-service";
import { toast } from "sonner";

interface ContainmentStatusTabsProps {
  className?: string;
}

// Define a type for the status types to improve type safety
type StatusType =
  | "emergency"
  | "lighting"
  | "smoke"
  | "fss"
  | "emergency_button"
  | "selenoid"
  | "door_front"
  | "door_back"
  | "emergency_temp"
  | "window_partition" // Tipe baru untuk Window Partition
  | "default";

function ContainmentStatusTabs({ className }: ContainmentStatusTabsProps) {
  const [containments, setContainments] = useState<Containment[]>([]);
  const [statuses, setStatuses] = useState<ContainmentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("0");

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && isPollingActive) {
        loadStatuses();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      setIsPollingActive(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPollingActive]); // Depend on isPollingActive to restart the effect

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadContainments(), loadStatuses()]);
    } catch (error) {
      toast.error("Failed to load containment data");
    } finally {
      setLoading(false);
    }
  };

  const loadContainments = useCallback(async () => {
    try {
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        setContainments(result.data);
        if (result.data.length > 0 && activeTab === "0") {
          setActiveTab(result.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Failed to load containments:", error);
    }
  }, [activeTab]);

  const loadStatuses = useCallback(async () => {
    if (!isPollingActive || loading) return;

    try {
      const result = await containmentStatusApi.getAllLatestStatuses();
      if (result.success && result.data) {
        setStatuses(result.data);
      }
    } catch (error) {
      console.error("Failed to load statuses:", error);
    }
  }, [isPollingActive, loading]);

  const getStatusForContainment = useCallback(
    (containmentId: number): ContainmentStatus | undefined => {
      return statuses.find((status) => status.containmentId === containmentId);
    },
    [statuses]
  );

  const statusMap = useMemo(() => {
    const map = new Map<number, ContainmentStatus>();
    statuses.forEach((status) => {
      map.set(status.containmentId, status);
    });
    return map;
  }, [statuses]);

  const getStatusIcon = useCallback((status: boolean, type: StatusType) => {
    const iconProps = { className: "h-4 w-4" };

    if (type === "emergency" && status) {
      return <AlertTriangle {...iconProps} className="h-4 w-4 text-red-500" />;
    }

    switch (type) {
      case "lighting":
        return status ? (
          <Lightbulb {...iconProps} className="h-4 w-4 text-yellow-500" />
        ) : (
          <Lightbulb {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      case "smoke":
        return status ? (
          <Flame {...iconProps} className="h-4 w-4 text-red-500" />
        ) : (
          <Flame {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      case "fss":
        return status ? (
          <Shield {...iconProps} className="h-4 w-4 text-blue-500" />
        ) : (
          <Shield {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      case "emergency_button":
        return status ? (
          <AlertTriangle {...iconProps} className="h-4 w-4 text-red-500" />
        ) : (
          <AlertTriangle {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      case "selenoid":
        return status ? (
          <Zap {...iconProps} className="h-4 w-4 text-green-500" />
        ) : (
          <Zap {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      // Logika baru untuk Window Partition
      case "window_partition":
        return <Zap {...iconProps} className="h-4 w-4 text-gray-400" />;
      case "door_front":
        return status ? (
          <DoorOpen {...iconProps} className="h-4 w-4 text-green-500" />
        ) : (
          <DoorClosed {...iconProps} className="h-4 w-4 text-gray-500" />
        );
      case "door_back":
        return status ? (
          <DoorOpen {...iconProps} className="h-4 w-4 text-green-500" />
        ) : (
          <DoorClosed {...iconProps} className="h-4 w-4 text-gray-500" />
        );
      case "emergency_temp":
        return status ? (
          <Thermometer {...iconProps} className="h-4 w-4 text-red-500" />
        ) : (
          <Thermometer {...iconProps} className="h-4 w-4 text-gray-400" />
        );
      default:
        return status ? (
          <CheckCircle2 {...iconProps} className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle {...iconProps} className="h-4 w-4 text-gray-400" />
        );
    }
  }, []);

  const getStatusBadge = useCallback((status: boolean, type: StatusType) => {
    // Handle emergency-related statuses (Smoke, Emergency Button, etc.)
    if (
      type === "emergency" ||
      type === "smoke" ||
      type === "emergency_button" ||
      type === "emergency_temp"
    ) {
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
    }

    // Handle door statuses
    if (type === "door_front" || type === "door_back") {
      return (
        <Badge
          variant={!status ? "destructive" : "default"}
          className={
            !status
              ? "bg-red-100 text-red-800 border-red-300"
              : "bg-green-100 text-green-800 border-green-300"
          }
        >
          {status ? "Closed" : "Open"}
        </Badge>
      );
    }

    // Handle lighting status - Active (yellow) and Inactive (green)
    if (type === "lighting") {
      return (
        <Badge
          variant="default"
          className={
            status
              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
              : "bg-green-100 text-green-800 border-green-300"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    // Handle FSS status - Active (blue) and Inactive (green)
    if (type === "fss") {
      return (
        <Badge
          variant="default"
          className={
            status
              ? "bg-blue-100 text-blue-800 border-blue-300"
              : "bg-green-100 text-green-800 border-green-300"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    // Handle selenoid status
    if (type === "selenoid") {
      return (
        <Badge
          variant={status ? "destructive" : "default"}
          className={
            status
              ? "bg-red-100 text-red-800 border-red-300"
              : "bg-green-100 text-green-800 border-green-300"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    // Handle window partition (tanpa status)
    if (type === "window_partition") {
      return (
        <Badge
          variant="default"
          className="bg-gray-100 text-gray-800 border-gray-300"
        >
          Normal
        </Badge>
      );
    }

    // Default case for other statuses
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
  }, []);

  interface StatusCardProps {
    title: string;
    status?: boolean; // status menjadi opsional
    type: StatusType;
    description?: string;
  }

  const StatusCard = ({
    title,
    status,
    type,
    description,
  }: StatusCardProps) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        {getStatusIcon(status === undefined ? false : status, type)}
        <div>
          <div className="font-medium text-sm">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getStatusBadge(status === undefined ? false : status, type)}
      </div>
    </div>
  );

  if (containments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Containment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No containments found</p>
            <p className="text-sm">Add containments to view their status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeContainment = containments.find(
    (c) => c.id.toString() === activeTab
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Containment Status
          </CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={loadStatuses}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${containments.length}, 1fr)`,
            }}
          >
            {containments.map((containment) => (
              <TabsTrigger
                key={containment.id}
                value={containment.id.toString()}
              >
                {containment.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {containments.map((containment) => {
            const status = getStatusForContainment(containment.id);

            return (
              <TabsContent
                key={containment.id}
                value={containment.id.toString()}
                className="mt-2"
              >
                <div className="space-y-4">
                  {/* Containment Info */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{containment.name}</h3>

                      <p className="text-sm text-muted-foreground">
                        {containment.location}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {containment.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {status?.mqttTimestamp
                          ? new Date(status.mqttTimestamp).toLocaleString()
                          : "No data"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last Update:{" "}
                        {status?.updatedAt
                          ? new Date(status.updatedAt).toLocaleString()
                          : "Never"}
                      </div>
                    </div>
                  </div>

                  {status ? (
                    <>
                      {/* Separate UI for Emergency Status - Refined Size */}
                      <Card
                        className={`relative flex items-center gap-3 p-3 ${
                          status.emergencyStatus
                            ? "bg-red-600 text-white"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        {status.emergencyStatus ? (
                          <AlertTriangle className="h-6 w-6 animate-pulse flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                        )}
                        <div className="flex-grow">
                          <h3 className="text-base font-semibold">
                            Overall Emergency Status
                          </h3>
                          <p className="text-sm font-medium">
                            {status.emergencyStatus
                              ? "ALERT! Critical Situation Detected"
                              : "Normal Operation"}
                          </p>
                        </div>
                        {status.emergencyStatus && (
                          <div className="flex-shrink-0 ml-auto">
                            <Badge
                              variant="secondary"
                              className="bg-white text-red-600 font-bold"
                            >
                              ACTION REQUIRED
                            </Badge>
                          </div>
                        )}
                      </Card>

                      {/* Remaining Status Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Emergency Systems (excluding overall emergencyStatus) */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                            Emergency Systems
                          </h4>
                          <StatusCard
                            title="Smoke Detector"
                            status={status.smokeDetectorStatus}
                            type="smoke"
                            description="Fire detection system"
                          />
                          <StatusCard
                            title="Fire Suppression (FSS)"
                            status={status.fssStatus}
                            type="fss"
                            description="Fire suppression system"
                          />
                          <StatusCard
                            title="Emergency Button"
                            status={status.emergencyButtonState}
                            type="emergency_button"
                            description="Manual emergency trigger"
                          />
                          <StatusCard
                            title="Emergency Temperature"
                            status={status.emergencyTemp}
                            type="emergency_temp"
                            description="Temperature alert system"
                          />
                        </div>

                        {/* Control Systems */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                            Control Systems
                          </h4>
                          <StatusCard
                            title="Lighting System"
                            status={status.lightingStatus}
                            type="lighting"
                            description="Containment lighting"
                          />
                          {/* Logika baru untuk Window Ceiling / Window Partition */}
                          {containment.type === 1 ? (
                            <StatusCard
                              title="Window Partition"
                              type="window_partition"
                              description="Static partition"
                            />
                          ) : (
                            <StatusCard
                              title="Window Ceiling"
                              status={status.selenoidStatus}
                              type="selenoid"
                              description="Ceiling control system"
                            />
                          )}
                          <StatusCard
                            title="Front Door"
                            status={status.limitSwitchFrontDoorStatus}
                            type="door_front"
                            description={`Limit switch: ${
                              status.limitSwitchFrontDoorStatus
                                ? "Active"
                                : "Inactive"
                            }`}
                          />
                          <StatusCard
                            title="Back Door"
                            status={status.limitSwitchBackDoorStatus}
                            type="door_back"
                            description={`Limit switch: ${
                              status.limitSwitchBackDoorStatus
                                ? "Active"
                                : "Inactive"
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No status data available for this containment</p>
                      <p className="text-sm">Waiting for MQTT data...</p>
                    </div>
                  )}

                  {/* Raw Data (for debugging) */}
                  {status?.rawPayload && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View Raw Payload JSON Data
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-md font-mono text-xs overflow-x-auto">
                        {status.rawPayload}
                      </div>
                    </details>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Export with React.memo for performance optimization
export default memo(ContainmentStatusTabs);
