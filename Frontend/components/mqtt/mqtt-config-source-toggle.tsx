"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Database, 
  FileText, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Zap
} from "lucide-react";
import { MqttConfiguration, mqttConfigurationApi } from "@/lib/api-service";
import { toast } from "sonner";

interface MQTTConfigSourceToggleProps {
  activeConfiguration: MqttConfiguration | null;
  effectiveConfiguration: any;
  onConfigurationChange?: () => void;
  onReloadConfig?: (showToast?: boolean) => Promise<boolean>;
  className?: string;
}

export function MQTTConfigSourceToggle({
  activeConfiguration,
  effectiveConfiguration,
  onConfigurationChange,
  onReloadConfig,
  className = ""
}: MQTTConfigSourceToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Check the effective configuration to determine what's actually being used
  const isUsingDatabase = effectiveConfiguration && effectiveConfiguration.Source === "Database";
  const isUsingEnvironment = !isUsingDatabase;

  // Log the configuration state for debugging
  console.log("MQTT Source Toggle Debug:", {
    effectiveSource: effectiveConfiguration?.Source,
    activeConfigExists: !!activeConfiguration,
    useEnvironmentConfig: activeConfiguration?.useEnvironmentConfig,
    isUsingDatabase,
    isUsingEnvironment
  });

  const handleToggleSource = async (useDatabase: boolean) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      if (useDatabase) {
        if (!activeConfiguration) {
          toast.error("No database configuration available. Please create one first.");
          return;
        }
        
        const response = await mqttConfigurationApi.updateConfiguration(
          activeConfiguration.id,
          {
            ...activeConfiguration,
            useEnvironmentConfig: false
          }
        );
        
        if (response.success) {
          toast.success("Switched to database configuration");
          onConfigurationChange?.();

          // Auto-reload MQTT configuration after switch
          if (onReloadConfig) {
            setTimeout(() => {
              onReloadConfig(false); // Don't show toast, already showed success
            }, 500);
          }
        } else {
          toast.error(response.message || "Failed to switch to database configuration");
        }
      } else {
        if (activeConfiguration) {
          const response = await mqttConfigurationApi.updateConfiguration(
            activeConfiguration.id,
            {
              ...activeConfiguration,
              useEnvironmentConfig: true
            }
          );
          
          if (response.success) {
            toast.success("Switched to environment configuration");
            onConfigurationChange?.();

            // Auto-reload MQTT configuration after switch
            if (onReloadConfig) {
              setTimeout(() => {
                onReloadConfig(false); // Don't show toast, already showed success
              }, 500);
            }
          } else {
            toast.error(response.message || "Failed to switch to environment configuration");
          }
        } else {
          toast.info("Already using environment configuration");
        }
      }
    } catch (error) {
      console.error("Failed to toggle configuration source:", error);
      toast.error("Failed to change configuration source");
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentSource = () => {
    if (isUsingDatabase) return "database";
    return "environment";
  };

  const getSourceInfo = () => {
    if (isUsingDatabase) {
      return {
        icon: <Database className="h-4 w-4 text-blue-500 dark:text-blue-400" />,
        title: "Database Configuration",
        description: "Using stored database configuration",
        color: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/70"
      };
    } else {
      return {
        icon: <FileText className="h-4 w-4 text-green-500 dark:text-green-400" />,
        title: "Environment Configuration",
        description: "Using environment variables or defaults",
        color: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/70"
      };
    }
  };

  const sourceInfo = getSourceInfo();

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle className="text-lg">Configuration Source</CardTitle>
            </div>
            <Badge variant={isUsingDatabase ? "default" : "secondary"} className="capitalize">
              {getCurrentSource()}
            </Badge>
          </div>
          <CardDescription>
            Choose between database-stored configuration or environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Source Info */}
          <Alert className={`${sourceInfo.color} dark:text-current`}>
            <div className="flex items-center gap-2">
              {sourceInfo.icon}
              <div>
                <div className="font-semibold text-sm dark:text-foreground">{sourceInfo.title}</div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">{sourceInfo.description}</div>
              </div>
            </div>
          </Alert>

          {/* Source Selection */}
          <div className="space-y-3">
            {/* Environment Option */}
            <div className="flex items-center justify-between p-3 border rounded-lg dark:border-border">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-green-500 dark:text-green-400" />
                <div>
                  <div className="font-medium text-sm dark:text-foreground">Environment Variables</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Static configuration from .env files or system environment
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUsingEnvironment && <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isUsingEnvironment ? "default" : "outline"}
                      size="sm"
                      disabled={isUpdating || isUsingEnvironment}
                      onClick={() => handleToggleSource(false)}
                    >
                      {isUpdating && !isUsingEnvironment ? "Switching..." : "Use Environment"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Switch to using environment variables for MQTT configuration
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Database Option */}
            <div className="flex items-center justify-between p-3 border rounded-lg dark:border-border">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <div>
                  <div className="font-medium text-sm dark:text-foreground">Database Configuration</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Dynamic configuration stored in database (requires active config)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isUsingDatabase && <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isUsingDatabase ? "default" : "outline"}
                      size="sm"
                      disabled={isUpdating || isUsingDatabase || !activeConfiguration}
                      onClick={() => handleToggleSource(true)}
                    >
                      {isUpdating && isUsingEnvironment ? "Switching..." : "Use Database"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!activeConfiguration
                      ? "No active database configuration available"
                      : "Switch to using database-stored MQTT configuration"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Warning for no database config */}
          {!activeConfiguration && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800/70 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                No database configuration is available. Create and activate an MQTT configuration to enable database mode.
              </AlertDescription>
            </Alert>
          )}

          {/* Priority Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Configuration Priority:</strong>
              <br />1. Active Database Config (if enabled and not using environment override)
              <br />2. Environment Variables
              <br />3. System Defaults
            </AlertDescription>
          </Alert>

          {/* Current Effective Values Preview */}
          {effectiveConfiguration && (
            <div className="mt-4 p-3 border rounded-lg bg-gray-50 dark:bg-accent dark:border-accent">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                <span className="font-medium text-sm dark:text-foreground">Current Effective Configuration</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="dark:text-foreground">
                  <span className="text-muted-foreground dark:text-muted-foreground">Broker:</span>
                  <span className="ml-1 font-mono dark:text-foreground">
                    {effectiveConfiguration.BrokerHost && effectiveConfiguration.BrokerPort
                      ? `${effectiveConfiguration.BrokerHost}:${effectiveConfiguration.BrokerPort}`
                      : "Not configured"}
                  </span>
                </div>
                <div className="dark:text-foreground">
                  <span className="text-muted-foreground dark:text-muted-foreground">SSL:</span>
                  <span className="ml-1 dark:text-foreground">
                    {effectiveConfiguration.UseSsl ?? false ? "Yes" : "No"}
                  </span>
                </div>
                <div className="dark:text-foreground">
                  <span className="text-muted-foreground dark:text-muted-foreground">Client ID:</span>
                  <span className="ml-1 font-mono truncate dark:text-foreground">
                    {effectiveConfiguration.ClientId || "Not set"}
                  </span>
                </div>
                <div className="dark:text-foreground">
                  <span className="text-muted-foreground dark:text-muted-foreground">Enabled:</span>
                  <span className="ml-1 dark:text-foreground">
                    {effectiveConfiguration.IsEnabled ?? false ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
