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
import {
  Loader2,
  Activity,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  User,
  CreditCard,
  Fingerprint,
  KeyRound,
  ScanFace,
  Terminal,
} from "lucide-react";
import { AccessMethod } from "@/lib/api";
import { useAttendanceLoggerStatus } from "@/hooks/useGlobalAttendanceLogger";
import { AttendanceData, globalAttendanceLogger } from "@/services/GlobalAttendanceLogger";

// AttendanceData interface is now imported from GlobalAttendanceLogger service

// --- Main Component
export default function LiveAttendance() {
  const { isConnected, isConnecting, subscribe, unsubscribe, error } =
    useMQTT();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData[]>(
    []
  );
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Use global attendance logger status for monitoring
  const { isEnabled: isGlobalLoggingEnabled, logMessages } = useAttendanceLoggerStatus();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [
      `[${timestamp}] ${message}`,
      ...prev.slice(0, 49),
    ]);
  }, []);

  // --- Perbaikan: Logika icon dan nama disesuaikan
  const getAccessMethodIcon = (via: number) => {
    switch (via) {
      case 1:
        return <Fingerprint className="h-3 w-3" />;
      case 3:
        return <KeyRound className="h-3 w-3" />;
      case 4:
        return <CreditCard className="h-3 w-3" />;
      case 5:
        return <ScanFace className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getAccessMethodName = (via: number) => {
    switch (via) {
      case 1:
        return "Fingerprint";
      case 3:
        return "Password";
      case 4:
        return "Card";
      case 5:
        return "Face";
      default:
        return "Unknown";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Global attendance logging is now handled automatically by GlobalAttendanceProvider
  // This page now only displays the attendance records received via MQTT

  const handleAttendanceMessage = useCallback(
    (topic: string, message: string) => {
      addLog(`[MQTT] Received message from topic '${topic}'`);
      try {
        const attendance: AttendanceData = JSON.parse(message);
        addLog(
          `[MQTT] Successfully parsed message. User: ${attendance.data.name}`
        );

        setAttendanceRecords((prev) => [attendance, ...prev.slice(0, 99)]);
        setStats((prev) => ({
          total: prev.total + 1,
          success: prev.success + (attendance.status === "success" ? 1 : 0),
          failed: prev.failed + (attendance.status === "failed" ? 1 : 0),
        }));

        // Note: Access log saving is now handled globally by GlobalAttendanceProvider
        addLog(`[Global Logger] Attendance will be saved automatically by global service`);
      } catch (e) {
        addLog(
          `[Parse Error] Failed to parse message. Is it valid JSON? Error: ${e}`
        );
        console.error("Failed to parse attendance message:", e);
      }
    },
    [addLog]
  );

  const clearRecords = () => {
    setAttendanceRecords([]);
    setStats({ total: 0, success: 0, failed: 0 });
    addLog("Attendance records and stats cleared.");
  };

  // Subscribe to global logger attendance callbacks for UI updates
  useEffect(() => {
    const handleGlobalAttendance = (attendance: AttendanceData) => {
      addLog(`[Global Logger] Received attendance data for user: ${attendance.data.name}`);
      
      // Update local state for UI display
      setAttendanceRecords((prev) => [attendance, ...prev.slice(0, 99)]);
      setStats((prev) => ({
        total: prev.total + 1,
        success: prev.success + (attendance.status === "success" ? 1 : 0),
        failed: prev.failed + (attendance.status === "failed" ? 1 : 0),
      }));

      addLog(`[Global Logger] UI updated - attendance will be auto-saved to backend`);
    };

    // Register callback with global logger
    globalAttendanceLogger.addAttendanceCallback(handleGlobalAttendance);
    addLog(`Connected to global attendance logger callbacks`);

    return () => {
      globalAttendanceLogger.removeAttendanceCallback(handleGlobalAttendance);
    };
  }, [addLog]);

  // Log MQTT connection status
  useEffect(() => {
    if (isConnected) {
      addLog(`MQTT Connected - Global logger handles attendance subscription automatically`);
    } else {
      addLog(`MQTT Disconnected - Waiting for reconnection`);
    }
  }, [isConnected, addLog]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 dark:bg-purple-400/10">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Live Attendance</h1>
              <p className="text-xs text-muted-foreground">Real-time attendance monitoring</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MqttStatus />
          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
            <div className={`w-2 h-2 rounded-full ${isGlobalLoggingEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-muted-foreground">
              Global Logger {isGlobalLoggingEnabled ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={clearRecords}
            disabled={attendanceRecords.length === 0}
          >
            Clear Records
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Successful Access
              </CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.success}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Attempts
              </CardTitle>
              <XCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.failed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <h3>Live Attendance Events</h3>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Real-time access control events from all devices
                {isConnected && (
                  <Badge
                    variant="outline"
                    className="ml-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-1"></div>
                    Monitoring
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected &&
            (isConnecting || attendanceRecords.length === 0) ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mt-4">
                  Waiting for MQTT connection...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Once connected, monitoring will start automatically.
                </p>
              </div>
            ) : attendanceRecords.length > 0 ? (
              <UITable>
                <TableHeader>
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
                    <TableRow key={index}>
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
            ) : (
              <div className="text-center py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-2">
                  Waiting for attendance events...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Log Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <h3>Live Console</h3>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-40 overflow-y-auto font-mono text-sm text-muted-foreground bg-muted rounded-md p-4">
            {consoleLogs.length > 0
              ? consoleLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border-b last:border-0 py-1"
                  >
                    {log}
                  </div>
                ))
              : "No console logs yet."}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
