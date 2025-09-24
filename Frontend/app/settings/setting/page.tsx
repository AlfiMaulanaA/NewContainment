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
      <header className="flex h-16 items-center justify-between border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">General Settings</h1>
              <p className="text-xs text-muted-foreground">Configure system preferences and dashboard options</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="h-6 w-6"
              onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 text-blue-600" />
              )}
            </Button>
            <span className="text-xs font-medium text-center select-none">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shadow-sm"
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

      <div className="flex-1 p-6 space-y-8">
        {/* Enhanced Tab Navigation */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Settings Overview</h2>
            <p className="text-sm text-muted-foreground">Manage your system preferences, dashboard layout, and monitoring options.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-auto pb-2">
              <TabsList className="inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground shadow-sm">
                <TabsTrigger
                  value="system"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                >
                  <Terminal className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                >
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger
                  value="cctv"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                >
                  <MonitorPlay className="h-4 w-4" />
                  <span className="hidden sm:inline">CCTV</span>
                </TabsTrigger>
                <TabsTrigger
                  value="autorefresh"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto Refresh</span>
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="system" className="space-y-6 mt-6">
            {/* Theme Settings Card */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-blue-500/10">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Sun className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-lg font-semibold">Theme Settings</span>
                    <p className="text-sm text-muted-foreground font-normal">Customize your visual experience</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Label htmlFor="theme-mode" className="text-base font-semibold">
                          Appearance Mode
                        </Label>
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {theme === "system" ? "Auto" : theme === "dark" ? "Dark" : "Light"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Choose your preferred color scheme for the best viewing experience
                      </p>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                      <Button
                        variant={theme === "light" ? "default" : "ghost"}
                        size="sm"
                        className="gap-2 rounded-md transition-all"
                        onClick={() => handleThemeChange("light")}
                      >
                        <Sun className="h-4 w-4" />
                        <span className="hidden sm:inline">Light</span>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "ghost"}
                        size="sm"
                        className="gap-2 rounded-md transition-all"
                        onClick={() => handleThemeChange("dark")}
                      >
                        <Moon className="h-4 w-4" />
                        <span className="hidden sm:inline">Dark</span>
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "ghost"}
                        size="sm"
                        className="gap-2 rounded-md transition-all"
                        onClick={() => handleThemeChange("system")}
                      >
                        <Monitor className="h-4 w-4" />
                        <span className="hidden sm:inline">Auto</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {theme === "dark" ? (
                        <Moon className="h-5 w-5 text-primary" />
                      ) : theme === "light" ? (
                        <Sun className="h-5 w-5 text-primary" />
                      ) : (
                        <Monitor className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-primary mb-1">
                        {theme === "system" ? "System Default" : theme === "dark" ? "Dark Mode" : "Light Mode"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active theme • Saved automatically
                      </div>
                    </div>
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-blue-900 dark:text-blue-100">Network Address</h6>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <span className="font-medium">{ipType}:</span> {ipAddress}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-red-500/10 rounded-lg">
                          <Thermometer className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-red-900 dark:text-red-100">CPU Temperature</h6>
                          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                            {systemInfo.cpu_temp}°C
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <Cpu className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-green-900 dark:text-green-100">CPU Usage</h6>
                          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                            {systemInfo.cpu_usage}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <MemoryStick className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-purple-900 dark:text-purple-100">Memory Usage</h6>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            <span className="font-medium">{systemInfo.memory_usage}%</span>
                            <span className="text-xs block">({Math.round(systemInfo.used_memory)}/{Math.round(systemInfo.total_memory)} MB)</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/50 dark:to-gray-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-gray-500/10 rounded-lg">
                          <HardDrive className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-gray-900 dark:text-gray-100">Disk Usage</h6>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{systemInfo.disk_usage}%</span>
                            <span className="text-xs block">({Math.round(systemInfo.used_disk)}/{Math.round(systemInfo.total_disk)} MB)</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 bg-indigo-500/10 rounded-lg">
                          <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-semibold text-indigo-900 dark:text-indigo-100">System Uptime</h6>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
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
                </div>
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

          <TabsContent value="dashboard" className="space-y-6 mt-6">
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
                <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                        <Layout className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">Dashboard Layout</span>
                        <p className="text-sm text-muted-foreground font-normal">Choose your preferred dashboard theme</p>
                      </div>
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                            preferences.selectedDashboardLayout === 'dashboard-1'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg transform scale-105'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-1')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-colors ${
                              preferences.selectedDashboardLayout === 'dashboard-1'
                                ? 'bg-primary/20'
                                : 'bg-muted group-hover:bg-primary/10'
                            }`}>
                              <Layout className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-semibold text-lg">Dashboard 1</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Classic layout with sidebar navigation and clean structure
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-1' && (
                            <div className="absolute -top-2 -right-2">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-md">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                  Active
                                </span>
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                            preferences.selectedDashboardLayout === 'dashboard-2'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg transform scale-105'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-2')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-colors ${
                              preferences.selectedDashboardLayout === 'dashboard-2'
                                ? 'bg-primary/20'
                                : 'bg-muted group-hover:bg-primary/10'
                            }`}>
                              <Grid3X3 className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-semibold text-lg">Dashboard 2</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Grid layout with balanced sections and optimized spacing
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-2' && (
                            <div className="absolute -top-2 -right-2">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-md">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                  Active
                                </span>
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                            preferences.selectedDashboardLayout === 'dashboard-3'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg transform scale-105'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-3')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-colors ${
                              preferences.selectedDashboardLayout === 'dashboard-3'
                                ? 'bg-primary/20'
                                : 'bg-muted group-hover:bg-primary/10'
                            }`}>
                              <Monitor className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-semibold text-lg">Dashboard 3</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Compact layout for maximum density and information
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-3' && (
                            <div className="absolute -top-2 -right-2">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-md">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                  Active
                                </span>
                              </Badge>
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
                <Card className="shadow-sm border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Monitor className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">Dashboard Status</span>
                        <p className="text-sm text-muted-foreground font-normal">Current configuration overview</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500/10 rounded-lg">
                            {preferences.isCarouselMode ? (
                              <Grid className="h-6 w-6 text-blue-600" />
                            ) : (
                              <List className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                              {preferences.isCarouselMode ? "Carousel" : "Scroll"}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                              Display Mode
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-500/10 rounded-lg">
                            {preferences.autoPlayEnabled ? (
                              <Play className="h-6 w-6 text-purple-600" />
                            ) : (
                              <Pause className="h-6 w-6 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                              {preferences.autoPlayEnabled ? "Enabled" : "Disabled"}
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                              Auto-play
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-500/10 rounded-lg">
                            <Clock className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                              {preferences.carouselMode === 'automatic'
                                ? preferences.carouselInterval >= 60
                                  ? `${Math.floor(preferences.carouselInterval / 60)}m`
                                  : `${preferences.carouselInterval}s`
                                : "Manual"}
                            </div>
                            <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                              Section Interval
                            </div>
                          </div>
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

          <TabsContent value="cctv" className="space-y-6 mt-6">
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
                <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10">
                        <MonitorPlay className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">CCTV Basic Settings</span>
                        <p className="text-sm text-muted-foreground font-normal">Configure CCTV monitoring preferences</p>
                      </div>
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


          <TabsContent value="autorefresh" className="space-y-6 mt-6">
            {/* Auto Refresh Settings Card */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                    <RotateCw className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold">Auto Refresh Settings</span>
                    <p className="text-sm text-muted-foreground font-normal">Configure automatic page refresh intervals</p>
                  </div>
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
      </div>
    </SidebarInset>
  );
}
