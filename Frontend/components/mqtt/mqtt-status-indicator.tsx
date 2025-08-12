"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Settings
} from "lucide-react";
import { useMQTTConfig } from "@/lib/mqtt-config-manager";
import { useMQTT } from "@/lib/mqtt-manager";

interface MQTTStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function MQTTStatusIndicator({ showDetails = true, className = "" }: MQTTStatusIndicatorProps) {
  const { config, isLoading, refreshConfig, isEnabled, source } = useMQTTConfig();
  const { isConnected, getConfigurationStatus } = useMQTT();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    source: 'environment' | 'database';
    isEnabled: boolean;
    brokerEndpoint: string;
    hasCredentials: boolean;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      const status = await getConfigurationStatus();
      setConnectionStatus({
        connected: isConnected(),
        ...status
      });
    } catch (error) {
      console.error('Failed to get configuration status:', error);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [config]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshConfig();
      await checkConnectionStatus();
    } catch (error) {
      console.error('Failed to refresh configuration:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="outline">Loading...</Badge>;
    }
    
    if (!isEnabled) {
      return <Badge variant="destructive">Disabled</Badge>;
    }
    
    if (connectionStatus?.connected) {
      return <Badge className="bg-green-500">Connected</Badge>;
    } else {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  const getSourceIcon = () => {
    if (source === 'database') {
      return <Database className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  const getConnectionIcon = () => {
    if (connectionStatus?.connected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (!isEnabled) {
      return <XCircle className="h-4 w-4 text-gray-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (!showDetails) {
    // Compact version
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-2 ${className}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {connectionStatus?.connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                {getStatusBadge()}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div>MQTT Status: {connectionStatus?.connected ? 'Connected' : 'Disconnected'}</div>
                <div>Source: {source}</div>
                <div>Endpoint: {connectionStatus?.brokerEndpoint}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              MQTT Connection Status
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className="text-sm font-medium">Connection</span>
            </div>
            {getStatusBadge()}
          </div>

          {/* Configuration Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSourceIcon()}
              <span className="text-sm font-medium">Config Source</span>
            </div>
            <Badge variant="outline" className="capitalize">
              {source}
            </Badge>
          </div>

          {/* Broker Endpoint */}
          {connectionStatus?.brokerEndpoint && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Broker</span>
              </div>
              <span className="text-xs font-mono">
                {connectionStatus.brokerEndpoint}
              </span>
            </div>
          )}

          {/* Credentials Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Authentication</span>
            </div>
            <Badge variant={connectionStatus?.hasCredentials ? "default" : "outline"}>
              {connectionStatus?.hasCredentials ? "Enabled" : "None"}
            </Badge>
          </div>

          {/* Configuration Details */}
          {config && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div><strong>Current Config:</strong></div>
                <div>Host: {config.brokerHost}</div>
                <div>Port: {config.brokerPort}</div>
                <div>SSL: {config.useSsl ? 'Enabled' : 'Disabled'}</div>
                <div>Topic Prefix: {config.topicPrefix}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for disabled MQTT */}
          {!isEnabled && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                MQTT is currently disabled. Enable it in the configuration to establish connection.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for disconnected state */}
          {isEnabled && !connectionStatus?.connected && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Cannot connect to MQTT broker. Check your configuration and network connectivity.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}