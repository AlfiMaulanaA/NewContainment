"use client";

import { useState, useEffect, useCallback } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import MqttStatus from "@/components/mqtt-status";
import { AccessMethod } from "@/lib/api-service";
import {
  Loader2,
  Users,
  Wifi,
  Clock4,
  CheckCircle,
  XCircle,
  User,
  HardDrive,
  Fingerprint,
  Smile,
  CreditCard,
  Lock,
  RotateCw,
  Monitor,
  Settings,
  Hand,
  RefreshCw,
  Shield,
  Activity,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  Search,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Interfaces
interface User {
  uid: number;
  name: string;
  privilege: number;
  user_id: string;
  devices: string[];
}

interface DeviceStatus {
  device_id: string;
  device_name: string;
  status: "online" | "offline";
  response_time_ms?: number;
  error?: string;
}

interface AttendanceRecord {
  status: "success" | "error";
  data: {
    timestamp: string;
    name: string;
    uid: number;
    device_name: string;
    deviceId: string;
    via: AccessMethod;
    access_action: string;
    message: string;
  };
}

interface SyncStatus {
  auto_sync_enabled: boolean;
  sync_interval_hours: number;
  last_sync_time: string | null;
  total_syncs_performed: number;
  failed_devices_count: number;
  failed_devices: string[];
  device_health_status: Record<string, {
    status: string;
    last_check: string;
    consecutive_failures: number;
    last_error?: string;
  }>;
  recent_sync_history: Array<{
    type: 'manual' | 'scheduled';
    start_time: string;
    end_time: string;
    devices_count: number;
    result: {
      status: string;
      devices_synced: number;
    };
  }>;
}

interface DeviceDiscovery {
  total_devices: number;
  accessible_devices: Array<{
    device_id: string;
    name: string;
    ip: string;
    users_count: number;
    templates_count: number;
    status: string;
    serial_number: string;
    firmware_version: string;
    last_check: string;
  }>;
  failed_devices: Array<{
    device_id: string;
    name: string;
    ip: string;
    status: string;
    error: string;
    last_check: string;
  }>;
  discovery_duration: number;
  timestamp: string;
}

// --- Helper Functions
const getPrivilegeLabel = (privilege: number) => {
  switch (privilege) {
    case 0:
      return "User";
    case 1:
      return "Admin";
    case 2:
      return "Super Admin";
    default:
      return "Unknown";
  }
};

const getAccessMethodIcon = (via: AccessMethod) => {
  switch (via) {
    case AccessMethod.Fingerprint:
      return <Fingerprint className="h-4 w-4" />;
    case AccessMethod.Face:
      return <Smile className="h-4 w-4" />;
    case AccessMethod.Card:
      return <CreditCard className="h-4 w-4" />;
    case AccessMethod.Password:
      return <Lock className="h-4 w-4" />;
    case AccessMethod.BMS:
      return <Settings className="h-4 w-4" />;
    case AccessMethod.Software:
      return <Monitor className="h-4 w-4" />;
    case AccessMethod.Palm:
      return <Hand className="h-4 w-4" />;
    default:
      return <Lock className="h-4 w-4" />;
  }
};

const getAccessMethodName = (via: AccessMethod) => {
  switch (via) {
    case AccessMethod.Fingerprint:
      return "Fingerprint";
    case AccessMethod.Face:
      return "Face Recognition";
    case AccessMethod.Card:
      return "Card";
    case AccessMethod.Password:
      return "Password";
    case AccessMethod.BMS:
      return "BMS System";
    case AccessMethod.Software:
      return "Software";
    case AccessMethod.Palm:
      return "Palm Recognition";
    default:
      return "Unknown";
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// --- Main Dashboard Component
export default function UnifiedDashboard() {
  const router = useRouter();
  const { isConnected, isConnecting, publish, subscribe, unsubscribe } =
    useMQTT();

  const [users, setUsers] = useState<User[]>([]);
  const [isUsersRefreshing, setIsUsersRefreshing] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [deviceSummary, setDeviceSummary] = useState({
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    success_rate: 0,
  });
  const [isDevicesRefreshing, setIsDevicesRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isAttendanceRefreshing, setIsAttendanceRefreshing] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Synchronization states
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncStatusRefreshing, setIsSyncStatusRefreshing] = useState(false);
  const [deviceDiscovery, setDeviceDiscovery] = useState<DeviceDiscovery | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStartingAutoSync, setIsStartingAutoSync] = useState(false);
  const [isStoppingAutoSync, setIsStoppingAutoSync] = useState(false);
  const [isResettingDevices, setIsResettingDevices] = useState(false);
  const [syncInterval, setSyncInterval] = useState(1);

  const handleFetchUsers = useCallback(async () => {
    if (!isConnected) return;
    setIsUsersRefreshing(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "getData" })
    );
  }, [isConnected, publish]);

  const handleUserResponse = useCallback((topic: string, message: string) => {
    try {
      const payload = JSON.parse(message);
      if (payload.status === "success" && payload.data?.unique_users) {
        setUsers(payload.data.unique_users);
      }
    } catch (e) {
      console.error("Failed to parse user MQTT message:", e);
    } finally {
      setIsUsersRefreshing(false);
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!isConnected) return;
    setIsDevicesRefreshing(true);
    const command = { command: "testConnection", data: { device_id: "all" } };
    await publish("accessControl/device/command", JSON.stringify(command));
  }, [isConnected, publish]);

  const handleDeviceResponse = useCallback((topic: string, message: string) => {
    try {
      const payload = JSON.parse(message);
      if (payload.status === "success" && payload.data?.devices) {
        setDeviceStatuses(payload.data.devices);
        setDeviceSummary(payload.data.summary);
      }
    } catch (e) {
      console.error("Failed to parse device MQTT message:", e);
    } finally {
      setIsDevicesRefreshing(false);
    }
  }, []);

  const handleFetchAttendance = useCallback(async () => {
    setIsAttendanceRefreshing(true);
    setAttendanceError(null);
    try {
      // Import accessLogService di bagian atas file jika belum ada
      const { accessLogService } = await import("@/lib/api-service");
      const result = await accessLogService.getAccessLogs({
        page: 1,
        pageSize: 50,
      });

      if (result.success && result.data) {
        // Convert to expected format for AttendanceRecord
        const attendanceRecords = result.data.map((log) => ({
          status: log.isSuccess ? "success" : ("error" as "success" | "error"),
          data: {
            timestamp: log.timestamp,
            name: log.user,
            uid: 0, // Default value since not available in AccessLog
            device_name: log.additionalData
              ? JSON.parse(log.additionalData).device_name || "Unknown Device"
              : "Unknown Device",
            deviceId: log.additionalData
              ? JSON.parse(log.additionalData).deviceId || "unknown"
              : "unknown",
            via: log.via,
            access_action: log.trigger,
            message: log.description || log.trigger,
          },
        }));
        setAttendanceRecords(attendanceRecords);
      } else {
        throw new Error(result.message || "Failed to fetch access logs");
      }
    } catch (err) {
      setAttendanceError((err as Error).message);
    } finally {
      setIsAttendanceRefreshing(false);
    }
  }, []);

  // Synchronization handlers
  const handleGetSyncStatus = useCallback(async () => {
    if (!isConnected) return;
    setIsSyncStatusRefreshing(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "getSyncStatus" })
    );
  }, [isConnected, publish]);

  const handleStartAutoSync = useCallback(async () => {
    if (!isConnected) return;
    setIsStartingAutoSync(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({
        command: "startAutoSync",
        interval_hours: syncInterval
      })
    );
  }, [isConnected, publish, syncInterval]);

  const handleStopAutoSync = useCallback(async () => {
    if (!isConnected) return;
    setIsStoppingAutoSync(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "stopAutoSync" })
    );
  }, [isConnected, publish]);

  const handleManualSync = useCallback(async () => {
    if (!isConnected) return;
    setIsSyncing(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "manualSync" })
    );
  }, [isConnected, publish]);

  const handleDiscoverDevices = useCallback(async () => {
    if (!isConnected) return;
    setIsDiscovering(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "discoverDevices" })
    );
  }, [isConnected, publish]);

  const handleResetFailedDevices = useCallback(async () => {
    if (!isConnected) return;
    setIsResettingDevices(true);
    await publish(
      "accessControl/user/command",
      JSON.stringify({ command: "resetFailedDevices" })
    );
  }, [isConnected, publish]);

  const handleSyncResponse = useCallback((topic: string, message: string) => {
    try {
      const payload = JSON.parse(message);

      // Reset all loading states
      setIsSyncStatusRefreshing(false);
      setIsStartingAutoSync(false);
      setIsStoppingAutoSync(false);
      setIsSyncing(false);
      setIsDiscovering(false);
      setIsResettingDevices(false);

      if (payload.status === "success" && payload.data) {
        // Handle different response types based on the response structure
        if (payload.data.auto_sync_enabled !== undefined) {
          // This is getSyncStatus response
          setSyncStatus(payload.data);
        } else if (payload.data.accessible_devices !== undefined) {
          // This is discoverDevices response
          setDeviceDiscovery(payload.data);
        }
      }
    } catch (e) {
      console.error("Failed to parse sync MQTT message:", e);
      // Reset loading states on error
      setIsSyncStatusRefreshing(false);
      setIsStartingAutoSync(false);
      setIsStoppingAutoSync(false);
      setIsSyncing(false);
      setIsDiscovering(false);
      setIsResettingDevices(false);
    }
  }, []);

  const handleSystemStatusResponse = useCallback((topic: string, message: string) => {
    try {
      const payload = JSON.parse(message);

      // Handle scheduled sync notifications
      if (payload.event_type === "scheduled_sync_completed") {
        // Refresh sync status after scheduled sync
        handleGetSyncStatus();
      }
    } catch (e) {
      console.error("Failed to parse system status MQTT message:", e);
    }
  }, [handleGetSyncStatus]);

  useEffect(() => {
    if (isConnected) {
      subscribe("accessControl/user/response", handleUserResponse);
      subscribe("accessControl/device/response", handleDeviceResponse);
      subscribe("accessControl/user/response", handleSyncResponse);
      subscribe("accessControl/system/response", handleSyncResponse);
      subscribe("accessControl/system/status", handleSystemStatusResponse);
      handleFetchUsers();
      handleTestConnection();
      handleFetchAttendance();
      handleGetSyncStatus();
    }
    return () => {
      unsubscribe("accessControl/user/response");
      unsubscribe("accessControl/device/response");
      unsubscribe("accessControl/system/response");
      unsubscribe("accessControl/system/status");
    };
  }, [
    isConnected,
    subscribe,
    unsubscribe,
    handleUserResponse,
    handleDeviceResponse,
    handleSyncResponse,
    handleSystemStatusResponse,
    handleFetchUsers,
    handleTestConnection,
    handleFetchAttendance,
    handleGetSyncStatus,
  ]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold">
            Unified Access Control Dashboard
          </h1>
        </div>
        <MqttStatus />
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Enhanced Navigation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Quick Navigation
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Access key features and management tools
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200 "
                onClick={() => router.push("/access-control/device")}
              >
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full mr-4">
                  <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Device Management
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Monitor & manage access control hardware
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {deviceSummary.online_devices}/{deviceSummary.total_devices}{" "}
                    Online
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200 "
                onClick={() => router.push("/access-control/user")}
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full mr-4">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    User Management
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Add, edit, and manage user access & biometrics
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {users.length} Registered Users
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200"
                onClick={() => router.push("/access-control/palm")}
              >
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full mr-4">
                  <Hand className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Palm Recognition
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    MQTT-based palm biometric system
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Real-time Control
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200  "
                onClick={() => router.push("/access-control/configuration")}
              >
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full mr-4">
                  <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    System Configuration
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Network settings & system preferences
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Settings Panel
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200"
                onClick={() => router.push("/access-control/attendance")}
              >
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full mr-4">
                  <Clock4 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Attendance Logs
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    View real-time access logs & reports
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {attendanceRecords.length} Recent Records
                  </Badge>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-start h-auto p-4 hover:shadow-md transition-all duration-200"
                onClick={() => {}}
              >
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-full mr-4">
                  <RefreshCw className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Device Synchronization
                  </span>
                  <span className="text-xs text-muted-foreground mb-2">
                    Auto & manual device sync management
                  </span>
                  <Badge
                    variant={syncStatus?.auto_sync_enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {syncStatus?.auto_sync_enabled ? "Auto-Sync ON" : "Auto-Sync OFF"}
                  </Badge>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device Status Summary Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Online Devices
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-500 dark:text-green-400 rounded-full">
                <Wifi className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {deviceSummary.online_devices}
              </div>
              <p className="text-xs text-muted-foreground">
                {deviceSummary.success_rate.toFixed(1)}% Success Rate
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offline Devices
              </CardTitle>
              <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full">
                <XCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {deviceSummary.offline_devices}
              </div>
              <p className="text-xs text-muted-foreground">
                {deviceSummary.total_devices - deviceSummary.online_devices}{" "}
                Failed
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <div className="p-2 bg-muted rounded-full">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{users.length}</div>
              <p className="text-xs text-muted-foreground">Unique Records</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Access Logs
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full">
                <Clock4 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {attendanceRecords.length}
              </div>
              <p className="text-xs text-muted-foreground">Recent Records</p>
            </CardContent>
          </Card>
        </div>

        {/* Device Synchronization Dashboard */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Device Synchronization
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Automatic and manual device synchronization management
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {syncStatus?.total_syncs_performed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Syncs
                  </div>
                </div>
                <Button
                  onClick={handleGetSyncStatus}
                  disabled={!isConnected || isSyncStatusRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isSyncStatusRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Sync Status Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Auto-Sync Status
                    </CardTitle>
                    <div className={`p-2 rounded-full ${
                      syncStatus?.auto_sync_enabled
                        ? "bg-green-100 dark:bg-green-900/20 text-green-500 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400"
                    }`}>
                      {syncStatus?.auto_sync_enabled ? <PlayCircle className="h-4 w-4" /> : <StopCircle className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {syncStatus?.auto_sync_enabled ? "ON" : "OFF"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {syncStatus?.auto_sync_enabled
                        ? `Every ${syncStatus.sync_interval_hours}h`
                        : "Disabled"
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Failed Devices
                    </CardTitle>
                    <div className={`p-2 rounded-full ${
                      (syncStatus?.failed_devices_count || 0) > 0
                        ? "bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400"
                        : "bg-green-100 dark:bg-green-900/20 text-green-500 dark:text-green-400"
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {syncStatus?.failed_devices_count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Need Attention
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Last Sync
                    </CardTitle>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full">
                      <Clock4 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold mb-1">
                      {syncStatus?.last_sync_time
                        ? formatTimestamp(syncStatus.last_sync_time)
                        : "Never"
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last Execution
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Discovered Devices
                    </CardTitle>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 rounded-full">
                      <Search className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">
                      {deviceDiscovery?.accessible_devices?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Online Devices
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Control Panel */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Auto-Sync Controls */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Automatic Synchronization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Sync Interval (hours)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={syncInterval}
                          onChange={(e) => setSyncInterval(parseInt(e.target.value) || 1)}
                          className="flex h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleStartAutoSync}
                        disabled={!isConnected || isStartingAutoSync || syncStatus?.auto_sync_enabled}
                        size="sm"
                        className="flex-1"
                      >
                        {isStartingAutoSync ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircle className="mr-2 h-4 w-4" />
                        )}
                        Start Auto-Sync
                      </Button>
                      <Button
                        onClick={handleStopAutoSync}
                        disabled={!isConnected || isStoppingAutoSync || !syncStatus?.auto_sync_enabled}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {isStoppingAutoSync ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <StopCircle className="mr-2 h-4 w-4" />
                        )}
                        Stop Auto-Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Controls */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Manual Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleManualSync}
                      disabled={!isConnected || isSyncing}
                      size="sm"
                      variant="default"
                      className="w-full"
                    >
                      {isSyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Manual Sync Now
                    </Button>
                    <Button
                      onClick={handleDiscoverDevices}
                      disabled={!isConnected || isDiscovering}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      {isDiscovering ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Discover Devices
                    </Button>
                    <Button
                      onClick={handleResetFailedDevices}
                      disabled={!isConnected || isResettingDevices || (syncStatus?.failed_devices_count || 0) === 0}
                      size="sm"
                      variant="destructive"
                      className="w-full"
                    >
                      {isResettingDevices ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="mr-2 h-4 w-4" />
                      )}
                      Reset Failed Devices
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Device Discovery Results */}
              {deviceDiscovery && (
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Device Discovery Results
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Last discovery: {formatTimestamp(deviceDiscovery.timestamp)}
                      ({deviceDiscovery.discovery_duration.toFixed(2)}s)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Accessible Devices */}
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-green-600 dark:text-green-400">
                          Online Devices ({deviceDiscovery.accessible_devices.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {deviceDiscovery.accessible_devices.map((device, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{device.name}</div>
                                <div className="text-xs text-muted-foreground">{device.ip}</div>
                                <div className="text-xs text-muted-foreground">
                                  {device.users_count} users, {device.templates_count} templates
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Failed Devices */}
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-red-600 dark:text-red-400">
                          Offline Devices ({deviceDiscovery.failed_devices.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {deviceDiscovery.failed_devices.map((device, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                              <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full">
                                <XCircle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{device.name}</div>
                                <div className="text-xs text-muted-foreground">{device.ip}</div>
                                <div className="text-xs text-red-600 dark:text-red-400 truncate">
                                  {device.error}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sync History */}
              {syncStatus?.recent_sync_history && syncStatus.recent_sync_history.length > 0 && (
                <Card className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock4 className="h-4 w-4" />
                      Recent Sync History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {syncStatus.recent_sync_history.slice(0, 5).map((sync, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className={`p-2 rounded-full ${
                            sync.result.status === 'success'
                              ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          }`}>
                            {sync.result.status === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={sync.type === 'manual' ? 'default' : 'secondary'} className="text-xs">
                                {sync.type === 'manual' ? 'Manual' : 'Scheduled'}
                              </Badge>
                              <span className="text-sm font-medium">
                                {sync.result.devices_synced} devices synced
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(sync.start_time)} - Duration: {
                                ((new Date(sync.end_time).getTime() - new Date(sync.start_time).getTime()) / 1000).toFixed(1)
                              }s
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all registered users
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">{users.length}</div>
                  <div className="text-xs text-muted-foreground">
                    Total Users
                  </div>
                </div>
                <Button
                  onClick={handleFetchUsers}
                  disabled={!isConnected || isUsersRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isUsersRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Users
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isUsersRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Loading users...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-auto max-h-[500px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-background dark:bg-background z-10">
                    <TableRow>
                      <TableHead>UID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Privilege</TableHead>
                      <TableHead>Devices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          {user.uid}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="bg-muted dark:bg-muted/20 p-2 rounded-full">
                            {user.user_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPrivilegeLabel(user.privilege)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.devices.map((device, idx) => (
                              <Badge key={idx} variant="secondary">
                                <HardDrive className="h-3 w-3 mr-1" />
                                {device}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Status Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Device Status
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time connection status monitoring
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {deviceStatuses.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Devices
                  </div>
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={!isConnected || isDevicesRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isDevicesRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Test Connections
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isDevicesRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Checking connections...</p>
              </div>
            ) : deviceStatuses.length > 0 ? (
              <div className="overflow-auto max-h-[500px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-muted/50 dark:bg-muted/20 z-10">
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceStatuses.map((device, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          {device.device_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                device.status === "online"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-destructive text-destructive-foreground"
                              }`}
                            >
                              {device.status === "online" ? (
                                <Wifi className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </div>
                            {device.device_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              device.status === "online" ? "success" : "danger"
                            }
                          >
                            {device.status === "online" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {device.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.status === "online" ? (
                            <span className="font-medium">
                              {device.response_time_ms?.toFixed(1)} ms
                            </span>
                          ) : (
                            <span className="text-destructive dark:text-red-400">
                              {device.error || "Connection failed"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No devices to display status for.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Log Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Clock4 className="h-5 w-5" />
                  Attendance Log
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time access event monitoring
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {attendanceRecords.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recent Logs
                  </div>
                </div>
                <Button
                  onClick={handleFetchAttendance}
                  disabled={isAttendanceRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isAttendanceRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isAttendanceRefreshing ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p>Loading logs...</p>
              </div>
            ) : attendanceError ? (
              <div className="text-center py-12 text-red-500 dark:text-red-400">
                <p>{attendanceError}</p>
              </div>
            ) : attendanceRecords.length > 0 ? (
              <div className="overflow-auto max-h-[400px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-muted/50 dark:bg-muted/20 z-10">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(record.data.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "success" ? "success" : "danger"
                            }
                          >
                            {record.status === "success" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {record.data.name}
                              </div>
                              {record.data.uid && (
                                <div className="text-xs text-muted-foreground">
                                  UID: {record.data.uid}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.data.device_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.data.deviceId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getAccessMethodIcon(record.data.via)}
                            <span className="text-sm">
                              {getAccessMethodName(record.data.via)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.data.access_action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="text-sm truncate"
                            title={record.data.message}
                          >
                            {record.data.message}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock4 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance logs found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
