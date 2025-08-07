"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  CheckCircle, 
  TestTube, 
  Database, 
  FileText, 
  Radio,
  Settings
} from "lucide-react";
import { 
  MqttConfiguration,
  mqttConfigurationApi
} from "@/lib/api-service";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/loading-skeleton";

interface MQTTManagementProps {
  configurations: MqttConfiguration[];
  activeConfiguration: MqttConfiguration | null;
  effectiveConfiguration: Record<string, any>;
  isLoading?: boolean;
  onEdit?: (config: MqttConfiguration) => void;
  onView?: (config: MqttConfiguration) => void;
  onTest?: (config: MqttConfiguration) => void;
  onCreate?: () => void;
  testingConnection?: boolean;
  onRefresh?: () => void;
}

const MQTTManagement: React.FC<MQTTManagementProps> = ({
  configurations,
  activeConfiguration,
  effectiveConfiguration,
  isLoading = false,
  onEdit,
  onView,
  onTest,
  onCreate,
  testingConnection = false,
  onRefresh
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await mqttConfigurationApi.deleteConfiguration(id);
      if (response.success) {
        toast.success("MQTT configuration deleted successfully");
        onRefresh?.();
      } else {
        toast.error(response.message || "Failed to delete MQTT configuration");
      }
    } catch (error) {
      toast.error("Failed to delete MQTT configuration");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      const response = await mqttConfigurationApi.setActiveConfiguration(id);
      if (response.success) {
        toast.success("Configuration activated successfully");
        onRefresh?.();
      } else {
        toast.error(response.message || "Failed to activate configuration");
      }
    } catch (error) {
      toast.error("Failed to activate configuration");
    }
  };

  const getStatusBadge = useMemo(() => (isEnabled: boolean, isActive: boolean) => {
    if (isActive && isEnabled) {
      return <Badge variant="default" className="bg-green-500">Active & Enabled</Badge>;
    } else if (isActive && !isEnabled) {
      return <Badge variant="secondary">Active but Disabled</Badge>;
    } else if (isEnabled) {
      return <Badge variant="outline">Enabled but Inactive</Badge>;
    } else {
      return <Badge variant="destructive">Disabled</Badge>;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>MQTT Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">MQTT Status</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {effectiveConfiguration.IsEnabled ? "Enabled" : "Disabled"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Active Config</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {activeConfiguration ? "Database" : "Environment"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Configs</span>
            </div>
            <p className="text-2xl font-bold mt-2">{configurations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MQTT Configurations</CardTitle>
              <CardDescription>
                Manage all MQTT broker configurations
              </CardDescription>
            </div>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {config.description || "No description"}
                  </TableCell>
                  <TableCell>
                    {config.useEnvironmentConfig ? (
                      <span className="text-muted-foreground">Environment Config</span>
                    ) : (
                      `${config.brokerHost}:${config.brokerPort}`
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {config.useEnvironmentConfig ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      {config.useEnvironmentConfig ? "Environment" : "Database"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(config.isEnabled, config.isActive)}
                  </TableCell>
                  <TableCell>
                    {new Date(config.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(config)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(config)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {!config.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(config.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {onTest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTest(config)}
                          disabled={testingConnection}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={deletingId === config.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this MQTT configuration? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(config.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configurations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No MQTT configurations found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Effective Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Effective Configuration</CardTitle>
          <CardDescription>
            Current configuration values being used by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(effectiveConfiguration).map(([key, value]) => (
              <div key={key} className="p-3 border rounded">
                <div className="font-medium text-sm text-muted-foreground">{key}</div>
                <div className="mt-1 font-mono text-sm">
                  {key === "Username" && value ? "••••••" :
                   typeof value === "boolean" ? (value ? "true" : "false") : 
                   String(value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(MQTTManagement);