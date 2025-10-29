"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import MqttStatus from "@/components/mqtt-status";
import { toast } from "sonner";
import { usePalmRecognitionDeviceMQTT } from "@/hooks/usePalmRecognitionDevicesMQTT";
import {
  palmRecognitionDeviceApi,
  PalmRecognitionDevice,
} from "@/lib/api-service";
import {
  Loader2,
  Hand,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  RefreshCw,
  DoorOpen,
  Eye,
  Monitor,
  ScrollText,
} from "lucide-react";

// --- Interfaces (based on Vue.js code)
interface PalmCompareResult {
  user: string;
  score: number;
  timestamp: string;
}

interface PalmStatus {
  status: "ok" | "failed";
  message: string;
}

// --- Main Palm Recognition Component (Vue.js conversion)
export default function PalmRecognitionPage() {
  const { isConnected, isConnecting, publish, subscribe, unsubscribe, reconnect } = useMQTT();

  // Multi-device MQTT hook
  const {
    connections: deviceConnections,
    connectDevice: connectToDevice,
    disconnectDevice: disconnectFromDevice,
    publishToDevice,
    subscribeToDevice,
    getDeviceConnection,
  } = usePalmRecognitionDeviceMQTT();

  // Device management state (automatically use active device)
  const [devices, setDevices] = useState<PalmRecognitionDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<PalmRecognitionDevice | null>(null);

  // States (converted from Vue.js refs)
  const [compareResults, setCompareResults] = useState<PalmCompareResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "danger" | "warning" | "info">("info");
  const [openDoorStatus, setOpenDoorStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [lastRecognitionTime, setLastRecognitionTime] = useState<string | null>(null);

  // Image URLs with selected device IP (initially use first device)
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [imageError, setImageError] = useState({ IR: false, RGB: false });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limited compare results (like Vue.js computed)
  const limitedCompareResults = compareResults.slice(0, 5);

  // Alert class computation (like Vue.js computed)
  const getAlertClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400';
      case 'danger':
        return 'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400';
    }
  };

  // Add log function (like Vue.js)
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    setLogs(prev => {
      const newLogs = [logEntry, ...prev];
      return newLogs.length > 100 ? newLogs.slice(0, 100) : newLogs;
    });
  }, []);

  // Show bootstrap alert function (like Vue.js)
  const showBootstrapAlert = useCallback((message: string, type: typeof alertType = 'info', duration = 5000) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), duration);
  }, []);

  // Success toast (like Vue.js Swal)
  const showSuccessToast = useCallback((message: string) => {
    toast.success(message, {
      duration: 3000,
      position: "top-right",
    });
  }, []);

  // Active device status UI
  const renderActiveDeviceStatus = () => (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Hand className="h-5 w-5" />
        <div className="text-sm font-medium">Active Device:</div>
        {activeDevice ? (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-2 py-1">
              {activeDevice.name} ({activeDevice.ipAddress})
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="px-2 py-1">
            No Active Device
          </Badge>
        )}
      </div>

      {/* Device connection status */}
      {activeDevice && (
        <div className="flex items-center gap-2">
          {(() => {
            const connection = getDeviceConnection(activeDevice.id);
            let statusIcon = <WifiOff className="h-4 w-4 text-red-500" />;
            let statusText = "Disconnected";
            let statusColor = "text-red-600";

            if (connection?.isConnecting) {
              statusIcon = <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
              statusText = "Connecting";
              statusColor = "text-yellow-600";
            } else if (connection?.isConnected) {
              statusIcon = <Wifi className="h-4 w-4 text-green-500" />;
              statusText = "Connected";
              statusColor = "text-green-600";
            }

            return (
              <>
                {statusIcon}
                <span className={`text-sm font-medium ${statusColor}`}>
                  {statusText}
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );

  // Image error handler (like Vue.js)
  const onImageError = useCallback((type: 'IR' | 'RGB') => {
    addLog(`Failed to load ${type} image`);
    setImageError(prev => ({ ...prev, [type]: true }));
  }, [addLog]);

  // Connect client function (like Vue.js)
  const connectClient = useCallback(async () => {
    if (isConnected) return;

    setLoading(true);
    try {
      await reconnect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  }, [isConnected, reconnect]);

  // Load palm recognition devices
  const loadDevices = useCallback(async () => {
    try {
      const result = await palmRecognitionDeviceApi.getAllPalmRecognitionDevices();
      if (result.success && result.data) {
        setDevices(result.data);
        // Auto-select active device (where isActive = true)
        const activeDevice = result.data.find(device => device.isActive);
        if (activeDevice) {
          setActiveDevice(activeDevice);
          addLog(`Active palm recognition device loaded: ${activeDevice.name}`);
        } else {
          setActiveDevice(null);
          addLog("No active palm recognition device found");
        }
      } else {
        addLog("Failed to load palm recognition devices");
      }
    } catch (error) {
      addLog(`Error loading devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addLog]);

  // Update image URLs when active device changes
  useEffect(() => {
    if (activeDevice) {
      const timestamp = Date.now();
      setImageUrl1(`http://${activeDevice.ipAddress}:8080/1.ir.png?${timestamp}`);
      setImageUrl2(`http://${activeDevice.ipAddress}:8080/1.rgb.png?${timestamp}`);
      setImageError({ IR: false, RGB: false });
    }
  }, [activeDevice]);

  // Auto-connect to active devices when devices list changes
  useEffect(() => {
    if (!loading && devices.length > 0) {
      const activeDevices = devices.filter(device => device.isActive);
      activeDevices.forEach(device => {
        const connection = getDeviceConnection(device.id);
        // Auto-connect if not already connected or connecting
        if (!connection?.isConnected && !connection?.isConnecting) {
          console.log(`🔗 Auto-connecting palm recognition to active device: ${device.name} (${device.ipAddress})`);
          connectToDevice(device.id, device.ipAddress)
            .then(success => {
              if (!success) {
                console.warn(`Failed to auto-connect palm recognition to ${device.name} after 15 seconds`);
              }
            })
            .catch(error => {
              console.error(`Auto-connect error for palm recognition ${device.name}:`, error);
            });
        }
      });
    }
  }, [devices, loading, connectToDevice, getDeviceConnection]);

  // Initialize - load devices
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Update publishOpenDoor to use active device
  const publishOpenDoor = useCallback(async () => {
    if (!activeDevice) {
      addLog('No active device found for door operation.');
      return;
    }

    const connection = getDeviceConnection(activeDevice.id);
    if (!connection?.isConnected) {
      addLog('Cannot publish Open Door: Device not connected.');
      return;
    }

    const payload = JSON.stringify({ data: 'Open front door' });
    const success = await publishToDevice(activeDevice.id, 'IOT/Containment/Control', payload);

    if (success) {
      addLog(`Published Open Front Door command to ${activeDevice.name}`);
      setOpenDoorStatus(`Success Open Door on ${activeDevice.name}`);

      // Clear door status after 5 seconds
      setTimeout(() => setOpenDoorStatus(""), 3000);
    } else {
      addLog(`Failed to publish Open Front Door command to ${activeDevice.name}`);
    }
  }, [activeDevice, getDeviceConnection, publishToDevice, addLog]);

  // Update refresh images to use active device
  const refreshImages = useCallback(() => {
    if (!activeDevice) return;

    const timestamp = Date.now();
    setImageUrl1(`http://${activeDevice.ipAddress}:8080/1.ir.png?${timestamp}`);
    setImageUrl2(`http://${activeDevice.ipAddress}:8080/1.rgb.png?${timestamp}`);
    setImageError({ IR: false, RGB: false });
  }, [activeDevice]);

  // Update handleCompareResult to include device info
  const handleCompareResult = useCallback((topic: string, payload: string) => {
    try {
      const data: PalmCompareResult = JSON.parse(payload);

      addLog(`[${activeDevice?.name || 'Unknown'} - Compare Result] User: ${data.user}, Score: ${data.score.toFixed(4)}, Time: ${data.timestamp}`);

      // Update current recognition score and timestamp
      setCurrentScore(data.score);
      setLastRecognitionTime(data.timestamp);

      // Add to compare results (like Vue.js)
      setCompareResults(prev => {
        const newResults = [data, ...prev];
        return newResults.length > 10 ? newResults.slice(0, 10) : newResults;
      });

      // If score >= 0.8, publish open door (like Vue.js)
      if (data.score >= 0.8) {
        addLog('Score is high, publishing open door...');
        publishOpenDoor();
        showSuccessToast('Success recognize, Open Front Door');
      }
    } catch {
      addLog(`[${activeDevice?.name || 'Unknown'} - ${topic}] ${payload}`);
    }
  }, [activeDevice?.name, addLog, publishOpenDoor, showSuccessToast]);

  // Update handlePalmStatus to include device info
  const handlePalmStatus = useCallback((topic: string, payload: string) => {
    try {
      const data: PalmStatus = JSON.parse(payload);
      addLog(`[${activeDevice?.name || 'Unknown'} - Status] ${data.status.toUpperCase()}: ${data.message}`);
      showBootstrapAlert(
        `[${activeDevice?.name || 'Unknown'} - Status] ${data.status.toUpperCase()}: ${data.message}`,
        data.status === 'ok' ? 'success' : 'danger'
      );
    } catch {
      addLog(`[${activeDevice?.name || 'Unknown'} - ${topic}] ${payload}`);
    }
  }, [activeDevice?.name, showBootstrapAlert, addLog]);

  // MQTT subscription setup using active device
  useEffect(() => {
    if (activeDevice && getDeviceConnection(activeDevice.id)?.isConnected) {
      // Subscribe to palm topics on active device
      subscribeToDevice(activeDevice.id, 'palm/status', handlePalmStatus);
      subscribeToDevice(activeDevice.id, 'palm/compare/result', handleCompareResult);

      addLog(`Subscribed to palm topics on ${activeDevice.name}`);
      showBootstrapAlert(`Connected to palm recognition device: ${activeDevice.name}`, 'success');

      // Start image refresh interval
      refreshIntervalRef.current = setInterval(refreshImages, 15000);
    } else {
      // Clear interval when disconnected
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      // Clear subscriptions and intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [activeDevice, getDeviceConnection, subscribeToDevice, handlePalmStatus, handleCompareResult, refreshImages, showBootstrapAlert, addLog]);

  // Cleanup on unmount (like Vue.js onUnmounted)
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold">Palm Veins Recognitions</h1>
        </div>
        <MqttStatus />
      </header>

      <div className="flex flex-col gap-6 p-6">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Palm Vein Recognition Panel</h2>
        </div>

        {/* Active Device Status */}
        {renderActiveDeviceStatus()}

        {/* Recognition Score Display */}
        {currentScore !== null && (
          <Card className="border-2 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {(currentScore * 100).toFixed(1)}%
                </div>
                <div className="text-lg text-muted-foreground mb-1">Recognition Score</div>
                <div className="text-sm text-muted-foreground">
                  Raw Score: {currentScore.toFixed(4)}
                </div>
                {lastRecognitionTime && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Last recognition: {new Date(lastRecognitionTime).toLocaleString()}
                  </div>
                )}
                <div className="mt-3">
                  <Badge
                    variant={currentScore >= 0.8 ? "default" : currentScore >= 0.6 ? "secondary" : "destructive"}
                    className="text-sm px-3 py-1"
                  >
                    {currentScore >= 0.8 ? "High Match" : currentScore >= 0.6 ? "Medium Match" : "Low Match"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bootstrap-style Alert */}
        {showAlert && (
          <Alert className={`border ${getAlertClass(alertType)}`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{alertMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlert(false)}
                className="h-6 w-6 p-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Open Door Status */}
        {openDoorStatus && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400">
            <DoorOpen className="h-4 w-4" />
            <AlertDescription>{openDoorStatus}</AlertDescription>
          </Alert>
        )}

        {/* Palm Compare Results */}
        {limitedCompareResults.length > 0 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-5 w-5" />
                Palm Compare Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {limitedCompareResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 border border-border rounded-lg bg-muted/30 dark:bg-muted/10"
                  >
                    <div>
                      <div className="font-semibold">{result.user}</div>
                      <div className="text-sm text-muted-foreground">{result.timestamp}</div>
                    </div>
                    <Badge
                      variant={result.score >= 0.8 ? "default" : "secondary"}
                      className="text-sm"
                    >
                      Score: {result.score.toFixed(4)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Palm Vein Images */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Palm Vein Images
              </CardTitle>
              <Button
                onClick={refreshImages}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center space-y-2">
                {!imageError.IR ? (
                  <img
                    src={imageUrl1}
                    alt="IR Image"
                    className="w-3/4 h-auto rounded-lg shadow-md border rotate-90"
                    onError={() => onImageError('IR')}
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border">
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>IR Image Not Available</p>
                    </div>
                  </div>
                )}
                <small className="block text-muted-foreground">IR Image</small>
              </div>

              <div className="text-center space-y-2">
                {!imageError.RGB ? (
                  <img
                    src={imageUrl2}
                    alt="RGB Image"
                    className="w-3/4 h-auto rounded-lg shadow-md border rotate-90"
                    onError={() => onImageError('RGB')}
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border">
                    <div className="text-center text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>RGB Image Not Available</p>
                    </div>
                  </div>
                )}
                <small className="block text-muted-foreground">RGB Image</small>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* MQTT Logs */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              MQTT Logs (latest first)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-1 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-muted-foreground break-words py-1 border-b border-border/30 last:border-b-0"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No logs yet. Connect to MQTT to see logs.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
