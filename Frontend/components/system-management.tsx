"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Power, 
  RotateCcw, 
  Play, 
  Square, 
  RefreshCw, 
  Server, 
  Monitor,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Terminal,
  Activity,
  HardDrive
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { systemManagementApi } from "@/lib/api-service";

interface SystemService {
  name: string;
  displayName: string;
  status: string;
  isActive: boolean;
  isEnabled: boolean;
  description: string;
}

interface SystemStatusInfo {
  hostName: string;
  operatingSystem: string;
  architecture: string;
  kernelVersion: string;
  uptime: string;
  loadAverage: string;
  memoryUsage: string;
  diskUsage: string;
  checkedAt: string;
}

interface SystemCommandResult {
  success: boolean;
  message: string;
  output: string;
  error: string;
  exitCode: number;
  executedAt: string;
  command: string;
  executedBy: string;
}

export default function SystemManagement() {
  const [services, setServices] = useState<SystemService[]>([]);
  const [systemInfo, setSystemStatusInfo] = useState<SystemStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [lastCommandResult, setLastCommandResult] = useState<SystemCommandResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesResponse, systemInfoResponse] = await Promise.all([
        systemManagementApi.getAvailableServices(),
        systemManagementApi.getSystemInfo()
      ]);

      if (servicesResponse.success && servicesResponse.data) {
        const servicesData = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
        setServices(servicesData);
      } else {
        setServices([]);
        toast.error("Failed to load services: " + (servicesResponse.message || "Unknown error"));
      }

      if (systemInfoResponse.success) {
        setSystemStatusInfo(systemInfoResponse.data || null);
      } else {
        toast.error("Failed to load system info: " + (systemInfoResponse.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error loading system data:", error);
      setServices([]);
      setSystemStatusInfo(null);
      toast.error("Failed to load system information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const executeSystemCommand = async (
    commandType: 'reboot' | 'shutdown',
    confirmMessage: string
  ) => {
    const operationKey = `system_${commandType}`;
    setOperationLoading(prev => ({ ...prev, [operationKey]: true }));
    
    try {
      const response = commandType === 'reboot' 
        ? await systemManagementApi.rebootSystem()
        : await systemManagementApi.shutdownSystem();

      if (response.success && response.data) {
        setLastCommandResult(response.data);
        toast.success(response.data.message);
        
        // Show warning about system going down
        if (response.data.success) {
          toast.warning(`System ${commandType} initiated. Connection will be lost.`, {
            duration: 10000
          });
        }
      } else {
        toast.error(response.message || `Failed to ${commandType} system`);
        if (response.data) {
          setLastCommandResult(response.data);
        }
      }
    } catch (error) {
      toast.error(`Network error while executing ${commandType}`);
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationKey]: false }));
    }
  };

  const executeServiceCommand = async (
    serviceName: string,
    action: 'start' | 'stop' | 'restart' | 'status'
  ) => {
    const operationKey = `${serviceName}_${action}`;
    setOperationLoading(prev => ({ ...prev, [operationKey]: true }));
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await systemManagementApi.startService(serviceName);
          break;
        case 'stop':
          response = await systemManagementApi.stopService(serviceName);
          break;
        case 'restart':
          response = await systemManagementApi.restartService(serviceName);
          break;
        case 'status':
          response = await systemManagementApi.getServiceStatus(serviceName);
          break;
      }

      if (response.success && response.data) {
        setLastCommandResult(response.data);
        toast.success(response.data.message);
        
        // Reload services data after start/stop/restart
        if (action !== 'status') {
          setTimeout(() => {
            loadData();
          }, 2000);
        }
      } else {
        toast.error(response.message || `Failed to ${action} service ${serviceName}`);
        if (response.data) {
          setLastCommandResult(response.data);
        }
      }
    } catch (error) {
      toast.error(`Network error while executing ${action} on ${serviceName}`);
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationKey]: false }));
    }
  };

  const getStatusBadge = (service: SystemService) => {
    if (service.isActive) {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else if (service.status === 'inactive') {
      return <Badge variant="secondary"><Square className="w-3 h-3 mr-1" />Inactive</Badge>;
    } else if (service.status === 'failed') {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
    } else {
      return <Badge variant="outline">{service.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading system information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Information Card */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Hostname</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.hostName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">OS</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.operatingSystem}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Uptime</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.uptime}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Load Average</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.loadAverage}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Memory</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.memoryUsage?.split('\n')[1] || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Disk Usage</Label>
                <p className="text-sm font-mono text-foreground">{systemInfo.diskUsage?.split('\n')[1] || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-red-500" />
            System Control
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control system power state and operations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  disabled={operationLoading.system_reboot}
                >
                  {operationLoading.system_reboot ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Reboot System
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reboot System</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restart the entire server. All services will be temporarily unavailable.
                    Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => executeSystemCommand('reboot', 'System will reboot')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Yes, Reboot
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  disabled={operationLoading.system_shutdown}
                >
                  {operationLoading.system_shutdown ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4 mr-2" />
                  )}
                  Shutdown System
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Shutdown System</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will completely shut down the server. You will need physical access to restart it.
                    Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => executeSystemCommand('shutdown', 'System will shutdown')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Shutdown
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={loadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-green-500" />
            Services Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control application and system services
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services && Array.isArray(services) ? services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{service.displayName}</h4>
                    {getStatusBadge(service)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeServiceCommand(service.name, 'start')}
                    disabled={operationLoading[`${service.name}_start`] || service.isActive}
                  >
                    {operationLoading[`${service.name}_start`] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeServiceCommand(service.name, 'stop')}
                    disabled={operationLoading[`${service.name}_stop`] || !service.isActive}
                  >
                    {operationLoading[`${service.name}_stop`] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeServiceCommand(service.name, 'restart')}
                    disabled={operationLoading[`${service.name}_restart`]}
                  >
                    {operationLoading[`${service.name}_restart`] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeServiceCommand(service.name, 'status')}
                    disabled={operationLoading[`${service.name}_status`]}
                  >
                    {operationLoading[`${service.name}_status`] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No services available or failed to load services.</p>
                <Button onClick={loadData} variant="outline" className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Loading
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Command Output Card */}
      {lastCommandResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-purple-500" />
              Last Command Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Command:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">{lastCommandResult.command}</code>
                {lastCommandResult.success ? (
                  <Badge className="bg-green-500">Success</Badge>
                ) : (
                  <Badge variant="destructive">Failed</Badge>
                )}
              </div>
              <div>
                <span className="text-sm font-medium">Output:</span>
                <pre className="text-sm bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">
                  {lastCommandResult.output || 'No output'}
                </pre>
              </div>
              {lastCommandResult.error && (
                <div>
                  <span className="text-sm font-medium text-red-600">Error:</span>
                  <pre className="text-sm bg-red-50 p-2 rounded mt-1 max-h-32 overflow-auto text-red-700">
                    {lastCommandResult.error}
                  </pre>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Executed by {lastCommandResult.executedBy} at {new Date(lastCommandResult.executedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}