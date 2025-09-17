"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Gamepad2,
  DoorOpen,
  DoorClosed,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Settings,
  Upload,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Activity,
  Shield,
  RefreshCw,
  User,
  Clock,
  Monitor,
  Split,
} from "lucide-react";
import { useMQTTPublish } from "@/hooks/useMQTTPublish";
import { useMQTTStatus } from "@/hooks/useMQTTStatus";
import { useMQTTConnection } from "@/hooks/useMQTTConnection";
import { MQTTTroubleshootingGuide } from "@/components/mqtt/mqtt-troubleshooting-guide";
import MQTTConnectionBadge from "@/components/mqtt-status";
import { toast } from "sonner";
import {
  accessLogService,
  AccessLog,
  AccessMethod,
  containmentStatusApi,
  containmentsApi,
  ContainmentStatus,
  Containment,
} from "@/lib/api-service";

interface ControlState {
  frontDoorAlwaysOpen: boolean;
  backDoorAlwaysOpen: boolean;
  ceilingState: boolean; // true = open (down), false = closed (up)
  partitionState: boolean; // true = extended/closed, false = retracted/open
}

interface ContainmentData {
  id: number;
  name: string;
  type: number;
  location?: string;
}

interface PublishHistory {
  id: string;
  timestamp: Date;
  command: string;
  topic: string;
  success: boolean;
}

