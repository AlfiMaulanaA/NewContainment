"use client";

import React from "react";
import Link from "next/link";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Settings, 
  Users, 
  Fingerprint, 
  CreditCard,
  Activity,
  TestTube,
  ChevronRight,
  Wifi,
  WifiOff
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useMQTT } from "@/hooks/useMQTT";
import { useZKTecoDevices } from "@/hooks/useZKTecoDevices";

export default function AccessControlPage() {
  useAuthGuard(); // Protect this page
  
  const { isConnected } = useMQTT();
  const { devices, testResults } = useZKTecoDevices();

  // Calculate device statistics
  const totalDevices = devices.length;
  const enabledDevices = devices.filter(d => d.enabled).length;
  const onlineDevices = testResults.filter(r => r.status === 'online').length;
  const offlineDevices = testResults.filter(r => r.status === 'offline').length;

  // Access Control Features
  const accessControlFeatures = [
    {
      title: "Device Management",
      description: "Manage ZKTeco devices, test connections, and configure settings",
      icon: Settings,
      href: "/access-control/device",
      badge: `${totalDevices} Devices`,
      status: isConnected ? 'online' : 'offline',
      available: true
    },
    {
      title: "User Management",
      description: "Manage users, roles, and permissions across all devices",
      icon: Users,
      href: "/access-control/users",
      badge: "Coming Soon",
      status: 'pending',
      available: false
    },
    {
      title: "Biometric Management",
      description: "Register and manage fingerprints for enhanced security",
      icon: Fingerprint,
      href: "/access-control/biometric",
      badge: "Coming Soon",
      status: 'pending',
      available: false
    },
    {
      title: "Card Management",
      description: "Manage access cards and synchronize across devices",
      icon: CreditCard,
      href: "/access-control/cards",
      badge: "Coming Soon",
      status: 'pending',
      available: false
    },
    {
      title: "Live Monitoring",
      description: "Real-time attendance monitoring and access logs",
      icon: Activity,
      href: "/access-control/monitoring",
      badge: "Real-time",
      status: isConnected ? 'online' : 'offline',
      available: false
    },
    {
      title: "Connection Testing",
      description: "Test device connectivity and system diagnostics",
      icon: TestTube,
      href: "/access-control/testing",
      badge: "Diagnostic",
      status: isConnected ? 'online' : 'offline',
      available: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access Control System</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {/* MQTT Status */}
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                MQTT Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                MQTT Disconnected
              </>
            )}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* System Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {enabledDevices} enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{onlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                Active connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline Devices</CardTitle>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MQTT Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time communication
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Access Control Features</h2>
          <p className="text-muted-foreground mb-6">
            Manage your ZKTeco access control system with comprehensive tools for device management, 
            user administration, and real-time monitoring.
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessControlFeatures.map((feature) => {
              const Icon = feature.icon;
              
              return (
                <Card 
                  key={feature.title}
                  className={`relative transition-all hover:shadow-md ${
                    !feature.available ? 'opacity-60' : 'hover:scale-[1.02]'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        <div 
                          className={`w-2 h-2 rounded-full ${getStatusColor(feature.status)}`}
                          title={`Status: ${feature.status}`}
                        />
                        
                        {/* Badge */}
                        <Badge 
                          variant={feature.available ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {feature.badge}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardDescription className="mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {feature.available ? (
                      <Link href={feature.href}>
                        <Button variant="outline" className="w-full group">
                          Access Feature
                          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts for system management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <Link href="/access-control/device">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Devices
                </Button>
              </Link>
              
              <Button variant="outline" disabled className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              
              <Button variant="outline" disabled className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                View Live Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}