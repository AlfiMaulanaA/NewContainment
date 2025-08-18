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
  Settings,
  Activity
} from "lucide-react";
import { useMQTT } from "@/hooks/useMQTT";

interface MQTTStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function MQTTStatusIndicator({ 
  showDetails = true, 
  compact = false,
  className = "" 
}: MQTTStatusIndicatorProps) {
  const mqttHook = useMQTT();
  const { isConnected, isConnecting, error, getStatus, reconnect } = mqttHook;
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [connectionHistory, setConnectionHistory] = useState<{timestamp: Date, status: boolean}[]>([]);
  
  // Monitor connection status changes

  const checkConnectionStatus = async () => {
    try {
      const status = getStatus();
      setConnectionStatus(status);
      setLastCheck(new Date());
      // Status checked successfully
    } catch (error) {
      // Failed to get configuration status
    }
  };
  
  // Update connection history with safe check
  useEffect(() => {
    if (isConnected !== undefined) {
      const newEntry = { timestamp: new Date(), status: isConnected };
      setConnectionHistory(prev => {
        const updated = [...prev, newEntry].slice(-10); // Keep last 10 entries
        return updated;
      });
    }
  }, [isConnected]);

  useEffect(() => {
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [isConnected, isConnecting]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reconnect();
      await checkConnectionStatus();
    } catch (error) {
      // Failed to refresh connection
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (isConnecting) {
      return <Badge variant="outline" className="animate-pulse">Connecting...</Badge>;
    }
    
    if (isConnected) {
      return <Badge className="bg-green-500 animate-pulse">Live</Badge>;
    } else {
      return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const getSourceIcon = () => {
    if (connectionStatus?.config?.brokerSource === 'database') {
      return <Database className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  const getConnectionIcon = () => {
    if (isConnecting) {
      return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    } else if (isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  if (compact) {
    // Compact version with enhanced visual feedback
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-2 ${className}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {/* Enhanced connection indicator */}
                <div className={`relative h-3 w-3 rounded-full transition-all duration-500 ${
                  isConnecting 
                    ? 'bg-yellow-400 animate-pulse' 
                    : isConnected 
                      ? 'bg-green-400 shadow-green-200 shadow-lg' 
                      : 'bg-red-400 shadow-red-200 shadow-lg'
                }`}>
                  {isConnected && (
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  )}
                </div>
                
                {/* Status icon */}
                {isConnecting ? (
                  <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />
                ) : isConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                
                {/* Status text */}
                <span className={`text-xs font-medium ${
                  isConnecting 
                    ? 'text-yellow-600' 
                    : isConnected 
                      ? 'text-green-600' 
                      : 'text-red-600'
                }`}>
                  {isConnecting ? 'Connecting...' : isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>MQTT Status: {isConnected ? 'Connected & Live' : 'Disconnected'}</div>
                <div>Last check: {lastCheck.toLocaleTimeString()}</div>
                {connectionStatus?.config && (
                  <div>Broker: {connectionStatus.config.host}:{connectionStatus.config.port}</div>
                )}
                {error && (
                  <div className="text-red-500">Error: {error}</div>
                )}
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
              {connectionStatus?.config?.brokerSource || 'env'}
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
          {connectionStatus?.config && (
            <Alert className="mt-4">
              <Settings className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div><strong>Current Config:</strong></div>
                <div>Host: {connectionStatus.config.host}</div>
                <div>Port: {connectionStatus.config.port}</div>
                <div>Protocol: {connectionStatus.config.protocol || 'mqtt'}</div>
                <div>Topic Prefix: {connectionStatus.config.topicPrefix}</div>
                <div>Source: {connectionStatus.config.brokerSource || 'env'}</div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Connection History */}
          {showDetails && connectionHistory.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent Connection History:</div>
              <div className="flex gap-1">
                {connectionHistory.slice(-10).map((entry, index) => (
                  <div
                    key={index}
                    className={`h-2 w-4 rounded transition-all ${
                      entry.status ? 'bg-green-400' : 'bg-red-400'
                    }`}
                    title={`${entry.status ? 'Connected' : 'Disconnected'} at ${entry.timestamp.toLocaleTimeString()}`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Last update: {lastCheck.toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Connection Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Warning for disconnected state */}
          {!isConnected && !isConnecting && !error && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                MQTT broker is not connected. Check your configuration and network connectivity.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}