export default function ContainmentControlPage() {
  const [containmentId, setContainmentId] = useState<number | null>(null);
  const [containmentData, setContainmentData] =
    useState<ContainmentData | null>(null);
  const [controlState, setControlState] = useState<ControlState>({
    frontDoorAlwaysOpen: false,
    backDoorAlwaysOpen: false,
    ceilingState: false,
    partitionState: false,
  });

  const [publishHistory, setPublishHistory] = useState<PublishHistory[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [containmentStatus, setContainmentStatus] =
    useState<ContainmentStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const { publishControlCommand } = useMQTTPublish();
  const mqttStatus = useMQTTStatus();
  const { isInitializing } = useMQTTConnection(); // Auto-initialize MQTT connection

  // Load access logs with software filter (AccessMethod.Software = 4)
  const loadAccessLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const response = await accessLogService.getAccessLogs({
        via: AccessMethod.Software, // Filter for software access only
        pageSize: 20, // Get last 20 entries
      });

      if (response.success && response.data) {
        setAccessLogs(Array.isArray(response.data) ? response.data : []);
      } else {
        console.error("Failed to load access logs:", response.message);
        setAccessLogs([]);
      }
    } catch (error) {
      console.error("Error loading access logs:", error);
      setAccessLogs([]);
      toast.error("Failed to load access logs");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Load containment data and access logs on component mount
  useEffect(() => {
    // Load containment ID from URL params, localStorage, or API
    const urlParams = new URLSearchParams(window.location.search);
    const containmentIdFromUrl = urlParams.get("containmentId");

    if (containmentIdFromUrl) {
      const id = parseInt(containmentIdFromUrl);
      setContainmentId(id);
      loadContainmentData(id);
    } else {
      // Try to get from localStorage or API
      const storedContainmentId = localStorage.getItem("selectedContainmentId");
      if (storedContainmentId) {
        const id = parseInt(storedContainmentId);
        setContainmentId(id);
        loadContainmentData(id);
      } else {
        // Default to 1 if not found
        setContainmentId(1);
        loadContainmentData(1);
      }
    }

    loadAccessLogs();

    // Refresh logs every 30 seconds
    const interval = setInterval(loadAccessLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load containment status from backend API
  const loadContainmentStatus = useCallback(async () => {
    if (!containmentId) return;

    try {
      const result = await containmentStatusApi.getLatestStatus(containmentId);
      if (result.success && result.data) {
        setContainmentStatus(result.data);
      }
    } catch (error) {
      console.error("Failed to load containment status:", error);
    }
  }, [containmentId]);

  // Load containment status on component mount and periodically
  useEffect(() => {
    if (containmentId) {
      loadContainmentStatus();

      // Refresh status every 10 seconds
      const interval = setInterval(loadContainmentStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [containmentId, mqttStatus]); // Remove loadContainmentStatus to prevent infinite loop

  const addToHistory = (command: string, success: boolean) => {
    const historyItem: PublishHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      command,
      topic: "IOT/Containment/Control",
      success,
    };

    setPublishHistory((prev) => [historyItem, ...prev.slice(0, 19)]); // Keep last 20 items
  };

  // Save access log for software control action
  const saveAccessLog = async (
    action: string,
    success: boolean,
    description?: string
  ) => {
    try {
      await accessLogService.createAccessLog({
        user: "System User", // TODO: Replace with actual logged-in user
        via: AccessMethod.Software,
        trigger: action,
        description: description || `Containment control action: ${action}`,
        isSuccess: success,
        additionalData: JSON.stringify({
          timestamp: new Date().toISOString(),
          topic: "IOT/Containment/Control",
          action: action,
        }),
      });

      // Refresh access logs after creating a new one
      loadAccessLogs();
    } catch (error) {
      console.error("Failed to save access log:", error);
    }
  };

  // Door control functions
  const handleOpenFrontDoor = async () => {
    setIsPublishing(true);
    const success = await publishControlCommand("Open front door");
    addToHistory("Open front door", success);
    await saveAccessLog(
      "Open front door",
      success,
      "Manual front door opening via software control"
    );
    setIsPublishing(false);
  };

  const handleOpenBackDoor = async () => {
    setIsPublishing(true);
    const success = await publishControlCommand("Open back door");
    addToHistory("Open back door", success);
    await saveAccessLog(
      "Open back door",
      success,
      "Manual back door opening via software control"
    );
    setIsPublishing(false);
  };

  // Always open door toggles
  const handleFrontDoorAlwaysToggle = async (enabled: boolean) => {
    setIsPublishing(true);
    const command = enabled
      ? "Open front door always enable"
      : "Open front door always disable";
    const success = await publishControlCommand(command);

    // Only update state if command was successful, or if disabling (keep true until disable succeeds)
    if (success || !enabled) {
      setControlState((prev) => ({ ...prev, frontDoorAlwaysOpen: enabled }));
    }

    addToHistory(command, success);
    await saveAccessLog(
      command,
      success,
      `Front door always open mode ${
        enabled ? "enabled" : "disabled"
      } via software control`
    );
    setIsPublishing(false);
  };

  const handleBackDoorAlwaysToggle = async (enabled: boolean) => {
    setIsPublishing(true);
    const command = enabled
      ? "Open back door always enable"
      : "Open back door always disable";
    const success = await publishControlCommand(command);

    // Only update state if command was successful, or if disabling (keep true until disable succeeds)
    if (success || !enabled) {
      setControlState((prev) => ({ ...prev, backDoorAlwaysOpen: enabled }));
    }

    addToHistory(command, success);
    await saveAccessLog(
      command,
      success,
      `Back door always open mode ${
        enabled ? "enabled" : "disabled"
      } via software control`
    );
    setIsPublishing(false);
  };

  // Ceiling control functions
  const handleCeilingControl = async (open: boolean) => {
    setIsPublishing(true);
    const command = open ? "Open Ceiiling" : "Close Ceiiling"; // Note: keeping original spelling from requirements
    const success = await publishControlCommand(command);

    if (success) {
      setControlState((prev) => ({ ...prev, ceilingState: open }));
    }

    addToHistory(command, success);
    await saveAccessLog(
      command,
      success,
      `Ceiling window ${open ? "opened" : "closed"} via software control`
    );
    setIsPublishing(false);
  };

  // Load containment data
  const loadContainmentData = async (id: number) => {
    try {
      setLoading(true);
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        const containment = result.data.find((c) => c.id === id);
        if (containment) {
          setContainmentData({
            id: containment.id,
            name: containment.name,
            type: containment.type,
            location: containment.location,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load containment data:", error);
      toast.error("Failed to load containment data");
    } finally {
      setLoading(false);
    }
  };

  // Manual Sliding Partition control (for type 1 - display only, not controllable)
  const shouldShowPartitionDisplay = () => {
    return containmentData?.type === 1;
  };

  // Check if ceiling controls should be shown (for type 2)
  const shouldShowCeilingControls = () => {
    return containmentData?.type === 2;
  };

  const isConnected = mqttStatus === "connected";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading containment data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Door Controls */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <span className="text-sm sm:text-base">Door Controls</span>
            </div>
            {containmentData && (
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                - {containmentData.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Manual Sliding Partition Display (Type 1 - Display Only) */}
          {shouldShowPartitionDisplay() && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                Manual Sliding Partition Window
              </h3>

              <div className="p-3 sm:p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Split className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-xs sm:text-sm">
                        Partition Status: Center Position
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        Manual operation only - not controllable via software
                      </div>
                    </div>
                  </div>
                  <div className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Manual Only
                    </span>
                  </div>
                </div>

                {/* Visual representation */}
                <div className="mt-3 sm:mt-4 flex items-center justify-center">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <div className="w-8 h-1 bg-border rounded"></div>
                    <Split className="h-4 w-4 text-blue-500" />
                    <div className="w-8 h-1 bg-border rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ceiling Control (Type 2) */}
          {shouldShowCeilingControls() && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                Ceiling Window Control
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Button
                  onClick={() => handleCeilingControl(true)}
                  disabled={
                    !isConnected || isPublishing || controlState.ceilingState
                  }
                  variant={controlState.ceilingState ? "default" : "outline"}
                  className="h-10 sm:h-12 flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Open Ceiling Window (Down)</span>
                  <span className="sm:hidden">Open Window (Down)</span>
                </Button>

                <Button
                  onClick={() => handleCeilingControl(false)}
                  disabled={
                    !isConnected || isPublishing || !controlState.ceilingState
                  }
                  variant={!controlState.ceilingState ? "default" : "outline"}
                  className="h-10 sm:h-12 flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Close Ceiling Window (Up)</span>
                  <span className="sm:hidden">Close Window (Up)</span>
                </Button>
              </div>

              {/* Current ceiling status */}
              <div className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-2 sm:gap-3">
                  {controlState.ceilingState ? (
                    <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  ) : (
                    <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  )}
                  <div>
                    <div className="font-medium text-xs sm:text-sm">
                      Ceiling Window Status:{" "}
                      {controlState.ceilingState
                        ? "Open (Down)"
                        : "Closed (Up)"}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Current ceiling window position
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Manual Door Open Buttons */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Manual Door Control
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button
                onClick={handleOpenFrontDoor}
                disabled={!isConnected || isPublishing}
                className="h-10 sm:h-12 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open Front Door</span>
                <span className="sm:hidden">Front Door</span>
              </Button>

              <Button
                onClick={handleOpenBackDoor}
                disabled={!isConnected || isPublishing}
                className="h-10 sm:h-12 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open Back Door</span>
                <span className="sm:hidden">Back Door</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Always Open Toggles */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Always Open Mode
            </h3>

            {/* Front Door Always Open */}
            <div className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {controlState.frontDoorAlwaysOpen ? (
                  <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <DoorClosed className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-xs sm:text-sm text-foreground cursor-pointer">
                    <span className="hidden sm:inline">Front Door Always Open</span>
                    <span className="sm:hidden">Front Always Open</span>
                  </Label>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Keep front door permanently open</span>
                    <span className="sm:hidden">Keep open</span>
                  </div>
                </div>
              </div>
              <Switch
                checked={controlState.frontDoorAlwaysOpen}
                onCheckedChange={handleFrontDoorAlwaysToggle}
                disabled={!isConnected || isPublishing}
                className="flex-shrink-0"
              />
            </div>

            {/* Back Door Always Open */}
            <div className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {controlState.backDoorAlwaysOpen ? (
                  <DoorOpen className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <DoorClosed className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <Label className="font-medium text-xs sm:text-sm text-foreground cursor-pointer">
                    <span className="hidden sm:inline">Back Door Always Open</span>
                    <span className="sm:hidden">Back Always Open</span>
                  </Label>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Keep back door permanently open</span>
                    <span className="sm:hidden">Keep open</span>
                  </div>
                </div>
              </div>
              <Switch
                checked={controlState.backDoorAlwaysOpen}
                onCheckedChange={handleBackDoorAlwaysToggle}
                disabled={!isConnected || isPublishing}
                className="flex-shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
