"use client";

import { useState, useEffect, useCallback } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import MqttStatus from "@/components/mqtt-status";
import { RealtimeClock } from "@/components/RealtimeClock";
import {
  Loader2,
  Hand,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Monitor,
  Wifi,
  WifiOff,
  RotateCw,
  Users,
  Activity,
} from "lucide-react";

// Interfaces
interface PalmDevice {
  device_id: string;
  device_name: string;
  status: "online" | "offline" | "ready" | "registering" | "error";
  last_seen?: string;
  message?: string;
}

interface PalmStatusMessage {
  status: "ok" | "failed";
  message: string;
  device_id?: string;
  timestamp?: string;
}

interface PalmRecognitionResult {
  user: string;
  score: number;
  device_id: string;
  timestamp: string;
  access_granted?: boolean;
  containment_id?: number;
}

interface PalmUser {
  user_id: string;
  registered_devices: string[];
  last_activity?: string;
  registration_date?: string;
}

export default function PalmRecognitionPage() {
  const { isConnected, isConnecting, subscribe, publish, unsubscribe } = useMQTT();

  // State management
  const [devices, setDevices] = useState<PalmDevice[]>([]);
  const [users, setUsers] = useState<PalmUser[]>([]);
  const [recognitionResults, setRecognitionResults] = useState<PalmRecognitionResult[]>([]);
  const [statusMessages, setStatusMessages] = useState<PalmStatusMessage[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deleteUserId, setDeleteUserId] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalUsers: 0,
    todayRecognitions: 0,
    successRate: 0,
  });

  // MQTT message handlers
  const handlePalmStatus = useCallback((topic: string, message: string) => {
    try {
      const statusData: PalmStatusMessage = JSON.parse(message);

      // Add timestamp if not present
      if (!statusData.timestamp) {
        statusData.timestamp = new Date().toISOString();
      }

      // Update status messages (keep last 50)
      setStatusMessages(prev => [statusData, ...prev].slice(0, 50));

      // Update device status based on message
      if (statusData.device_id) {
        setDevices(prev => prev.map(device =>
          device.device_id === statusData.device_id
            ? {
                ...device,
                status: statusData.status === "ok" ? "ready" : "error",
                message: statusData.message,
                last_seen: statusData.timestamp
              }
            : device
        ));
      }

      // Handle specific status messages
      if (statusData.message.includes("successfully set to regist mode")) {
        setDevices(prev => prev.map(device =>
          device.device_id === statusData.device_id
            ? { ...device, status: "registering" }
            : device
        ));
      } else if (statusData.message.includes("user successfully registered")) {
        // Refresh users list
        loadUsers();
      } else if (statusData.message.includes("user deleted")) {
        // Refresh users list
        loadUsers();
      }

    } catch (error) {
      console.error("Error parsing palm status message:", error);
    }
  }, []);

  const handlePalmResult = useCallback((topic: string, message: string) => {
    try {
      const resultData: PalmRecognitionResult = JSON.parse(message);

      // Add to recognition results (keep last 100)
      setRecognitionResults(prev => [resultData, ...prev].slice(0, 100));

      // Update statistics
      setStats(prev => ({
        ...prev,
        todayRecognitions: prev.todayRecognitions + 1,
        successRate: calculateSuccessRate([resultData, ...recognitionResults])
      }));

    } catch (error) {
      console.error("Error parsing palm result message:", error);
    }
  }, [recognitionResults]);

  // Utility functions
  const calculateSuccessRate = (results: PalmRecognitionResult[]) => {
    if (results.length === 0) return 0;
    const successful = results.filter(r => r.score > 0.8).length;
    return (successful / results.length) * 100;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  const getDeviceStatusIcon = (status: string) => {
    switch (status) {
      case "online":
      case "ready":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "registering":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDeviceStatusBadge = (status: string) => {
    const variants = {
      online: "default",
      ready: "default",
      registering: "secondary",
      error: "destructive",
      offline: "outline"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {getDeviceStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  // API functions
  const loadUsers = useCallback(async () => {
    // Simulate loading users from backend or MQTT discovery
    // This would typically query a backend API or send MQTT discovery command
    setIsLoading(true);
    try {
      // For now, we'll track users from recognition results and status messages
      const userIds = new Set<string>();
      recognitionResults.forEach(result => userIds.add(result.user));

      const palmUsers: PalmUser[] = Array.from(userIds).map(userId => ({
        user_id: userId,
        registered_devices: devices.map(d => d.device_id),
        last_activity: recognitionResults
          .filter(r => r.user === userId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp
      }));

      setUsers(palmUsers);
    } finally {
      setIsLoading(false);
    }
  }, [recognitionResults, devices]);

  const discoverDevices = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      // Send device discovery command via MQTT
      await publish("containment/palm/control", JSON.stringify({
        command: "discover",
        timestamp: new Date().toISOString()
      }));

      // Add mock devices for demonstration
      const mockDevices: PalmDevice[] = [
        {
          device_id: "palm_001",
          device_name: "Palm Reader - Entrance",
          status: "ready",
          last_seen: new Date().toISOString()
        },
        {
          device_id: "palm_002",
          device_name: "Palm Reader - Main Door",
          status: "ready",
          last_seen: new Date().toISOString()
        }
      ];

      setDevices(mockDevices);

    } finally {
      setIsLoading(false);
    }
  }, [isConnected, publish]);

  // User management functions
  const registerUser = useCallback(async () => {
    if (!isConnected || !newUserId.trim() || !selectedDeviceId) return;

    setIsLoading(true);
    try {
      const command = {
        command: "regist",
        user_id: newUserId.trim(),
        device_id: selectedDeviceId,
        timestamp: new Date().toISOString()
      };

      await publish("containment/palm/control", JSON.stringify(command));

      // Show immediate feedback
      setStatusMessages(prev => [{
        status: "ok",
        message: `Registration command sent for user ${newUserId}`,
        device_id: selectedDeviceId,
        timestamp: new Date().toISOString()
      }, ...prev]);

      setNewUserId("");
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, publish, newUserId, selectedDeviceId]);

  const deleteUser = useCallback(async () => {
    if (!isConnected || !deleteUserId.trim()) return;

    setIsLoading(true);
    try {
      const command = {
        command: "delete",
        user_id: deleteUserId.trim(),
        timestamp: new Date().toISOString()
      };

      await publish("containment/palm/control", JSON.stringify(command));

      // Show immediate feedback
      setStatusMessages(prev => [{
        status: "ok",
        message: `Delete command sent for user ${deleteUserId}`,
        timestamp: new Date().toISOString()
      }, ...prev]);

      setDeleteUserId("");
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, publish, deleteUserId]);

  // Effects
  useEffect(() => {
    if (isConnected) {
      // Subscribe to palm topics
      subscribe("containment/palm/status", handlePalmStatus);
      subscribe("containment/palm/result", handlePalmResult);
      subscribe("containment/palm/device/+/status", handlePalmStatus);
      subscribe("containment/palm/device/+/result", handlePalmResult);

      // Discover devices on connection
      discoverDevices();
    }

    return () => {
      unsubscribe("containment/palm/status");
      unsubscribe("containment/palm/result");
      unsubscribe("containment/palm/device/+/status");
      unsubscribe("containment/palm/device/+/result");
    };
  }, [isConnected, subscribe, unsubscribe, handlePalmStatus, handlePalmResult, discoverDevices]);

  useEffect(() => {
    // Update statistics
    setStats({
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.status === "ready" || d.status === "online").length,
      totalUsers: users.length,
      todayRecognitions: recognitionResults.length,
      successRate: calculateSuccessRate(recognitionResults)
    });
  }, [devices, users, recognitionResults]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Palm Recognition System</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <MqttStatus />
          <RealtimeClock />
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.onlineDevices} online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.onlineDevices / Math.max(stats.totalDevices, 1)) * 100).toFixed(1)}% uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Palm profiles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Scans</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayRecognitions}</div>
              <p className="text-xs text-muted-foreground">
                Recognition attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Recognition accuracy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Register User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Register New User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  placeholder="Enter user ID (e.g., user123)"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-select">Select Device</Label>
                <select
                  id="device-select"
                  className="w-full p-2 border rounded-md"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={!isConnected || devices.length === 0}
                >
                  <option value="">Select a device...</option>
                  {devices.filter(d => d.status === "ready" || d.status === "online").map((device) => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_name} ({device.device_id})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={registerUser}
                disabled={!isConnected || !newUserId.trim() || !selectedDeviceId || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Register User
              </Button>
            </CardContent>
          </Card>

          {/* Delete User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Delete User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-user-id">User ID to Delete</Label>
                <Input
                  id="delete-user-id"
                  placeholder="Enter user ID to delete"
                  value={deleteUserId}
                  onChange={(e) => setDeleteUserId(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will permanently remove the user's palm data from all devices.
                </AlertDescription>
              </Alert>
              <Button
                onClick={deleteUser}
                disabled={!isConnected || !deleteUserId.trim() || isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserMinus className="mr-2 h-4 w-4" />
                )}
                Delete User
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Device Status Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Device Status
              </CardTitle>
              <Button
                onClick={discoverDevices}
                disabled={!isConnected || isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-4 w-4" />
                )}
                Refresh Devices
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="overflow-auto rounded-md border">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.device_id}>
                        <TableCell className="font-mono">{device.device_id}</TableCell>
                        <TableCell className="font-medium">{device.device_name}</TableCell>
                        <TableCell>{getDeviceStatusBadge(device.status)}</TableCell>
                        <TableCell className="text-sm">
                          {device.last_seen ? formatTimestamp(device.last_seen) : "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {device.message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No palm recognition devices found.</p>
                <p className="text-sm">Click "Refresh Devices" to discover available devices.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recognition Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Recent Recognition Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recognitionResults.length > 0 ? (
              <div className="overflow-auto max-h-[400px] rounded-md border">
                <UITable>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recognitionResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(result.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{result.user}</TableCell>
                        <TableCell className="text-sm">{result.device_id}</TableCell>
                        <TableCell>
                          <Badge variant={result.score > 0.8 ? "default" : "secondary"}>
                            {(result.score * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.access_granted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Hand className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recognition results yet.</p>
                <p className="text-sm">Results will appear here when palm scans are performed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusMessages.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {statusMessages.map((status, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md text-sm ${
                      status.status === "ok"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status.status === "ok" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="font-medium">{status.message}</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {status.timestamp ? formatTimestamp(status.timestamp) : ""}
                      </div>
                    </div>
                    {status.device_id && (
                      <div className="text-xs mt-1 opacity-75">
                        Device: {status.device_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No status messages yet.</p>
                <p className="text-sm">System messages will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}