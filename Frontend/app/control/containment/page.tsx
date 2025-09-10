"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  DoorOpen,
  DoorClosed,
  ArrowUp,
  ArrowDown,
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
  }, [containmentId, mqttStatus, loadContainmentStatus]); // Re-run when containment ID, MQTT status, or load function changes

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
      `Ceiling ${open ? "opened" : "closed"} via software control`
    );
    setIsPublishing(false);
  };

  // Check if advanced controls should be shown
  const shouldShowAdvancedControls = () => {
    return containmentId === 1 && containmentData?.type === 1;
  };

  const isConnected = mqttStatus === "connected";

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Containment Control</h1>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading containment data...</span>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Containment Control</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <MQTTConnectionBadge />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">
          Control containment doors and ceiling via MQTT commands
        </p>

        {/* Connection Status Alert */}
        {isInitializing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">
                  Initializing MQTT connection...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!isInitializing && !isConnected && (
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      MQTT connection required to send control commands.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  >
                    {showTroubleshooting ? "Hide" : "Show"} Troubleshooting
                  </Button>
                </div>
              </CardContent>
            </Card>

            <MQTTTroubleshootingGuide
              isVisible={showTroubleshooting}
              connectionError={
                mqttStatus === "error"
                  ? "WebSocket connection failed"
                  : undefined
              }
              onClose={() => setShowTroubleshooting(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Door Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Door Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manual Door Open Buttons */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Manual Door Control
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleOpenFrontDoor}
                    disabled={!isConnected || isPublishing}
                    className="h-12 flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Open Front Door
                  </Button>

                  <Button
                    onClick={handleOpenBackDoor}
                    disabled={!isConnected || isPublishing}
                    className="h-12 flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Open Back Door
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Always Open Toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Always Open Mode
                </h3>

                {/* Front Door Always Open */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {controlState.frontDoorAlwaysOpen ? (
                      <DoorOpen className="h-4 w-4 text-green-500" />
                    ) : (
                      <DoorClosed className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <Label className="font-medium">
                        Front Door Always Open
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Keep front door permanently open
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={controlState.frontDoorAlwaysOpen}
                    onCheckedChange={handleFrontDoorAlwaysToggle}
                    disabled={!isConnected || isPublishing}
                  />
                </div>

                {/* Back Door Always Open */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {controlState.backDoorAlwaysOpen ? (
                      <DoorOpen className="h-4 w-4 text-green-500" />
                    ) : (
                      <DoorClosed className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <Label className="font-medium">
                        Back Door Always Open
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Keep back door permanently open
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={controlState.backDoorAlwaysOpen}
                    onCheckedChange={handleBackDoorAlwaysToggle}
                    disabled={!isConnected || isPublishing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ceiling and System Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {shouldShowAdvancedControls()
                  ? "Advanced System Controls"
                  : "System Controls"}
                {containmentData && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {containmentData.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ceiling Control - Show only for containmentId === 1 AND type === 1 */}
              {shouldShowAdvancedControls() && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Ceiling Control
                    </h3>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {controlState.ceilingState ? (
                          <ArrowDown className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <Label className="font-medium">
                            Ceiling Position
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            Current:{" "}
                            {controlState.ceilingState
                              ? "Open (Down)"
                              : "Closed (Up)"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            controlState.ceilingState ? "default" : "outline"
                          }
                          onClick={() => handleCeilingControl(true)}
                          disabled={!isConnected || isPublishing}
                        >
                          <ArrowDown className="h-3 w-3 mr-1" />
                          Open (Down)
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            !controlState.ceilingState ? "default" : "outline"
                          }
                          onClick={() => handleCeilingControl(false)}
                          disabled={!isConnected || isPublishing}
                        >
                          <ArrowUp className="h-3 w-3 mr-1" />
                          Close (Up)
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Containment Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Containment Status
                </h3>
                {containmentStatus && (
                  <>
                    {/* Emergency Status - Most Important */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {containmentStatus.emergencyStatus ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <Label className="font-medium">
                            Emergency Status
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            System{" "}
                            {containmentStatus.emergencyStatus
                              ? "in emergency"
                              : "operating normally"}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          containmentStatus.emergencyStatus
                            ? "destructive"
                            : "default"
                        }
                        className={
                          containmentStatus.emergencyStatus
                            ? "animate-pulse"
                            : ""
                        }
                      >
                        {containmentStatus.emergencyStatus
                          ? "EMERGENCY"
                          : "Normal"}
                      </Badge>
                    </div>
                  </>
                )}
                {/* Status Grid */}
                {containmentStatus ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Front Door Limit Switch */}
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Front Door</span>
                      </div>
                      <Badge
                        variant={
                          containmentStatus.limitSwitchFrontDoorStatus
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {containmentStatus.limitSwitchFrontDoorStatus
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>

                    {/* Back Door Limit Switch */}
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Back Door</span>
                      </div>
                      <Badge
                        variant={
                          containmentStatus.limitSwitchBackDoorStatus
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {containmentStatus.limitSwitchBackDoorStatus
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>

                    {/* Lighting Status */}
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Lighting</span>
                      </div>
                      <Badge
                        variant={
                          containmentStatus.lightingStatus
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {containmentStatus.lightingStatus
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>

                    {/* Fire Suppression System */}
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          Fire Suppression
                        </span>
                      </div>
                      <Badge
                        variant={
                          containmentStatus.fssStatus ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {containmentStatus.fssStatus ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Loading status data...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Software Access Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Software Access Logs
                <Badge variant="outline" className="ml-2">
                  {accessLogs.length}
                </Badge>
              </CardTitle>
              <Button
                onClick={loadAccessLogs}
                variant="outline"
                size="sm"
                disabled={isLoadingLogs}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    isLoadingLogs ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accessLogs.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {log.isSuccess ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {log.user}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-3 w-3" />
                            <span>{log.trigger}</span>
                          </div>
                          {log.description && (
                            <div className="mt-1">{log.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={log.isSuccess ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {log.isSuccess ? "Success" : "Failed"}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading access logs...
                  </div>
                ) : (
                  <>
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No software access logs found</p>
                    <p className="text-sm">
                      Software access activities will appear here
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MQTT Topic Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              MQTT Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 space-y-2">
              <div className="flex items-center gap-2">
                <strong>Topic:</strong>
                <code className="bg-blue-100 px-2 py-1 rounded text-sm">
                  IOT/Containment/Control
                </code>
              </div>
              <div className="text-sm">
                <strong>Payload Format:</strong>
                <code className="bg-blue-100 px-2 py-1 rounded text-sm ml-1">
                  {'{ "data": "command" }'}
                </code>
              </div>
              <div className="text-sm">
                All control commands are published to the same topic with
                different data values.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
