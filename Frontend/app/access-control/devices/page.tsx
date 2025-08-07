"use client";

import React, { useState, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AccessControlDevice, 
  accessControlApi 
} from '@/lib/api-service';
import { DeveloperModeGuard } from '@/components/developer-mode-guard';

export default function AccessControlDevicesPage() {
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingDevices, setConnectingDevices] = useState<Set<string>>(new Set());

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

  const handleConnect = async (deviceId: string) => {
    try {
      setConnectingDevices(prev => new Set([...prev, deviceId]));
      
      const result = await accessControlApi.connectDevice(deviceId);
      
      if (result.success && result.data) {
        toast.success(result.data.message);
        
        // Update device status
        setDevices(prev => prev.map(device => 
          device.id === deviceId 
            ? { ...device, isConnected: true, lastPingTime: new Date().toISOString() }
            : device
        ));
      } else {
        toast.error(result.message || 'Failed to connect device');
      }
    } catch (error) {
      toast.error('Error connecting to device');
    } finally {
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      setConnectingDevices(prev => new Set([...prev, deviceId]));
      
      const result = await accessControlApi.disconnectDevice(deviceId);
      
      if (result.success && result.data) {
        toast.success(result.data.message);
        
        // Update device status
        setDevices(prev => prev.map(device => 
          device.id === deviceId 
            ? { ...device, isConnected: false }
            : device
        ));
      } else {
        toast.error(result.message || 'Failed to disconnect device');
      }
    } catch (error) {
      toast.error('Error disconnecting device');
    } finally {
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (device: AccessControlDevice) => {
    if (!device.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    if (device.isConnected) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>;
    } else {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Access Control Devices</h1>
            <p className="text-gray-600">Manage ZKTeco access control devices</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading devices...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DeveloperModeGuard>
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access Control Devices</h1>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={loadDevices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">Manage ZKTeco access control devices</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">Registered devices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => d.isConnected).length}
            </div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {devices.filter(d => d.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Enabled devices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devices.length > 0 && devices.filter(d => d.isConnected).length === devices.filter(d => d.enabled).length ? (
                <span className="text-green-600">Good</span>
              ) : devices.filter(d => d.isConnected).length > 0 ? (
                <span className="text-yellow-600">Fair</span>
              ) : (
                <span className="text-red-600">Poor</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Overall status</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devices ({devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Device Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Last Ping</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    {getStatusBadge(device)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{device.location}</TableCell>
                  <TableCell>{device.ip}</TableCell>
                  <TableCell>{device.port}</TableCell>
                  <TableCell>
                    {device.lastPingTime 
                      ? new Date(device.lastPingTime).toLocaleString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {device.enabled && (
                        <>
                          {device.isConnected ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDisconnect(device.id)}
                              disabled={connectingDevices.has(device.id)}
                            >
                              <WifiOff className="h-4 w-4 mr-1" />
                              {connectingDevices.has(device.id) ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleConnect(device.id)}
                              disabled={connectingDevices.has(device.id)}
                            >
                              <Wifi className="h-4 w-4 mr-1" />
                              {connectingDevices.has(device.id) ? 'Connecting...' : 'Connect'}
                            </Button>
                          )}
                        </>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {devices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">No access control devices found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      </SidebarInset>
    </DeveloperModeGuard>
  );
}