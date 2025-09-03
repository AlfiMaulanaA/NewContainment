"use client";

import React, { useState, useEffect } from "react";
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
import { accessLogService, AccessLog, AccessMethod } from "@/lib/api-service";

interface ControlState {
  frontDoorAlwaysOpen: boolean;
  backDoorAlwaysOpen: boolean;
  ceilingState: boolean; // true = open (down), false = closed (up)
}

interface ContainmentStatus {
  frontDoorLimitSwitch: boolean;
  backDoorLimitSwitch: boolean;
  lighting: boolean;
  emergency: boolean;
  isOnline: boolean;
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
  const [containmentStatus, setContainmentStatus] = useState<ContainmentStatus>(
    {
      frontDoorLimitSwitch: false,
      backDoorLimitSwitch: false,
      lighting: false,
      emergency: false,
      isOnline: false,
    }
  );

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
      setContainmentId(parseInt(containmentIdFromUrl));
    } else {
      // Try to get from localStorage or API
      const storedContainmentId = localStorage.getItem("selectedContainmentId");
      if (storedContainmentId) {
        setContainmentId(parseInt(storedContainmentId));
      } else {
        // Default to 1 if not found
        setContainmentId(1);
      }
    }

    loadAccessLogs();

    // Refresh logs every 30 seconds
    const interval = setInterval(loadAccessLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load containment status on component mount and periodically
  useEffect(() => {
    loadContainmentStatus();

    // Refresh status every 10 seconds
    const interval = setInterval(loadContainmentStatus, 10000);
    return () => clearInterval(interval);
  }, [mqttStatus]); // Re-run when MQTT status changes

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

  // Load containment status (mock function - replace with actual API call)
  const loadContainmentStatus = async () => {
    try {
      // TODO: Replace with actual API call to get containment status
      // const response = await containmentApi.getStatus();
      // setContainmentStatus(response.data);

      // Mock data for now
      setContainmentStatus({
        frontDoorLimitSwitch: Math.random() > 0.5,
        backDoorLimitSwitch: Math.random() > 0.5,
        lighting: Math.random() > 0.5,
        emergency: Math.random() > 0.8, // Less likely to be in emergency
        isOnline: mqttStatus === "connected",
      });
    } catch (error) {
      console.error("Failed to load containment status:", error);
    }
  };

  const isConnected = mqttStatus === "connected";

  return (
    <div>
      <div>
        {/* Door Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-green-500" />
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
                    <Label className="font-medium">Back Door Always Open</Label>
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
      </div>
    </div>
  );
}
