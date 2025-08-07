"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wifi, Power, Terminal, RotateCw, Settings, Thermometer, Cpu,
  MemoryStick, HardDrive, Clock, Moon, Sun, BatteryCharging,
  Grid, List, Play, Pause, Monitor, Save
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import MqttStatus from '@/components/mqtt-status';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import Swal from 'sweetalert2';

import { useMQTT } from "@/lib/mqtt-manager";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

interface SystemInfo {
  cpu_usage: number;
  cpu_temp: string;
  memory_usage: number;
  used_memory: number;
  total_memory: number;
  disk_usage: number;
  used_disk: number;
  total_disk: number;
  eth0_ip_address: string;
  wlan0_ip_address: string;
  uptime: number;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'system');
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    cpu_usage: 0,
    cpu_temp: "N/A",
    memory_usage: 0,
    used_memory: 0,
    total_memory: 0,
    disk_usage: 0,
    used_disk: 0,
    total_disk: 0,
    eth0_ip_address: "N/A",
    wlan0_ip_address: "N/A",
    uptime: 0,
  });

  const [ipIndex, setIpIndex] = useState(0);
  const { theme, setTheme } = useTheme();
  const { subscribe, unsubscribe, publish, isConnected } = useMQTT();
  const { 
    preferences, 
    isLoaded, 
    toggleCarouselMode, 
    toggleAutoPlay, 
    setAutoPlayInterval,
    resetPreferences 
  } = useDashboardPreferences();

  const requestSystemStatus = useCallback(() => {
    if (isConnected()) {
      toast.info("Requesting system status...");
    } else {
      toast.warning("MQTT not connected. Cannot request system status.");
    }
  }, [isConnected]);

  useEffect(() => {
    const topicsToSubscribe = [
      "system/status",
      "service/response",
      "command/reset_config",
      "batteryCharger/reset/energy/response",
      "batteryCharger/reset/cycle/response",
    ];

    const subscribeToTopics = async () => {
      for (const topic of topicsToSubscribe) {
        await subscribe(topic, handleMessage, 'SettingsPage');
      }
    };

    if (isConnected()) {
      subscribeToTopics();
      requestSystemStatus();
      toast.success("MQTT Connected. Fetching system data...");
    }

    const handleMessage = useCallback((topic: string, payload: Buffer) => {
      try {
        const msg = JSON.parse(payload.toString());

        if (topic === "system/status") {
          setSystemInfo(msg);
        } else if (topic === "service/response") {
          toast.dismiss("serviceCommand");
          toast.dismiss("resetConfigCommand");

          if (msg.result === "success") {
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: msg.message || "Command executed successfully.",
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
          } else {
            Swal.fire({
              position: 'top-end',
              icon: 'error',
              title: 'Error!',
              text: msg.message || 'Command failed.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
            console.error("Service command error response:", msg);
          }
        } else if (topic === "command/reset_config") {
          console.log("Received reset_config command from hardware:", msg);
          if (msg.action === "reset") {
            toast.info("Hardware button initiated a configuration reset. System may reboot soon.");
          }
        } else if (topic === "batteryCharger/reset/energy/response") {
          Swal.close(); // Close any active SweetAlert2 instance (e.g., loading spinner)

          if (msg.status === "reset") {
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: 'Success!',
              text: msg.message || 'Energy counters reset successfully.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
          } else if (msg.status === "error") {
            Swal.fire({
              position: 'top-end',
              icon: 'error',
              title: 'Error!',
              text: msg.message || 'Failed to reset energy counters.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
            console.error("Energy reset error response:", msg);
          }
        } else if (topic === "batteryCharger/reset/cycle/response") {
          Swal.close(); // Close any active SweetAlert2 instance

          if (msg.status === "reset") {
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: 'Success!',
              text: msg.message || 'Cycle counters reset successfully.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
          } else if (msg.status === "error") {
            Swal.fire({
              position: 'top-end',
              icon: 'error',
              title: 'Error!',
              text: msg.message || 'Failed to reset cycle counters.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
            console.error("Cycle reset error response:", msg);
          }
        }
      } catch (err) {
        toast.error("Invalid payload format received from MQTT.");
        console.error("MQTT message parsing error:", err);
      }
    }, []);

    const ipInterval = setInterval(() => setIpIndex(i => (i + 1) % 2), 3000);

    return () => {
      clearInterval(ipInterval);
      topicsToSubscribe.forEach((topic) => {
        unsubscribe(topic, 'SettingsPage');
      });
    };
  }, [subscribe, unsubscribe, isConnected, requestSystemStatus]);

  const sendCommand = async (services: string[], action: string, confirmMessage?: string) => {
    if (!isConnected()) {
      toast.error("MQTT not connected. Please wait for connection or refresh.");
      return;
    }

    let proceed = true;
    if (confirmMessage) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: confirmMessage,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, proceed!'
      });

      if (!result.isConfirmed) {
        proceed = false;
        toast.info("Action cancelled.");
      }
    }

    if (proceed) {
      const payload = JSON.stringify({ services, action });
      const success = await publish("service/command", payload);
      if (success) {
        Swal.fire({
          title: 'Processing...',
          text: `${action.toUpperCase()} initiated. Please wait for a response.`,
          icon: 'info',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      } else {
        toast.error(`Failed to send command`);
      }
    }
  };

  const resetConfig = async (confirmMessage?: string) => {
    if (!isConnected()) {
      toast.error("MQTT not connected. Please wait for connection or refresh.");
      return;
    }

    let proceed = true;
    if (confirmMessage) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: confirmMessage,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, proceed!'
      });

      if (!result.isConfirmed) {
        proceed = false;
        toast.info("Action cancelled.");
      }
    }

    if (proceed) {
      const payload = JSON.stringify({ action: "reset" });
      const success = await publish("command/reset_config", payload);
      if (success) {
        Swal.fire({
          title: 'Resetting Configuration...',
          text: 'This may take a moment. Please wait.',
          icon: 'info',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      } else {
        toast.error(`Failed to send reset config command`);
      }
    }
  };

  const resetEnergyCounters = async () => {
    if (!isConnected()) {
      toast.error("MQTT not connected. Please wait for connection or refresh.");
      return;
    }

    const result = await Swal.fire({
      title: 'Reset Energy Counters?',
      text: "This action will reset the energy measurement counters to zero. Are you sure?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!'
    });

    if (result.isConfirmed) {
      const success = await publish("batteryCharger/reset/energy", "");
      if (success) {
          Swal.fire({
            title: 'Resetting Energy...',
            html: 'Please wait, this will take approximately <b></b> seconds.',
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
              const b = Swal.getHtmlContainer()?.querySelector('b');
              let timerInterval: NodeJS.Timeout | null = null; // Declare timerInterval with null
              if (b) {
                timerInterval = setInterval(() => {
                  if (Swal.getTimerLeft()) {
                    b.textContent = String(Math.ceil(Swal.getTimerLeft()! / 1000));
                  }
                }, 100);
              }
              // Fix: Assign a function that returns the timerInterval or undefined
              Swal.stopTimer = () => {
                if (timerInterval) {
                  clearInterval(timerInterval);
                }
                return undefined; // Explicitly return undefined
              };
            },
            willClose: () => {
              // No change needed here, as the response handler will close Swal.
              // If Swal is still open after the timer, it means no response came.
            }
          });
      } else {
        toast.error(`Failed to send energy reset command`);
      }
    } else {
      toast.info("Energy reset cancelled.");
    }
  };

  const resetCycleCounters = async () => {
    if (!isConnected()) {
      toast.error("MQTT not connected. Please wait for connection or refresh.");
      return;
    }

    const result = await Swal.fire({
      title: 'Reset Cycle Counters?',
      text: "This action will reset the battery cycle count to zero. Are you sure?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!'
    });

    if (result.isConfirmed) {
      const success = await publish("batteryCharger/reset/cycle", "");
      if (success) {
          Swal.fire({
            title: 'Resetting Cycle Count...',
            html: 'Please wait, this will take approximately <b></b> seconds.',
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
              const b = Swal.getHtmlContainer()?.querySelector('b');
              let timerInterval: NodeJS.Timeout | null = null; // Declare timerInterval with null
              if (b) {
                timerInterval = setInterval(() => {
                  if (Swal.getTimerLeft()) {
                    b.textContent = String(Math.ceil(Swal.getTimerLeft()! / 1000));
                  }
                }, 100);
              }
              // Fix: Assign a function that returns the timerInterval or undefined
              Swal.stopTimer = () => {
                if (timerInterval) {
                  clearInterval(timerInterval);
                }
                return undefined; // Explicitly return undefined
              };
            },
            willClose: () => {
              // No change needed here.
            }
          });
      } else {
        toast.error(`Failed to send cycle reset command`);
      }
    } else {
      toast.info("Cycle reset cancelled.");
    }
  };

  const ipType = ipIndex === 0 ? "eth0" : "wlan0";
  const ipAddress = ipIndex === 0 ? systemInfo.eth0_ip_address : systemInfo.wlan0_ip_address;

  const handleIntervalChange = (value: string) => {
    setAutoPlayInterval(parseInt(value));
    toast.success("Auto-play interval updated");
  };

  const handleReset = () => {
    resetPreferences();
    toast.success("Dashboard preferences reset to defaults");
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">General Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-400 transition-all duration-200" />
            ) : (
              <Moon className="h-5 w-5 text-blue-600 transition-all duration-200" />
            )}
          </Button>
          <span className="text-xs font-medium min-w-[70px] text-center select-none">
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.location.reload()}
          >
            <RotateCw />
          </Button>
        </div>
      </header>
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system">System Settings</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Services Management</span>
              <span className="flex items-center gap-2 text-sm">
                <MqttStatus />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 justify-between w-full">
              <div className="flex-1 min-w-[200px]">
                <h6 className="text-sm font-semibold mb-2">Config</h6>
                <Button
                  onClick={() => sendCommand(["Multiprocesing.service"], "restart", "This will restart MQTT and IP configurations. Are you sure?")}
                  className="w-full mb-2 flex justify-between items-center"
                  variant="secondary"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" />Restart MQTT + IP</span>
                </Button>
                <Button
                  onClick={() => sendCommand(["Multiprocesing.service"], "restart", "This will restart Device Modbus configurations. Are you sure?")}
                  className="w-full flex justify-between items-center"
                  variant="secondary"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" />Restart Device Modbus</span>
                </Button>
                <Button
                  onClick={() => sendCommand(["Multiprocesing.service"], "restart", "This will restart Device Modbus configurations. Are you sure?")}
                  className="w-full flex justify-between items-center"
                  variant="secondary"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" />Restart Device Modular</span>
                </Button>
                {/* <Button
                  onClick={resetEnergyCounters}
                  className="w-full mt-2 flex justify-between items-center"
                  variant="secondary"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><BatteryCharging className="h-4 w-4" />Reset Energy Counters</span>
                </Button>
                <Button
                  onClick={resetCycleCounters}
                  className="w-full mt-2 flex justify-between items-center"
                  variant="secondary"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><BatteryCharging className="h-4 w-4" />Reset Cycle Counters</span>
                </Button> */}
              </div>
              <div className="flex-1 min-w-[200px]">
                <h6 className="text-sm font-semibold mb-2">System</h6>
                <Button
                  onClick={() => resetConfig("This will reset specific configurations to their defaults. This action may cause a temporary service interruption. Are you sure?")}
                  className="w-full mb-2 flex justify-between items-center"
                  variant="destructive"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><Terminal className="h-4 w-4" />Reset System to Default</span>
                </Button>
                <Button
                  onClick={() => sendCommand([], "sudo reboot", "This will reboot the system. All current operations will be interrupted. Are you sure?")}
                  className="w-full mb-2 flex justify-between items-center"
                  variant="destructive"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><RotateCw className="h-4 w-4" />Reboot System</span>
                </Button>
                <Button
                  onClick={() => sendCommand([], "sudo shutdown now", "This will shut down the system. You will need physical access to power it back on. Are you sure?")}
                  className="w-full flex justify-between items-center"
                  variant="destructive"
                  disabled={!isConnected()}
                >
                  <span className="flex items-center gap-2"><Power className="h-4 w-4" />Shutdown System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Wifi className="h-6 w-6 text-blue-500" />
              <div>
                <h6 className="font-medium">IP Address</h6>
                <p className="text-sm text-muted-foreground"><strong>{ipType}:</strong> {ipAddress}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Thermometer className="h-6 w-6 text-red-500" />
              <div>
                <h6 className="font-medium">CPU Temp</h6>
                <p className="text-sm text-muted-foreground">{systemInfo.cpu_temp}°C</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Cpu className="h-6 w-6 text-green-700" />
              <div>
                <h6 className="font-medium">CPU Usage</h6>
                <p className="text-sm text-muted-foreground">{systemInfo.cpu_usage}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <MemoryStick className="h-6 w-6 text-green-600" />
              <div>
                <h6 className="font-medium">Memory Usage</h6>
                <p className="text-sm text-muted-foreground">
                  {systemInfo.memory_usage}% ({systemInfo.used_memory}/{systemInfo.total_memory} MB)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <HardDrive className="h-6 w-6 text-black-500" />
              <div>
                <h6 className="font-medium">Disk Usage</h6>
                <p className="text-sm text-muted-foreground">
                  {systemInfo.disk_usage}% ({systemInfo.used_disk}/{systemInfo.total_disk} MB)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Clock className="h-6 w-6 text-indigo-500" />
              <div>
                <h6 className="font-medium">Uptime</h6>
                <p className="text-sm text-muted-foreground">{Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m</p>
              </div>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {!isLoaded ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="space-y-4">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Display Mode Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Display Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {preferences.isCarouselMode ? (
                            <Grid className="h-4 w-4 text-primary" />
                          ) : (
                            <List className="h-4 w-4 text-primary" />
                          )}
                          <Label htmlFor="display-mode" className="text-base font-medium">
                            Display Mode
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {preferences.isCarouselMode ? 'Carousel' : 'Scroll'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {preferences.isCarouselMode 
                            ? 'Show one component at a time with navigation controls'
                            : 'Show all components in a scrollable list'
                          }
                        </p>
                      </div>
                      <Switch
                        id="display-mode"
                        checked={preferences.isCarouselMode}
                        onCheckedChange={toggleCarouselMode}
                      />
                    </div>

                    {preferences.isCarouselMode && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Carousel Settings</h4>
                          
                          {/* Auto-play Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {preferences.autoPlayEnabled ? (
                                  <Play className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Pause className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Label htmlFor="auto-play" className="text-sm font-medium">
                                  Auto-play
                                </Label>
                                {preferences.autoPlayEnabled && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Automatically advance to the next component
                              </p>
                            </div>
                            <Switch
                              id="auto-play"
                              checked={preferences.autoPlayEnabled}
                              onCheckedChange={toggleAutoPlay}
                            />
                          </div>

                          {/* Auto-play Interval */}
                          {preferences.autoPlayEnabled && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="interval" className="text-sm font-medium">
                                  Auto-play Interval
                                </Label>
                              </div>
                              <Select
                                value={preferences.autoPlayInterval.toString()}
                                onValueChange={handleIntervalChange}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5000">5 seconds</SelectItem>
                                  <SelectItem value="10000">10 seconds</SelectItem>
                                  <SelectItem value="15000">15 seconds</SelectItem>
                                  <SelectItem value="20000">20 seconds</SelectItem>
                                  <SelectItem value="30000">30 seconds</SelectItem>
                                  <SelectItem value="60000">1 minute</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Time between automatic component transitions
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Current Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {preferences.isCarouselMode ? 'Carousel' : 'Scroll'}
                        </div>
                        <div className="text-xs text-muted-foreground">Display Mode</div>
                      </div>
                      
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {preferences.autoPlayEnabled ? 'On' : 'Off'}
                        </div>
                        <div className="text-xs text-muted-foreground">Auto-play</div>
                      </div>
                      
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {preferences.autoPlayInterval / 1000}s
                        </div>
                        <div className="text-xs text-muted-foreground">Interval</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="gap-2"
                      >
                        <RotateCw className="h-4 w-4" />
                        Reset to Defaults
                      </Button>
                      
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Reset all dashboard preferences to their default values. 
                          This will restore the original carousel mode with auto-play disabled.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}