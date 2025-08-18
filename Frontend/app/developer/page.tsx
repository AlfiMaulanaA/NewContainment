"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code, 
  Settings, 
  Monitor, 
  Database, 
  Wifi, 
  Clock,
  Shield,
  Zap,
  Activity,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Unlock,
  Lock,
  Timer
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useDeveloperMode, DEVELOPER_MODE_CONFIG } from "@/contexts/DeveloperModeContext";
import { DeveloperModeDialog } from "@/components/developer-mode-dialog";

function DeveloperPageContent() {
  const { 
    isDeveloperMode, 
    isLoading,
    getFormattedRemainingTime,
    disableDeveloperMode,
    refreshDeveloperMode
  } = useDeveloperMode();

  const [remainingTime, setRemainingTime] = useState("");

  useEffect(() => {
    // Update remaining time every second
    const updateTime = () => {
      setRemainingTime(getFormattedRemainingTime());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [getFormattedRemainingTime, isDeveloperMode]);

  if (isLoading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Developer Mode</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Developer Mode</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={isDeveloperMode ? "default" : "secondary"}>
            {isDeveloperMode ? "Active" : "Inactive"}
          </Badge>
          {!isDeveloperMode && (
            <DeveloperModeDialog>
              <Button size="sm">
                <Unlock className="h-4 w-4 mr-2" />
                Enable
              </Button>
            </DeveloperModeDialog>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {isDeveloperMode ? (
                <Unlock className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4 text-gray-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isDeveloperMode ? "Enabled" : "Disabled"}
              </div>
              <p className="text-xs text-muted-foreground">
                Developer mode access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
              <Timer className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isDeveloperMode ? remainingTime : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-expires in 5 minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Features</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEVELOPER_MODE_CONFIG.features.length}</div>
              <p className="text-xs text-muted-foreground">
                Available features
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Developer Mode Overview</CardTitle>
                <CardDescription>
                  Access advanced development and debugging features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDeveloperMode ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Developer Mode is currently active. You have access to all advanced features including 
                      the Access Control System, ZKTeco device integration, and enhanced monitoring tools.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Developer Mode is disabled. Enable it to access advanced features and development tools.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Session Status:</span>
                        <Badge variant={isDeveloperMode ? "default" : "secondary"}>
                          {isDeveloperMode ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Auto-Expire:</span>
                        <span className="text-sm">5 minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Available Features:</span>
                        <span className="text-sm">{DEVELOPER_MODE_CONFIG.features.length}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Password Protection:</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Session Expiry:</span>
                        <Badge variant="outline">Auto</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Access Level:</span>
                        <Badge variant="outline">Advanced</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEVELOPER_MODE_CONFIG.features.map((feature) => (
                <Card key={feature.id} className={`transition-all hover:shadow-md ${!isDeveloperMode ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      {feature.name}
                      {isDeveloperMode && (
                        <Link href={feature.route}>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isDeveloperMode ? (
                      <Link href={feature.route}>
                        <Button variant="outline" className="w-full">
                          Access Feature
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Enable Developer Mode
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Development Tools</CardTitle>
                <CardDescription>
                  Utilities and tools for development and debugging
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => {
                      refreshDeveloperMode();
                      toast.success('Developer mode status refreshed');
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4" />
                      <span className="font-medium">Refresh Status</span>
                    </div>
                    <span className="text-sm text-muted-foreground text-left">
                      Refresh developer mode status and check expiry
                    </span>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Developer page URL copied');
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4" />
                      <span className="font-medium">Copy Page URL</span>
                    </div>
                    <span className="text-sm text-muted-foreground text-left">
                      Copy the developer page URL to clipboard
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Developer Mode Settings</CardTitle>
                <CardDescription>
                  Manage your developer mode session and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Developer Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      {isDeveloperMode ? 
                        `Active - Expires in ${remainingTime}` : 
                        'Currently disabled'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!isDeveloperMode ? (
                      <DeveloperModeDialog>
                        <Button>
                          <Unlock className="h-4 w-4 mr-2" />
                          Enable
                        </Button>
                      </DeveloperModeDialog>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          disableDeveloperMode();
                          toast.success('Developer Mode disabled');
                        }}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Disable
                      </Button>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Notice:</strong> Developer Mode provides access to sensitive system 
                    features. Sessions automatically expire after 5 minutes for security purposes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}

// Dynamic import to avoid SSR issues
const DeveloperPageClientOnly = dynamic(() => Promise.resolve(DeveloperPageContent), {
  ssr: false,
  loading: () => (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Developer Mode</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
});

export default function DeveloperPage() {
  return <DeveloperPageClientOnly />;
}