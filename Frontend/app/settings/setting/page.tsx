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
  Layout,
  Grid3X3,
  Eye,
  EyeOff,
  MonitorPlay,
  Grid2X2
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
import { AutoRefresh } from "@/components/AutoRefresh";
// Virtual keyboard settings removed - using react-simple-keyboard library instead

import Swal from "sweetalert2";

// MQTT-related imports are removed
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

// Import API service
import { systemInfoApi, type SystemStatusInfo } from "@/lib/api-service";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "system"
  );
  const [systemInfo, setSystemInfo] = useState<SystemStatusInfo | null>(null);
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
    resetPreferences,
    setDashboardLayout,
    setDisplayType,
    setCarouselMode,
    setCarouselInterval,
    updateCctvSettings,
    toggleCctvEnabled,
    toggleCctvAutoRefresh,
    toggleCctvAutoSwitch
  } = useDashboardPreferences();

  // Function to fetch system info
  const fetchSystemInfo = useCallback(async () => {
    setIsLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const response = await systemInfoApi.getSystemStatusInfo();
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
      const response = await systemInfoApi.refreshSystemStatusInfo();
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="system">System Settings</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard Settings</TabsTrigger>
            <TabsTrigger value="cctv">CCTV Settings</TabsTrigger>
            <TabsTrigger value="keyboard">Virtual Keyboard</TabsTrigger>
            <TabsTrigger value="autorefresh">Auto Refresh</TabsTrigger>
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
                {/* Dashboard Layout Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5" />
                      Dashboard Layout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-medium">Select Dashboard Theme</Label>
                        <Badge variant="secondary" className="text-xs">
                          {preferences.selectedDashboardLayout}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                          className={`relative cursor-pointer rounded-lg border-2 p-4 ${
                            preferences.selectedDashboardLayout === 'dashboard-1'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-1')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Layout className="h-8 w-8 text-primary" />
                            <h4 className="font-medium">Dashboard 1</h4>
                            <p className="text-xs text-muted-foreground text-center">
                              Classic layout with sidebar navigation
                            </p>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-1' && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="text-xs">Active</Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`relative cursor-pointer rounded-lg border-2 p-4 ${
                            preferences.selectedDashboardLayout === 'dashboard-2'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-2')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Grid3X3 className="h-8 w-8 text-primary" />
                            <h4 className="font-medium">Dashboard 2</h4>
                            <p className="text-xs text-muted-foreground text-center">
                              Grid layout with balanced sections
                            </p>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-2' && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="text-xs">Active</Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`relative cursor-pointer rounded-lg border-2 p-4 ${
                            preferences.selectedDashboardLayout === 'dashboard-3'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-3')}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Monitor className="h-8 w-8 text-primary" />
                            <h4 className="font-medium">Dashboard 3</h4>
                            <p className="text-xs text-muted-foreground text-center">
                              Compact layout for maximum density
                            </p>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-3' && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="text-xs">Active</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Display Type Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Display Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {preferences.displayType === 'scroll' ? (
                            <List className="h-4 w-4 text-primary" />
                          ) : (
                            <Grid className="h-4 w-4 text-primary" />
                          )}
                          <Label className="text-base font-medium">
                            View Mode
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {preferences.displayType === 'scroll' ? 'Scroll' : 'Carousel'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {preferences.displayType === 'scroll'
                            ? "Show all dashboards in a scrollable list"
                            : "Show one dashboard at a time with navigation controls"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={preferences.displayType === 'scroll' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDisplayType('scroll')}
                          className="gap-2"
                        >
                          <List className="h-4 w-4" />
                          Scroll
                        </Button>
                        <Button
                          variant={preferences.displayType === 'carousel' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDisplayType('carousel')}
                          className="gap-2"
                        >
                          <Grid className="h-4 w-4" />
                          Carousel
                        </Button>
                      </div>
                    </div>

                    {preferences.displayType === 'carousel' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Carousel Settings</h4>

                          {/* Carousel Mode */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {preferences.carouselMode === 'automatic' ? (
                                  <Play className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Pause className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Label className="text-sm font-medium">
                                  Carousel Mode
                                </Label>
                                <Badge variant="secondary" className="text-xs">
                                  {preferences.carouselMode === 'automatic' ? 'Automatic' : 'Manual'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {preferences.carouselMode === 'automatic'
                                  ? "Automatically advance to the next dashboard"
                                  : "Manual navigation only"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant={preferences.carouselMode === 'manual' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCarouselMode('manual')}
                                className="gap-2"
                              >
                                <Pause className="h-4 w-4" />
                                Manual
                              </Button>
                              <Button
                                variant={preferences.carouselMode === 'automatic' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCarouselMode('automatic')}
                                className="gap-2"
                              >
                                <Play className="h-4 w-4" />
                                Auto
                              </Button>
                            </div>
                          </div>

                          {/* Carousel Interval Setting */}
                          {preferences.carouselMode === 'automatic' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Section Switch Interval
                              </Label>
                              <Select
                                value={preferences.carouselInterval.toString()}
                                onValueChange={(value) => {
                                  setCarouselInterval(parseInt(value));
                                  toast.success("Carousel interval updated");
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 seconds</SelectItem>
                                  <SelectItem value="5">5 seconds</SelectItem>
                                  <SelectItem value="8">8 seconds</SelectItem>
                                  <SelectItem value="10">10 seconds</SelectItem>
                                  <SelectItem value="15">15 seconds</SelectItem>
                                  <SelectItem value="30">30 seconds</SelectItem>
                                  <SelectItem value="60">1 minute</SelectItem>
                                  <SelectItem value="300">5 minutes</SelectItem>
                                  <SelectItem value="600">10 minutes</SelectItem>
                                  <SelectItem value="900">15 minutes</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Time between automatic section transitions
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
                          {preferences.carouselMode === 'automatic'
                            ? preferences.carouselInterval >= 60
                              ? `${Math.floor(preferences.carouselInterval / 60)}m`
                              : `${preferences.carouselInterval}s`
                            : "Manual"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Section Interval
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

          <TabsContent value="cctv" className="space-y-6">
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
                {/* CCTV Basic Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MonitorPlay className="h-5 w-5" />
                      CCTV Basic Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {preferences.cctvSettings.enabled ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Label className="text-base font-medium">
                            Enable CCTV Monitoring
                          </Label>
                          <Badge variant={preferences.cctvSettings.enabled ? "default" : "secondary"} className="text-xs">
                            {preferences.cctvSettings.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Show CCTV monitoring component in dashboard
                        </p>
                      </div>
                      <Switch
                        checked={preferences.cctvSettings.enabled}
                        onCheckedChange={toggleCctvEnabled}
                      />
                    </div>

                    {preferences.cctvSettings.enabled && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <RotateCw className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm font-medium">
                                  Auto Refresh
                                </Label>
                                {preferences.cctvSettings.autoRefresh && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Automatically refresh CCTV feeds
                              </p>
                            </div>
                            <Switch
                              checked={preferences.cctvSettings.autoRefresh}
                              onCheckedChange={toggleCctvAutoRefresh}
                            />
                          </div>

                          {preferences.cctvSettings.autoRefresh && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Refresh Interval (seconds)
                              </Label>
                              <Select
                                value={preferences.cctvSettings.refreshInterval.toString()}
                                onValueChange={(value) => updateCctvSettings({ refreshInterval: parseInt(value) })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10 seconds</SelectItem>
                                  <SelectItem value="30">30 seconds</SelectItem>
                                  <SelectItem value="60">1 minute</SelectItem>
                                  <SelectItem value="300">5 minutes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {preferences.cctvSettings.enabled && (
                  <>
                    {/* CCTV Layout Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Grid2X2 className="h-5 w-5" />
                          CCTV Layout Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium">Grid Layout</Label>
                            <Badge variant="secondary" className="text-xs">
                              {preferences.cctvSettings.gridLayout}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div
                              className={`cursor-pointer rounded-lg border-2 p-4 ${
                                preferences.cctvSettings.gridLayout === '2x2'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => updateCctvSettings({ gridLayout: '2x2' })}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Grid2X2 className="h-8 w-8 text-primary" />
                                <h4 className="font-medium">2x2 Grid</h4>
                                <p className="text-xs text-muted-foreground text-center">
                                  4 cameras in a 2x2 layout
                                </p>
                              </div>
                            </div>

                            <div
                              className={`cursor-pointer rounded-lg border-2 p-4 ${
                                preferences.cctvSettings.gridLayout === '3x3'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => updateCctvSettings({ gridLayout: '3x3' })}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Grid3X3 className="h-8 w-8 text-primary" />
                                <h4 className="font-medium">3x3 Grid</h4>
                                <p className="text-xs text-muted-foreground text-center">
                                  9 cameras in a 3x3 layout
                                </p>
                              </div>
                            </div>

                            <div
                              className={`cursor-pointer rounded-lg border-2 p-4 ${
                                preferences.cctvSettings.gridLayout === '4x4'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => updateCctvSettings({ gridLayout: '4x4' })}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Grid className="h-8 w-8 text-primary" />
                                <h4 className="font-medium">4x4 Grid</h4>
                                <p className="text-xs text-muted-foreground text-center">
                                  16 cameras in a 4x4 layout
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm font-medium">
                                  Show Camera Titles
                                </Label>
                                {preferences.cctvSettings.showTitles && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Display camera names on feeds
                              </p>
                            </div>
                            <Switch
                              checked={preferences.cctvSettings.showTitles}
                              onCheckedChange={(checked) => updateCctvSettings({ showTitles: checked })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <RotateCw className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm font-medium">
                                  Auto Switch Channels
                                </Label>
                                {preferences.cctvSettings.autoSwitchChannels && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Automatically cycle through camera channels
                              </p>
                            </div>
                            <Switch
                              checked={preferences.cctvSettings.autoSwitchChannels}
                              onCheckedChange={toggleCctvAutoSwitch}
                            />
                          </div>

                          {preferences.cctvSettings.autoSwitchChannels && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Channel Switch Interval (seconds)
                              </Label>
                              <Select
                                value={preferences.cctvSettings.channelSwitchInterval.toString()}
                                onValueChange={(value) => updateCctvSettings({ channelSwitchInterval: parseInt(value) })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5 seconds</SelectItem>
                                  <SelectItem value="10">10 seconds</SelectItem>
                                  <SelectItem value="15">15 seconds</SelectItem>
                                  <SelectItem value="30">30 seconds</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* CCTV Status Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>CCTV Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {preferences.cctvSettings.enabled ? "ON" : "OFF"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              CCTV Status
                            </div>
                          </div>

                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {preferences.cctvSettings.gridLayout}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Grid Layout
                            </div>
                          </div>

                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {preferences.cctvSettings.autoRefresh ? `${preferences.cctvSettings.refreshInterval}s` : "OFF"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Auto Refresh
                            </div>
                          </div>

                          <div className="text-center p-4 bg-muted/30 rounded-lg">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {preferences.cctvSettings.autoSwitchChannels ? `${preferences.cctvSettings.channelSwitchInterval}s` : "OFF"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Auto Switch
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="keyboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Virtual Keyboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Virtual keyboard functionality has been replaced with react-simple-keyboard library for better performance and reliability.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Custom virtual keyboard settings are no longer needed as the library handles keyboard management automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="autorefresh" className="space-y-6">
            {/* Auto Refresh Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCw className="h-5 w-5 text-primary" />
                  Auto Refresh Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Page Auto Refresh</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Automatically refresh the current page at specified intervals to keep data up-to-date.
                    </p>
                  </div>

                  {/* Auto Refresh Component */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-medium">Auto Refresh Control</h5>
                        <p className="text-xs text-muted-foreground">
                          Toggle auto refresh and configure refresh intervals
                        </p>
                      </div>
                    </div>
                    <AutoRefresh
                      defaultEnabled={false}
                      className="justify-start"
                    />
                  </div>

                  {/* Information Card */}
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="space-y-2">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100">
                          How Auto Refresh Works
                        </h5>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <p>• Toggle the switch to enable/disable auto refresh</p>
                          <p>• Choose refresh intervals from 1 minute to 30 minutes</p>
                          <p>• See countdown timer showing time until next refresh</p>
                          <p>• Use manual refresh button to refresh immediately</p>
                          <p>• Settings are saved automatically and persist across sessions</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Card */}
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <BatteryCharging className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="space-y-2">
                        <h5 className="font-medium text-green-900 dark:text-green-100">
                          Benefits
                        </h5>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p>• Always see the latest data without manual refresh</p>
                          <p>• Configurable intervals to match your monitoring needs</p>
                          <p>• Reduces the need to manually refresh pages</p>
                          <p>• Helps maintain awareness of system status changes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
