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
  Grid2X2,
  Palette
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

      <div className="flex-1">
        {/* Enhanced Tab Navigation */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
              <p className="text-muted-foreground text-lg">Manage your system preferences, dashboard layout, and monitoring options.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full flex-wrap h-auto p-1">
                <TabsTrigger value="system" className="flex items-center gap-2 text-xs sm:text-sm flex-1 min-w-0">
                  <Terminal className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                  <span className="sm:hidden">Sys</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs sm:text-sm flex-1 min-w-0">
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </TabsTrigger>
                <TabsTrigger value="cctv" className="flex items-center gap-2 text-xs sm:text-sm flex-1 min-w-0">
                  <MonitorPlay className="h-4 w-4" />
                  <span>CCTV</span>
                </TabsTrigger>
                <TabsTrigger value="autorefresh" className="flex items-center gap-2 text-xs sm:text-sm flex-1 min-w-0">
                  <RotateCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto Refresh</span>
                  <span className="sm:hidden">Refresh</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="mt-8">
                <TabsContent value="system" className="space-y-8">
                  {/* Theme Settings Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-blue-500/10">
                        {theme === "dark" ? (
                          <Moon className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Sun className="h-6 w-6 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Appearance Settings</h3>
                        <p className="text-sm text-muted-foreground">Customize your visual experience and interface preferences</p>
                      </div>
                    </div>

                    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                          <Palette className="h-5 w-5 text-primary" />
                          <span className="text-lg font-semibold">Theme Mode</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <Label className="text-base font-semibold">Current Theme</Label>
                              <Badge variant="secondary" className="text-xs px-3 py-1">
                                {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              Choose your preferred color scheme. System theme follows your OS preference.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border">
                            <Button
                              variant={theme === "light" ? "default" : "ghost"}
                              size="sm"
                              className="gap-2 rounded-lg px-4 transition-all hover:scale-105"
                              onClick={() => handleThemeChange("light")}
                            >
                              <Sun className="h-4 w-4" />
                              <span className="hidden sm:inline">Light</span>
                            </Button>
                            <Button
                              variant={theme === "dark" ? "default" : "ghost"}
                              size="sm"
                              className="gap-2 rounded-lg px-4 transition-all hover:scale-105"
                              onClick={() => handleThemeChange("dark")}
                            >
                              <Moon className="h-4 w-4" />
                              <span className="hidden sm:inline">Dark</span>
                            </Button>
                            <Button
                              variant={theme === "system" ? "default" : "ghost"}
                              size="sm"
                              className="gap-2 rounded-lg px-4 transition-all hover:scale-105"
                              onClick={() => handleThemeChange("system")}
                            >
                              <Monitor className="h-4 w-4" />
                              <span className="hidden sm:inline">Auto</span>
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl">
                          <div className="flex items-center justify-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                              {theme === "dark" ? (
                                <Moon className="h-6 w-6 text-primary" />
                              ) : theme === "light" ? (
                                <Sun className="h-6 w-6 text-primary" />
                              ) : (
                                <Monitor className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-primary mb-1">
                                {theme === "system" ? "System Default" : theme === "dark" ? "Dark Mode" : "Light Mode"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Active theme • Changes apply instantly
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

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

          <TabsContent value="dashboard" className="space-y-8">
            {!isLoaded ? (
              <div className="space-y-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Dashboard Layout Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                      <Layout className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Dashboard Layout</h3>
                      <p className="text-sm text-muted-foreground">Choose your preferred dashboard theme and layout style</p>
                    </div>
                  </div>

                  <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <Grid3X3 className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Layout Themes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                        <Label className="text-base font-semibold">Active Theme:</Label>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {preferences.selectedDashboardLayout}
                        </Badge>
                        <div className="ml-auto text-sm text-muted-foreground">
                          Click any theme to apply
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                            preferences.selectedDashboardLayout === 'dashboard-1'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-1')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-all duration-300 ${
                              preferences.selectedDashboardLayout === 'dashboard-1'
                                ? 'bg-primary/20 shadow-lg'
                                : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                            }`}>
                              <Layout className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-bold text-lg">Classic Layout</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Traditional sidebar navigation with clean, organized structure perfect for detailed monitoring
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-1' && (
                            <div className="absolute -top-3 -right-3">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  Active
                                </span>
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                            preferences.selectedDashboardLayout === 'dashboard-2'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-2')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-all duration-300 ${
                              preferences.selectedDashboardLayout === 'dashboard-2'
                                ? 'bg-primary/20 shadow-lg'
                                : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                            }`}>
                              <Grid3X3 className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-bold text-lg">Grid Layout</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Balanced grid system with optimized spacing for maximum information density
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-2' && (
                            <div className="absolute -top-3 -right-3">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  Active
                                </span>
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div
                          className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                            preferences.selectedDashboardLayout === 'dashboard-3'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                          }`}
                          onClick={() => setDashboardLayout('dashboard-3')}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-xl transition-all duration-300 ${
                              preferences.selectedDashboardLayout === 'dashboard-3'
                                ? 'bg-primary/20 shadow-lg'
                                : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                            }`}>
                              <Monitor className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="font-bold text-lg">Compact Layout</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Space-efficient design for high-density monitoring with minimal wasted space
                              </p>
                            </div>
                          </div>
                          {preferences.selectedDashboardLayout === 'dashboard-3' && (
                            <div className="absolute -top-3 -right-3">
                              <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  Active
                                </span>
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

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

                <TabsContent value="cctv" className="space-y-8">
                  {!isLoaded ? (
                    <div className="space-y-6">
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="h-40 bg-gray-200 rounded-xl"></div>
                          <div className="h-40 bg-gray-200 rounded-xl"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* CCTV Overview Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-blue-500/10">
                            <MonitorPlay className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">CCTV Monitoring</h3>
                            <p className="text-sm text-muted-foreground">Configure camera monitoring and display preferences</p>
                          </div>
                        </div>

                        {/* CCTV Status Overview */}
                        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3">
                              <Eye className="h-5 w-5 text-primary" />
                              <span className="text-lg font-semibold">Monitoring Status</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className={`p-4 rounded-xl border-2 transition-all ${
                                preferences.cctvSettings.enabled
                                  ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30'
                                  : 'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/50 dark:to-gray-900/30'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    preferences.cctvSettings.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'
                                  }`}>
                                    {preferences.cctvSettings.enabled ? (
                                      <Eye className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <EyeOff className="h-5 w-5 text-gray-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">CCTV Monitoring</div>
                                    <div className={`text-xs font-medium ${
                                      preferences.cctvSettings.enabled ? 'text-green-700 dark:text-green-300' : 'text-gray-600'
                                    }`}>
                                      {preferences.cctvSettings.enabled ? 'Active' : 'Inactive'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Grid className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">Grid Layout</div>
                                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                      {preferences.cctvSettings.gridLayout}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <RotateCw className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">Auto Refresh</div>
                                    <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                      {preferences.cctvSettings.autoRefresh
                                        ? `${preferences.cctvSettings.refreshInterval}s`
                                        : 'Disabled'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Play className="h-5 w-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">Auto Switch</div>
                                    <div className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                      {preferences.cctvSettings.autoSwitchChannels
                                        ? `${preferences.cctvSettings.channelSwitchInterval}s`
                                        : 'Manual'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* CCTV Basic Settings */}
                        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3">
                              <Settings className="h-5 w-5 text-primary" />
                              <span className="text-lg font-semibold">Basic Configuration</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                              <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3">
                                  <Label className="text-base font-semibold">CCTV Monitoring</Label>
                                  <Badge variant={preferences.cctvSettings.enabled ? "default" : "secondary"} className="text-xs px-3 py-1">
                                    {preferences.cctvSettings.enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  Enable or disable CCTV monitoring component in your dashboard. When disabled, CCTV feeds won't be displayed.
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={preferences.cctvSettings.enabled}
                                  onCheckedChange={toggleCctvEnabled}
                                  className="scale-110"
                                />
                              </div>
                            </div>

                            {preferences.cctvSettings.enabled && (
                              <>
                                <Separator />
                                <div className="space-y-6">
                                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                    <div className="space-y-3 flex-1">
                                      <div className="flex items-center gap-3">
                                        <Label className="text-base font-semibold">Auto Refresh</Label>
                                        {preferences.cctvSettings.autoRefresh && (
                                          <Badge variant="default" className="text-xs px-3 py-1">Active</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground leading-relaxed">
                                        Automatically refresh CCTV camera feeds at regular intervals to ensure live monitoring.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Switch
                                        checked={preferences.cctvSettings.autoRefresh}
                                        onCheckedChange={toggleCctvAutoRefresh}
                                        className="scale-110"
                                      />
                                    </div>
                                  </div>

                                  {preferences.cctvSettings.autoRefresh && (
                                    <div className="ml-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                                      <div className="space-y-3">
                                        <Label className="text-sm font-medium">Refresh Interval</Label>
                                        <Select
                                          value={preferences.cctvSettings.refreshInterval.toString()}
                                          onValueChange={(value) => updateCctvSettings({ refreshInterval: parseInt(value) })}
                                        >
                                          <SelectTrigger className="w-full max-w-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="10">10 seconds</SelectItem>
                                            <SelectItem value="30">30 seconds</SelectItem>
                                            <SelectItem value="60">1 minute</SelectItem>
                                            <SelectItem value="300">5 minutes</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                          How often camera feeds should refresh automatically
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {preferences.cctvSettings.enabled && (
                        <>
                          {/* CCTV Layout Settings */}
                          <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-3">
                                <Grid2X2 className="h-5 w-5 text-primary" />
                                <span className="text-lg font-semibold">Display Configuration</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                                  <Label className="text-base font-semibold">Current Layout:</Label>
                                  <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {preferences.cctvSettings.gridLayout}
                                  </Badge>
                                  <div className="ml-auto text-sm text-muted-foreground">
                                    Choose your preferred camera grid
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  <div
                                    className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                                      preferences.cctvSettings.gridLayout === '2x2'
                                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                                    }`}
                                    onClick={() => updateCctvSettings({ gridLayout: '2x2' })}
                                  >
                                    <div className="flex flex-col items-center gap-4">
                                      <div className={`p-4 rounded-xl transition-all duration-300 ${
                                        preferences.cctvSettings.gridLayout === '2x2'
                                          ? 'bg-primary/20 shadow-lg'
                                          : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                                      }`}>
                                        <Grid2X2 className="h-10 w-10 text-primary" />
                                      </div>
                                      <div className="text-center space-y-2">
                                        <h4 className="font-bold text-lg">2×2 Grid</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          Compact 4-camera layout perfect for essential monitoring
                                        </p>
                                      </div>
                                    </div>
                                    {preferences.cctvSettings.gridLayout === '2x2' && (
                                      <div className="absolute -top-3 -right-3">
                                        <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                            Active
                                          </span>
                                        </Badge>
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                                      preferences.cctvSettings.gridLayout === '3x3'
                                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                                    }`}
                                    onClick={() => updateCctvSettings({ gridLayout: '3x3' })}
                                  >
                                    <div className="flex flex-col items-center gap-4">
                                      <div className={`p-4 rounded-xl transition-all duration-300 ${
                                        preferences.cctvSettings.gridLayout === '3x3'
                                          ? 'bg-primary/20 shadow-lg'
                                          : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                                      }`}>
                                        <Grid3X3 className="h-10 w-10 text-primary" />
                                      </div>
                                      <div className="text-center space-y-2">
                                        <h4 className="font-bold text-lg">3×3 Grid</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          Balanced 9-camera layout for comprehensive coverage
                                        </p>
                                      </div>
                                    </div>
                                    {preferences.cctvSettings.gridLayout === '3x3' && (
                                      <div className="absolute -top-3 -right-3">
                                        <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                            Active
                                          </span>
                                        </Badge>
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
                                      preferences.cctvSettings.gridLayout === '4x4'
                                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl transform scale-105 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:shadow-md hover:transform hover:scale-102'
                                    }`}
                                    onClick={() => updateCctvSettings({ gridLayout: '4x4' })}
                                  >
                                    <div className="flex flex-col items-center gap-4">
                                      <div className={`p-4 rounded-xl transition-all duration-300 ${
                                        preferences.cctvSettings.gridLayout === '4x4'
                                          ? 'bg-primary/20 shadow-lg'
                                          : 'bg-muted group-hover:bg-primary/10 group-hover:shadow-md'
                                      }`}>
                                        <Grid className="h-10 w-10 text-primary" />
                                      </div>
                                      <div className="text-center space-y-2">
                                        <h4 className="font-bold text-lg">4×4 Grid</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          Maximum 16-camera layout for extensive surveillance
                                        </p>
                                      </div>
                                    </div>
                                    {preferences.cctvSettings.gridLayout === '4x4' && (
                                      <div className="absolute -top-3 -right-3">
                                        <Badge variant="default" className="text-xs px-3 py-1 shadow-lg animate-pulse">
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                            Active
                                          </span>
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-6">
                                <h4 className="text-base font-semibold">Display Options</h4>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border rounded-lg">
                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center gap-3">
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium">Camera Titles</Label>
                                        {preferences.cctvSettings.showTitles && (
                                          <Badge variant="default" className="text-xs">Visible</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        Show camera names and labels on video feeds
                                      </p>
                                    </div>
                                    <Switch
                                      checked={preferences.cctvSettings.showTitles}
                                      onCheckedChange={(checked) => updateCctvSettings({ showTitles: checked })}
                                      className="scale-110"
                                    />
                                  </div>

                                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border rounded-lg">
                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center gap-3">
                                        <RotateCw className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium">Auto Channel Switch</Label>
                                        {preferences.cctvSettings.autoSwitchChannels && (
                                          <Badge variant="default" className="text-xs">Active</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        Automatically cycle through camera channels
                                      </p>
                                    </div>
                                    <Switch
                                      checked={preferences.cctvSettings.autoSwitchChannels}
                                      onCheckedChange={toggleCctvAutoSwitch}
                                      className="scale-110"
                                    />
                                  </div>
                                </div>

                                {preferences.cctvSettings.autoSwitchChannels && (
                                  <div className="ml-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium">Channel Switch Interval</Label>
                                      <Select
                                        value={preferences.cctvSettings.channelSwitchInterval.toString()}
                                        onValueChange={(value) => updateCctvSettings({ channelSwitchInterval: parseInt(value) })}
                                      >
                                        <SelectTrigger className="w-full max-w-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="5">5 seconds</SelectItem>
                                          <SelectItem value="10">10 seconds</SelectItem>
                                          <SelectItem value="15">15 seconds</SelectItem>
                                          <SelectItem value="30">30 seconds</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <p className="text-xs text-muted-foreground">
                                        Time between automatic camera channel switches
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
              </>
            )}
                </TabsContent>

                <TabsContent value="autorefresh" className="space-y-8">
                  {/* Auto Refresh Overview Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                        <RotateCw className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Auto Refresh Configuration</h3>
                        <p className="text-sm text-muted-foreground">Configure automatic page refresh to keep your dashboard data current</p>
                      </div>
                    </div>

                    {/* Auto Refresh Control Card */}
                    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                          <RotateCw className="h-5 w-5 text-primary" />
                          <span className="text-lg font-semibold">Refresh Control</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-semibold text-sm">Automatic Page Refresh</div>
                              <div className="text-xs text-muted-foreground">Keep your dashboard data fresh and up-to-date</div>
                            </div>
                          </div>

                          <div className="p-6 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-gradient-to-br from-muted/10 to-muted/5">
                            <div className="flex items-center justify-center gap-4 mb-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <RotateCw className="h-6 w-6 text-primary" />
                              </div>
                              <div className="text-center">
                                <h4 className="font-semibold text-lg">Auto Refresh Component</h4>
                                <p className="text-sm text-muted-foreground">Interactive control panel below</p>
                              </div>
                            </div>
                            <AutoRefresh
                              defaultEnabled={false}
                              className="justify-center"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Information Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* How It Works Card */}
                      <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-lg font-semibold text-blue-900 dark:text-blue-100">How It Works</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">1</span>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                Toggle the switch to enable/disable automatic page refresh
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">2</span>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                Choose refresh intervals from 1 minute to 30 minutes
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">3</span>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                Monitor the countdown timer showing time until next refresh
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">4</span>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                Use manual refresh button for immediate updates when needed
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Benefits Card */}
                      <Card className="shadow-sm border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <BatteryCharging className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="text-lg font-semibold text-green-900 dark:text-green-100">Key Benefits</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-500/20 rounded flex-shrink-0 mt-0.5">
                                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              </div>
                              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                Always see the latest data without manual page refreshes
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-500/20 rounded flex-shrink-0 mt-0.5">
                                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              </div>
                              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                Configurable intervals to match your monitoring requirements
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-500/20 rounded flex-shrink-0 mt-0.5">
                                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              </div>
                              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                Reduces manual interaction and improves workflow efficiency
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-500/20 rounded flex-shrink-0 mt-0.5">
                                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              </div>
                              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                Helps maintain real-time awareness of system status changes
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Usage Tips Card */}
                    <Card className="shadow-sm border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/30">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Settings className="h-5 w-5 text-amber-600" />
                          </div>
                          <span className="text-lg font-semibold text-amber-900 dark:text-amber-100">Usage Recommendations</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h5 className="font-semibold text-amber-800 dark:text-amber-200">Recommended Intervals</h5>
                            <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                              <p>• <strong>1-2 minutes:</strong> Critical monitoring systems</p>
                              <p>• <strong>5 minutes:</strong> General dashboard monitoring</p>
                              <p>• <strong>10-15 minutes:</strong> Low-priority data updates</p>
                              <p>• <strong>30 minutes:</strong> Static or rarely changing data</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="font-semibold text-amber-800 dark:text-amber-200">Best Practices</h5>
                            <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                              <p>• Balance refresh frequency with system performance</p>
                              <p>• Consider network bandwidth and server load</p>
                              <p>• Use shorter intervals for time-sensitive operations</p>
                              <p>• Monitor resource usage when enabling auto-refresh</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
