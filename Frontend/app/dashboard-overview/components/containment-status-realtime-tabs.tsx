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
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getContainmentTypeString,
  containmentsApi,
  Containment,
} from "@/lib/api-service";
import { mqttClient } from "@/lib/mqtt";
import { toast } from "sonner";

interface ContainmentStatusRealtimeTabsProps {
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
  | "window_partition"
  | "default";

// Real-time status data structure matching MQTT payload
interface RealtimeStatusData {
  "Lighting status": boolean;
  "Emergency status": boolean;
  "Smoke Detector status": boolean;
  "FSS status": boolean;
  "Emergency Button State": boolean;
  "selenoid status": boolean;
  "limit switch front door status": boolean;
  "limit switch back door status": boolean;
  "open front door status": boolean;
  "open back door status": boolean;
  "Emergency temp": boolean;
  Timestamp: string;
}

function ContainmentStatusRealtimeTabs({ className }: ContainmentStatusRealtimeTabsProps) {
  const [containments, setContainments] = useState<Containment[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("0");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // MQTT topic for real-time status
  const STATUS_TOPIC = "IOT/Containment/Status";

  useEffect(() => {
    loadContainments();

    // Setup MQTT connection
    const connectionListener = (connected: boolean) => {
      setMqttConnected(connected);
    };

    mqttClient.addConnectionListener(connectionListener);
    mqttClient.connect();

    return () => {
      mqttClient.removeConnectionListener(connectionListener);
    };
  }, []);

  useEffect(() => {
    if (!mqttConnected) return;

    // Subscribe to real-time status topic
    const callback = (topic: string, message: string) => {
      if (topic === STATUS_TOPIC) {
        try {
          const statusData: RealtimeStatusData = JSON.parse(message);
          setRealtimeStatus(statusData);
          setLastUpdate(new Date());

          // Show toast for emergency status changes
          if (statusData["Emergency status"]) {
            toast.error("Emergency Status Active!", {
              description: "Containment emergency condition detected",
            });
          }
        } catch (error) {
          console.error("Failed to parse MQTT status data:", error);
        }
      }
    };

    mqttClient.subscribe(STATUS_TOPIC, callback);

    return () => {
      if (mqttClient.unsubscribe) {
        try {
          mqttClient.unsubscribe(STATUS_TOPIC, callback);
        } catch (error) {
          console.error("Failed to unsubscribe from MQTT topic:", error);
        }
      }
    };
  }, [mqttConnected]);

  const loadContainments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        setContainments(prevContainments => {
          // Only set active tab if it's still "0" and we have data
          if (result.data!.length > 0) {
            setActiveTab(prevTab => prevTab === "0" ? result.data![0].id.toString() : prevTab);
          }
          return result.data!;
        });
      }
    } catch (error) {
      console.error("Failed to load containments:", error);
      toast.error("Failed to load containment data");
    } finally {
      setLoading(false);
    }
  }, []);

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
            !status ? "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20" : ""
          }
        >
          {status ? "ALERT" : "Normal"}
        </Badge>
      );
    }

    if (type === "door_front" || type === "door_back") {
      return (
        <Badge
          variant={!status ? "destructive" : "default"}
          className={
            !status
              ? "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300 border-red-500/20"
              : "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20"
          }
        >
          {status ? "Closed" : "Open"}
        </Badge>
      );
    }

    if (type === "lighting") {
      return (
        <Badge
          variant="default"
          className={
            status
              ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-300 border-yellow-500/20"
              : "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    if (type === "fss") {
      return (
        <Badge
          variant="default"
          className={
            status
              ? "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300 border-blue-500/20"
              : "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    if (type === "selenoid") {
      return (
        <Badge
          variant={status ? "destructive" : "default"}
          className={
            status
              ? "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300 border-red-500/20"
              : "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20"
          }
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    }

    if (type === "window_partition") {
      return (
        <Badge
          variant="default"
          className="bg-muted text-muted-foreground border-border"
        >
          Normal
        </Badge>
      );
    }

    return (
      <Badge
        variant="default"
        className={
          status
            ? "bg-green-500/10 text-green-700 dark:bg-green-400/10 dark:text-green-300 border-green-500/20"
            : "bg-muted text-muted-foreground border-border"
        }
      >
        {status ? "Active" : "Inactive"}
      </Badge>
    );
  }, []);

  interface StatusCardProps {
    title: string;
    status?: boolean;
    type: StatusType;
    description?: string;
  }

  const StatusCard = ({
    title,
    status,
    type,
    description,
  }: StatusCardProps) => (
    <div className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {getStatusIcon(status === undefined ? false : status, type)}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-xs sm:text-sm text-foreground truncate">{title}</div>
          {description && (
            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {getStatusBadge(status === undefined ? false : status, type)}
      </div>
    </div>
  );

  if (containments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-500" />
            Containment Status (Real-time)
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-500" />
            Containment Status (Real-time)
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge
              variant={mqttConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {mqttConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadContainments}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Reload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: containments.length <= 2
                ? `repeat(${containments.length}, 1fr)`
                : containments.length <= 4
                ? `repeat(${Math.min(containments.length, 2)}, 1fr)`
                : `repeat(2, 1fr)`,
            }}
          >
            {containments.slice(0, containments.length <= 4 ? containments.length : 2).map((containment) => (
              <TabsTrigger
                key={containment.id}
                value={containment.id.toString()}
                className="text-xs sm:text-sm truncate"
              >
                <span className="hidden sm:inline">{containment.name}</span>
                <span className="sm:hidden">{containment.name.substring(0, 8)}{containment.name.length > 8 ? '...' : ''}</span>
              </TabsTrigger>
            ))}
            {containments.length > 4 && (
              <TabsTrigger
                value="more"
                className="text-xs sm:text-sm"
              >
                +{containments.length - 2} More
              </TabsTrigger>
            )}
          </TabsList>

          {containments.map((containment) => (
            <TabsContent
              key={containment.id}
              value={containment.id.toString()}
              className="mt-2 sm:mt-4"
            >
              <div className="space-y-3 sm:space-y-4">
                {realtimeStatus ? (
                  <>
                    <Card
                      className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 ${
                        realtimeStatus["Emergency status"]
                          ? "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-green-600 dark:bg-green-700 text-white border-green-600 dark:border-green-700"
                      }`}
                    >
                      {realtimeStatus["Emergency status"] ? (
                        <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                      )}
                      <div className="flex-grow min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold truncate">
                          Overall Emergency Status
                        </h3>
                        <p className="text-sm font-medium">
                          {realtimeStatus["Emergency status"]
                            ? "ALERT! Critical Situation Detected"
                            : "Normal Operation"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 opacity-80" />
                          <span className="text-xs opacity-80">
                            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
                          </span>
                        </div>
                      </div>
                      {realtimeStatus["Emergency status"] && (
                        <div className="flex-shrink-0 ml-auto">
                          <Badge
                            variant="secondary"
                            className="bg-white text-red-600 font-bold text-xs sm:text-sm px-1 sm:px-2"
                          >
                            <span className="hidden sm:inline">ACTION REQUIRED</span>
                            <span className="sm:hidden">ACTION</span>
                          </Badge>
                        </div>
                      )}
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="font-medium text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                          Emergency Systems
                        </h4>
                        <StatusCard
                          title="Smoke Detector"
                          status={realtimeStatus["Smoke Detector status"]}
                          type="smoke"
                          description="Fire detection system"
                        />
                        <StatusCard
                          title="Fire Suppression (FSS)"
                          status={realtimeStatus["FSS status"]}
                          type="fss"
                          description="Fire suppression system"
                        />
                        <StatusCard
                          title="Emergency Button"
                          status={realtimeStatus["Emergency Button State"]}
                          type="emergency_button"
                          description="Manual emergency trigger"
                        />
                        <StatusCard
                          title="Emergency Temperature"
                          status={realtimeStatus["Emergency temp"]}
                          type="emergency_temp"
                          description="Temperature alert system"
                        />
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="font-medium text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                          Control Systems
                        </h4>
                        <StatusCard
                          title="Lighting System"
                          status={realtimeStatus["Lighting status"]}
                          type="lighting"
                          description="Containment lighting"
                        />
                        {containment.type === 1 ? (
                          <StatusCard
                            title="Window Partition"
                            type="window_partition"
                            description="Static partition"
                          />
                        ) : (
                          <StatusCard
                            title="Window Ceiling"
                            status={realtimeStatus["selenoid status"]}
                            type="selenoid"
                            description="Ceiling control system"
                          />
                        )}
                        <StatusCard
                          title="Front Door"
                          status={realtimeStatus["limit switch front door status"]}
                          type="door_front"
                          description={`Limit switch: ${
                            realtimeStatus["limit switch front door status"]
                              ? "Active"
                              : "Inactive"
                          }`}
                        />
                        <StatusCard
                          title="Back Door"
                          status={realtimeStatus["limit switch back door status"]}
                          type="door_back"
                          description={`Limit switch: ${
                            realtimeStatus["limit switch back door status"]
                              ? "Active"
                              : "Inactive"
                          }`}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">Waiting for real-time status data...</p>
                    <p className="text-xs sm:text-sm">
                      MQTT connection: {mqttConnected ? "✅ Connected" : "❌ Disconnected"}
                    </p>
                    <p className="text-xs sm:text-sm mt-1">
                      Topic: <code className="bg-muted px-1 py-0.5 rounded text-xs">{STATUS_TOPIC}</code>
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Export with React.memo for performance optimization
export default memo(ContainmentStatusRealtimeTabs);
