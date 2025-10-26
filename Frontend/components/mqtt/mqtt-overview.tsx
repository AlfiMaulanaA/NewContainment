"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Settings, 
  Eye, 
  Edit2, 
  TestTube, 
  Database, 
  FileText, 
  Radio,
  Wifi,
  Loader2
} from "lucide-react";
import { 
  MqttConfiguration, 
  ToggleMqttRequest,
  mqttConfigurationApi
} from "@/lib/api-service";
import { CardSkeleton } from "@/components/loading-skeleton";

interface MQTTOverviewProps {
  activeConfiguration: MqttConfiguration | null;
  effectiveConfiguration: Record<string, any>;
  connectionStatuses?: Record<string, boolean>;
  isLoading?: boolean;
  onEdit?: (config: MqttConfiguration) => void;
  onView?: (config: MqttConfiguration) => void;
  onTest?: (config: MqttConfiguration) => void;
  testingConnection?: boolean;
  onRefresh?: () => void;
}

const MQTTOverview: React.FC<MQTTOverviewProps> = ({
  activeConfiguration,
  effectiveConfiguration,
  connectionStatuses = {},
  isLoading = false,
  onEdit,
  onView,
  onTest,
  testingConnection = false,
  onRefresh
}) => {
  const [toggleLoading, setToggleLoading] = useState(false);

  const handleToggleMqtt = async (enabled: boolean) => {
    setToggleLoading(true);
    try {
      const request: ToggleMqttRequest = { enabled };
      const response = await mqttConfigurationApi.toggleMqtt(request);
      if (response.success) {
        toast.success(`MQTT ${enabled ? 'enabled' : 'disabled'} successfully`);
        onRefresh?.();
      } else {
        toast.error(response.message || "Failed to toggle MQTT");
      }
    } catch (error) {
      toast.error("Failed to toggle MQTT");
    } finally {
      setToggleLoading(false);
    }
  };

  const getStatusBadge = useMemo(() => (isEnabled: boolean, isActive?: boolean) => {
    if (isActive && isEnabled) {
      return <Badge variant="default" className="bg-green-500">Active & Enabled</Badge>;
    } else if (isActive && !isEnabled) {
      return <Badge variant="secondary">Active but Disabled</Badge>;
    } else if (isEnabled && isActive === undefined) {
      return <Badge variant="default" className="bg-green-500">Enabled</Badge>;
    } else if (isEnabled) {
      return <Badge variant="outline">Enabled but Inactive</Badge>;
    } else {
      return <Badge variant="destructive">Disabled</Badge>;
    }
  }, []);

  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">MQTT Status</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {getStatusBadge(effectiveConfiguration.IsEnabled ?? false)}
              </div>
              {activeConfiguration && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="mqtt-toggle" className="text-sm">
                    {activeConfiguration.isEnabled ? "Disable" : "Enable"}
                  </Label>
                  <Switch
                    id="mqtt-toggle"
                    checked={activeConfiguration.isEnabled}
                    onCheckedChange={handleToggleMqtt}
                    disabled={toggleLoading}
                  />
                  {toggleLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Configuration Source</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {(effectiveConfiguration.Source === "Database" || activeConfiguration?.useEnvironmentConfig === false) ? (
                <Database className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <p className="text-lg font-bold">
                {effectiveConfiguration.Source || (activeConfiguration ? "Database" : "Environment")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Broker</span>
            </div>
            <p className="text-lg font-bold mt-2">
              {effectiveConfiguration.BrokerHost && effectiveConfiguration.BrokerPort
                ? `${effectiveConfiguration.BrokerHost}:${effectiveConfiguration.BrokerPort}`
                : (activeConfiguration?.brokerHost && activeConfiguration?.brokerPort
                    ? `${activeConfiguration.brokerHost}:${activeConfiguration.brokerPort}`
                    : "Not Configured")
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Configuration Display */}
      {activeConfiguration && (
        <Card>
          <CardHeader>
            <CardTitle>Active Configuration</CardTitle>
            <CardDescription>Currently active MQTT configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>
                <div className="mt-1">
                  {getStatusBadge(activeConfiguration.isEnabled, activeConfiguration.isActive)}
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Source:</span>
                <p className="mt-1">{activeConfiguration.useEnvironmentConfig ? "Environment" : "Database"}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Broker:</span>
                <p className="mt-1">{effectiveConfiguration.BrokerHost}:{effectiveConfiguration.BrokerPort}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Client ID:</span>
                <p className="mt-1">{effectiveConfiguration.ClientId}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {onView && (
                <Button variant="outline" onClick={() => onView(activeConfiguration)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(activeConfiguration)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onTest && (
                <Button
                  variant="outline"
                  onClick={() => onTest(activeConfiguration)}
                  disabled={testingConnection || !activeConfiguration}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Current MQTT Configuration</CardTitle>
          <CardDescription>
            Configuration values currently being used by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(effectiveConfiguration).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(effectiveConfiguration).map(([key, value]) => (
                <div key={key} className="p-3 border rounded">
                  <div className="font-medium text-sm text-muted-foreground">{key}</div>
                  <div className="mt-1 font-mono text-sm">
                    {key === "Username" && value ? "••••••" :
                     typeof value === "boolean" ? (value ? "true" : "false") :
                     value !== null && value !== undefined ? String(value) : "Not set"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No configuration data available</p>
              <p className="text-sm mt-2">Effective configuration will appear here once loaded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(MQTTOverview);
