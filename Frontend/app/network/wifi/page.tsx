"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wifi, WifiOff, Loader2, RefreshCw, Radar, Repeat, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { mqttClient } from "@/lib/mqtt";
import MqttStatus from "@/components/mqtt-status";

interface Network {
  ssid: string;
  signal_strength: number;
}

export default function WifiScannerPage() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [networks, setNetworks] = useState<Network[]>([]);
  const [tab, setTab] = useState("scan");
  const [chosenSsid, setChosenSsid] = useState("");
  const [password, setPassword] = useState("");
  const [delSsid, setDelSsid] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const initializeMqtt = async () => {
      try {
        // Connect to MQTT broker
        await mqttClient.connect();
        
        if (isSubscribed) {
          setStatus("connected");
        }
      } catch (error) {
        console.error("MQTT connection error:", error);
        if (isSubscribed) {
          setStatus("error");
        }
      }
    };

    // Message handlers for WiFi topics
    const handleScanResults = (topic: string, message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.networks && Array.isArray(data.networks)) {
          setNetworks(data.networks);
          toast.success("Wi-Fi scan complete");
        }
      } catch (error) {
        console.error("Error parsing scan results:", error);
        toast.error("Failed to parse scan results");
      }
    };

    const handleIpUpdate = (topic: string, message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.status === "success") {
          toast.success(`Switched to ${data.ssid}, new IP: ${data.ip}`);
        } else if (data.status === "error") {
          toast.error(data.message || "WiFi switch failed");
        }
      } catch (error) {
        console.error("Error parsing IP update:", error);
        toast.error("Failed to parse WiFi update");
      }
    };

    // Connection status listener
    const handleConnectionChange = (connected: boolean) => {
      if (isSubscribed) {
        setStatus(connected ? "connected" : "disconnected");
      }
    };

    // Subscribe to topics and set up listeners
    const setupSubscriptions = async () => {
      try {
        await mqttClient.subscribe("wifi/scan_results", handleScanResults);
        await mqttClient.subscribe("wifi/ip_update", handleIpUpdate);
        mqttClient.addConnectionListener(handleConnectionChange);
      } catch (error) {
        console.error("Error setting up MQTT subscriptions:", error);
        if (isSubscribed) {
          setStatus("error");
        }
      }
    };

    // Initialize MQTT connection and subscriptions
    initializeMqtt().then(() => {
      if (isSubscribed) {
        setupSubscriptions();
      }
    });

    // Cleanup function
    return () => {
      isSubscribed = false;
      // Unsubscribe from topics
      mqttClient.unsubscribe("wifi/scan_results", handleScanResults);
      mqttClient.unsubscribe("wifi/ip_update", handleIpUpdate);
      mqttClient.removeConnectionListener(handleConnectionChange);
    };
  }, []);

  const scanWifi = async () => {
    if (status !== "connected") {
      toast.error("MQTT not connected. Cannot scan WiFi networks.");
      return;
    }

    setIsLoading(true);
    toast.info("Starting WiFi scan...");
    
    try {
      const success = await mqttClient.publish("wifi/scan_request", "");
      if (!success) {
        toast.error("Failed to request WiFi scan");
      }
    } catch (error) {
      console.error("Error requesting WiFi scan:", error);
      toast.error("Failed to request WiFi scan");
    } finally {
      setIsLoading(false);
    }
  };

  const switchWifi = async () => {
    if (!chosenSsid || !password) {
      toast.error("SSID & password required");
      return;
    }

    if (status !== "connected") {
      toast.error("MQTT not connected. Cannot switch WiFi.");
      return;
    }

    setIsLoading(true);
    toast.info(`Switching to ${chosenSsid}...`);
    
    try {
      const success = await mqttClient.publish("wifi/switch_wifi", JSON.stringify({ 
        ssid: chosenSsid, 
        password 
      }));
      
      if (!success) {
        toast.error("Failed to send WiFi switch command");
      }
    } catch (error) {
      console.error("Error switching WiFi:", error);
      toast.error("Failed to switch WiFi network");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWifi = async () => {
    if (!delSsid) {
      toast.error("SSID required");
      return;
    }

    if (status !== "connected") {
      toast.error("MQTT not connected. Cannot delete WiFi.");
      return;
    }

    setIsLoading(true);
    toast.info(`Deleting ${delSsid}...`);
    
    try {
      const success = await mqttClient.publish("wifi/delete_wifi", JSON.stringify({ 
        ssid: delSsid 
      }));
      
      if (success) {
        toast.success(`Deleted ${delSsid}`);
        setDelSsid(""); // Clear input after successful deletion
      } else {
        toast.error("Failed to delete WiFi network");
      }
    } catch (error) {
      console.error("Error deleting WiFi:", error);
      toast.error("Failed to delete WiFi network");
    } finally {
      setIsLoading(false);
    }
  };

  const signalColor = (s: number) =>
    s >= 60 ? "text-green-600" : s >= 30 ? "text-orange-500" : "text-red-600";

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Wifi className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Wi‑Fi Scanner</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium">
            {status === "connected" ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-green-700">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-red-600" />
                <span className="text-red-700">Disconnected</span>
              </>
            )}
          </div>
          <MqttStatus />
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Reload Page
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        <Tabs defaultValue="scan" value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="scan" disabled={isLoading} className="flex items-center gap-2">
              <Radar className="w-4 h-4" />
              Network Scan
            </TabsTrigger>
            <TabsTrigger value="switch" disabled={isLoading} className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Switch Network
            </TabsTrigger>
            <TabsTrigger value="delete" disabled={isLoading} className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Network
            </TabsTrigger>
          </TabsList>

          {/* SCAN */}
          <TabsContent value="scan">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Radar className="w-5 h-5 text-blue-600" />
                  WiFi Network Scan
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  {networks.length > 0 && !isLoading && (
                    <span className="text-sm text-green-600">({networks.length} networks found)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={scanWifi} 
                    disabled={isLoading || status !== "connected"}
                    className="h-11"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning Networks...
                      </>
                    ) : (
                      <>
                        <Radar className="w-4 h-4 mr-2" />
                        Start WiFi Scan
                      </>
                    )}
                  </Button>
                  
                  {status !== "connected" && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">MQTT not connected</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                    <span className="text-lg text-blue-500">Scanning WiFi networks...</span>
                    <p className="text-sm text-muted-foreground mt-2">Discovering available wireless networks</p>
                  </div>
                ) : networks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-50 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      <WifiOff className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No WiFi networks found</h3>
                    <p className="text-gray-500 mb-6">Click the scan button to discover available wireless networks</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Network Name (SSID)</th>
                          <th className="text-left p-3 font-semibold">Signal Strength</th>
                          <th className="text-left p-3 font-semibold">Quality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {networks.map((network, index) => (
                          <tr key={network.ssid} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{network.ssid}</span>
                              </div>
                            </td>
                            <td className={`p-3 font-mono text-sm ${signalColor(network.signal_strength)}`}>
                              {network.signal_strength}%
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      network.signal_strength >= 60 ? 'bg-green-500' :
                                      network.signal_strength >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(network.signal_strength, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${signalColor(network.signal_strength)}`}>
                                  {network.signal_strength >= 60 ? 'Excellent' :
                                   network.signal_strength >= 30 ? 'Good' : 'Poor'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SWITCH */}
          <TabsContent value="switch">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-green-600" />
                  Switch WiFi Network
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Select Network</label>
                    <select
                      value={chosenSsid}
                      onChange={(e) => setChosenSsid(e.target.value)}
                      disabled={isLoading || networks.length === 0}
                      className="w-full h-11 border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                    >
                      <option value="">
                        {networks.length === 0 ? "No networks available - scan first" : "Select a network"}
                      </option>
                      {networks.map((network) => (
                        <option key={network.ssid} value={network.ssid}>
                          {network.ssid} ({network.signal_strength}% signal)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">WiFi Password</label>
                    <Input
                      type="password"
                      placeholder="Enter network password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={switchWifi} 
                  disabled={isLoading || status !== "connected" || !chosenSsid || !password}
                  className="w-full h-11"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Switching Network...
                    </>
                  ) : (
                    <>
                      <Repeat className="w-4 h-4 mr-2" />
                      Switch to Network
                    </>
                  )}
                </Button>
                
                {chosenSsid && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Network Selected</span>
                    </div>
                    <p className="text-sm text-green-700">
                      <strong>Target Network:</strong> {chosenSsid}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Connection will be temporarily interrupted during the switch process.
                    </p>
                  </div>
                )}

                {status !== "connected" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">MQTT Not Connected</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      Cannot switch networks. Please check MQTT connection.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DELETE */}
          <TabsContent value="delete">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Delete WiFi Network
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-red-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Network Name (SSID)</label>
                  <Input
                    placeholder="Enter SSID to delete"
                    value={delSsid}
                    onChange={(e) => setDelSsid(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will permanently remove the saved WiFi profile from the device.
                  </p>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={deleteWifi}
                  disabled={isLoading || status !== "connected" || !delSsid}
                  className="w-full h-11"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting Profile...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Network Profile
                    </>
                  )}
                </Button>
                
                {delSsid && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Warning</span>
                    </div>
                    <p className="text-sm text-red-700">
                      This will permanently remove the saved profile for <strong>"{delSsid}"</strong>.
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      You will need to re-enter the password to connect to this network again.
                    </p>
                  </div>
                )}

                {status !== "connected" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">MQTT Not Connected</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      Cannot delete network profiles. Please check MQTT connection.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}