"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wifi,
  Power,
  Terminal,
  RotateCw,
  Settings,
  Thermometer,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Moon,
  Sun,
  BatteryCharging,
  Grid,
  List,
  Play,
  Pause,
  Monitor,
  Save,
  Loader2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
// MqttStatus component is removed
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import Swal from "sweetalert2";

// MQTT-related imports are removed
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

// Import API service
import { systemInfoApi, type SystemInfo } from "@/lib/api-service";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "system"
  );
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);
  const [systemInfoError, setSystemInfoError] = useState<string | null>(null);

  const [ipIndex, setIpIndex] = useState(0);
  const { theme, setTheme } = useTheme();
  // useMQTT hook is removed
  const {
    preferences,
    isLoaded,
    toggleCarouselMode,
    toggleAutoPlay,
    setAutoPlayInterval,
    resetPreferences, // Re-added the resetPreferences function
  } = useDashboardPreferences();

  // Function to fetch system info
  const fetchSystemInfo = useCallback(async () => {
    setIsLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const response = await systemInfoApi.getSystemInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
      } else {
        setSystemInfoError(response.message || "Failed to fetch system info");
        toast.error(response.message || "Failed to fetch system info");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSystemInfoError(errorMessage);
      toast.error("Error fetching system info: " + errorMessage);
    } finally {
      setIsLoadingSystemInfo(false);
    }
  }, []);

  // Function to refresh system info
  const refreshSystemInfo = useCallback(async () => {
    setIsLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const response = await systemInfoApi.refreshSystemInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
        toast.success("System info refreshed successfully");
      } else {
        setSystemInfoError(response.message || "Failed to refresh system info");
        toast.error(response.message || "Failed to refresh system info");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSystemInfoError(errorMessage);
      toast.error("Error refreshing system info: " + errorMessage);
    } finally {
      setIsLoadingSystemInfo(false);
    }
  }, []);

  useEffect(() => {
    // Fetch system info on component mount
    fetchSystemInfo();

    // Only handles IP address rotation
    const ipInterval = setInterval(() => setIpIndex((i) => (i + 1) % 2), 3000);

    // Auto-refresh system info every 30 seconds
    const systemInfoInterval = setInterval(fetchSystemInfo, 30000);

    return () => {
      clearInterval(ipInterval);
      clearInterval(systemInfoInterval);
    };
  }, [fetchSystemInfo]);

  const ipType = ipIndex === 0 ? "eth0" : "wlan0";
  const ipAddress = systemInfo
    ? ipIndex === 0
      ? systemInfo.eth0_ip_address
      : systemInfo.wlan0_ip_address
    : "N/A";

  const handleIntervalChange = (value: string) => {
    setAutoPlayInterval(parseInt(value));
    toast.success("Auto-play interval updated");
  };

  const handleReset = () => {
    resetPreferences();
    toast.success("Dashboard preferences reset to defaults");
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const themeLabel = newTheme === "system" ? "System Default" : newTheme === "dark" ? "Dark Mode" : "Light Mode";
    toast.success(`Theme changed to ${themeLabel}`);
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
            onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
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
            size="sm"
            className="gap-2"
            onClick={refreshSystemInfo}
            disabled={isLoadingSystemInfo}
          >
            {isLoadingSystemInfo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {isLoadingSystemInfo ? "Refreshing..." : "Refresh"}
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
            {/* Theme Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  )}
                  Theme Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="theme-mode" className="text-base font-medium">
                        Appearance Mode
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {theme === "dark" ? "Dark" : "Light"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark theme for better visibility
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleThemeChange("system")}
                    >
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-primary mb-1">
                    Current Theme: {theme === "system" ? "System Default" : theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Theme preference is saved automatically
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoadingSystemInfo && !systemInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-6 w-6 bg-gray-300 rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : systemInfoError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 mb-2">
                    <Terminal className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">
                      Failed to load system information
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {systemInfoError}
                  </p>
                  <Button
                    onClick={refreshSystemInfo}
                    disabled={isLoadingSystemInfo}
                  >
                    {isLoadingSystemInfo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCw className="h-4 w-4 mr-2" />
                    )}
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : systemInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Wifi className="h-6 w-6 text-blue-500" />
                    <div>
                      <h6 className="font-medium">IP Address</h6>
                      <p className="text-sm text-muted-foreground">
                        <strong>{ipType}:</strong> {ipAddress}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Thermometer className="h-6 w-6 text-red-500" />
                    <div>
                      <h6 className="font-medium">CPU Temp</h6>
                      <p className="text-sm text-muted-foreground">
                        {systemInfo.cpu_temp}°C
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Cpu className="h-6 w-6 text-green-700" />
                    <div>
                      <h6 className="font-medium">CPU Usage</h6>
                      <p className="text-sm text-muted-foreground">
                        {systemInfo.cpu_usage}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <MemoryStick className="h-6 w-6 text-green-600" />
                    <div>
                      <h6 className="font-medium">Memory Usage</h6>
                      <p className="text-sm text-muted-foreground">
                        {systemInfo.memory_usage}% (
                        {Math.round(systemInfo.used_memory)}/
                        {Math.round(systemInfo.total_memory)} MB)
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <HardDrive className="h-6 w-6 text-gray-600" />
                    <div>
                      <h6 className="font-medium">Disk Usage</h6>
                      <p className="text-sm text-muted-foreground">
                        {systemInfo.disk_usage}% (
                        {Math.round(systemInfo.used_disk)}/
                        {Math.round(systemInfo.total_disk)} MB)
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Clock className="h-6 w-6 text-indigo-500" />
                    <div>
                      <h6 className="font-medium">Uptime</h6>
                      <p className="text-sm text-muted-foreground">
                        {systemInfo.uptime
                          ? `${Math.floor(
                              systemInfo.uptime / 3600
                            )}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`
                          : "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {systemInfo && !systemInfo.is_available && (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <Terminal className="h-4 w-4" />
                    <p className="text-sm font-medium">
                      System monitoring partially unavailable
                    </p>
                  </div>
                  {systemInfo.error_message && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      {systemInfo.error_message}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
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
                          <Label
                            htmlFor="display-mode"
                            className="text-base font-medium"
                          >
                            Display Mode
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {preferences.isCarouselMode ? "Carousel" : "Scroll"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {preferences.isCarouselMode
                            ? "Show one component at a time with navigation controls"
                            : "Show all components in a scrollable list"}
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
                          <h4 className="text-sm font-medium">
                            Carousel Settings
                          </h4>

                          {/* Auto-play Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {preferences.autoPlayEnabled ? (
                                  <Play className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Pause className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Label
                                  htmlFor="auto-play"
                                  className="text-sm font-medium"
                                >
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
                                <Label
                                  htmlFor="interval"
                                  className="text-sm font-medium"
                                >
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
                                  <SelectItem value="5000">
                                    5 seconds
                                  </SelectItem>
                                  <SelectItem value="10000">
                                    10 seconds
                                  </SelectItem>
                                  <SelectItem value="15000">
                                    15 seconds
                                  </SelectItem>
                                  <SelectItem value="20000">
                                    20 seconds
                                  </SelectItem>
                                  <SelectItem value="30000">
                                    30 seconds
                                  </SelectItem>
                                  <SelectItem value="60000">
                                    1 minute
                                  </SelectItem>
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
                          {preferences.isCarouselMode ? "Carousel" : "Scroll"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Display Mode
                        </div>
                      </div>

                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {preferences.autoPlayEnabled ? "On" : "Off"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Auto-play
                        </div>
                      </div>

                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {preferences.autoPlayEnabled
                            ? `${preferences.autoPlayInterval / 1000}s`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Interval
                        </div>
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
                      {/* New Reset button */}
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={handleReset}
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Reset Preferences
                      </Button>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Reset all dashboard display settings to their default
                          values.
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
