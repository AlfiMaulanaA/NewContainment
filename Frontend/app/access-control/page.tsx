"use client";

import React, { useState, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserCheck, 
  Activity,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  AccessControlDevice,
  accessControlApi 
} from '@/lib/api-service';
import { DeveloperModeGuard } from '@/components/developer-mode-guard';

export default function AccessControlOverviewPage() {
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const result = await accessControlApi.getDevices();
      
      if (result.success && result.data) {
        setDevices(result.data);
      } else {
        toast.error('Failed to load access control devices');
      }
    } catch (error) {
      toast.error('Error loading devices');
    } finally {
      setIsLoading(false);
    }
  };

  const connectedDevices = devices.filter(d => d.isConnected);
  const enabledDevices = devices.filter(d => d.enabled);

  const menuItems = [
    {
      title: "Device Management",
      description: "Manage ZKTeco access control devices",
      icon: Shield,
      href: "/access-control/devices",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "User Management",
      description: "Create and manage access control users",
      icon: UserCheck,
      href: "/access-control/users",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      title: "Live Monitoring",
      description: "Real-time attendance and access monitoring",
      icon: Activity,
      href: "/access-control/monitoring",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    }
  ];

  return (
    <DeveloperModeGuard>
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access Control System</h1>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={loadDevices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">ZKTeco access control management dashboard</p>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">Registered access control devices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{connectedDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              {devices.length > 0 ? Math.round((connectedDevices.length / devices.length) * 100) : 0}% of total devices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enabledDevices.length}</div>
            <p className="text-xs text-muted-foreground">Active and configured devices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devices.length > 0 && connectedDevices.length === enabledDevices.length ? (
                <span className="text-green-600">Excellent</span>
              ) : connectedDevices.length > 0 ? (
                <span className="text-yellow-600">Good</span>
              ) : (
                <span className="text-red-600">Poor</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Overall system status</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Access Control Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className={`${item.borderColor} border-2 hover:shadow-md transition-shadow cursor-pointer ${item.bgColor}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${item.bgColor} border ${item.borderColor}`}>
                            <item.icon className={`h-5 w-5 ${item.color}`} />
                          </div>
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                        </div>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Device Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Device Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading devices...</span>
            </div>
          ) : devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.location} • {device.ip}:{device.port}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!device.enabled ? (
                      <Badge variant="secondary">Disabled</Badge>
                    ) : device.isConnected ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
                    ) : (
                      <Badge variant="destructive">Disconnected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Devices Found</h3>
              <p className="text-gray-500">No access control devices are configured.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/access-control/devices">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Manage Devices
              </Button>
            </Link>
            <Link href="/access-control/users">
              <Button variant="outline" size="sm">
                <UserCheck className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </Link>
            <Link href="/access-control/monitoring">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Start Monitoring
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
      </SidebarInset>
    </DeveloperModeGuard>
  );
}