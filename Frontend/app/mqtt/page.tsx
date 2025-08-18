"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge, badgeVariants } from "@/components/ui/badge";
import Swal from "sweetalert2";
import { 
  Plus, 
  RefreshCw, 
  TestTube, 
  Wifi,
  Loader2,
  Edit2
} from "lucide-react";
import { 
  MqttConfiguration, 
  CreateMqttConfigurationRequest, 
  UpdateMqttConfigurationRequest,
  TestMqttConnectionRequest,
  mqttConfigurationApi
} from "@/lib/api-service";
import { PageSkeleton } from "@/components/loading-skeleton";

// Optimized lazy loading with preload
const MQTTOverview = React.lazy(() => 
  import("@/components/mqtt/mqtt-overview").then(module => ({
    default: module.default
  }))
);

const MQTTManagement = React.lazy(() => 
  import("@/components/mqtt/mqtt-management").then(module => ({
    default: module.default
  }))
);

// Enhanced component loader
const ComponentLoader = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-muted-foreground">Loading component...</span>
    </div>
    <div className="space-y-3">
      <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  </div>
);

export default function UnifiedMqttPage() {
  // State management
  const [configurations, setConfigurations] = useState<MqttConfiguration[]>([]);
  const [activeConfiguration, setActiveConfiguration] = useState<MqttConfiguration | null>(null);
  const [effectiveConfiguration, setEffectiveConfiguration] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedConfiguration, setSelectedConfiguration] = useState<MqttConfiguration | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState<CreateMqttConfigurationRequest>({
    isEnabled: true,
    useEnvironmentConfig: false,
    brokerHost: "",
    brokerPort: 1883,
    username: "",
    password: "",
    clientId: "ContainmentSystem",
    useSsl: false,
    keepAliveInterval: 60,
    reconnectDelay: 5,
    topicPrefix: "containment",
    description: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load essential data first (fastest APIs)
      const [effectiveConfigRes, activeConfigRes] = await Promise.all([
        mqttConfigurationApi.getEffectiveConfiguration(),
        mqttConfigurationApi.getActiveConfiguration()
      ]);

      if (effectiveConfigRes.success) setEffectiveConfiguration(effectiveConfigRes.data || {});
      if (activeConfigRes.success) setActiveConfiguration(activeConfigRes.data || null);

      // Load secondary data in background (slower APIs)
      Promise.all([
        mqttConfigurationApi.getConfigurations(),
        mqttConfigurationApi.getAllConnectionStatus()
      ]).then(([configurationsRes, connectionStatusRes]) => {
        if (configurationsRes.success) setConfigurations(configurationsRes.data || []);
        if (connectionStatusRes.success) setConnectionStatuses(connectionStatusRes.data || {});
      }).catch(() => {
        // Non-critical error, don't show toast
        console.warn('Failed to load secondary MQTT data');
      });

    } catch (error) {
      toast.error("Failed to load MQTT configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = useCallback(() => {
    setFormData({
      isEnabled: true,
      useEnvironmentConfig: false,
      brokerHost: "",
      brokerPort: 1883,
      username: "",
      password: "",
      clientId: "ContainmentSystem",
      useSsl: false,
      keepAliveInterval: 60,
      reconnectDelay: 5,
      topicPrefix: "containment",
      description: ""
    });
  }, []);

  const handleCreate = async () => {
    if (!formData.brokerHost && !formData.useEnvironmentConfig) {
      toast.error("Please provide broker host or use environment configuration");
      return;
    }

    setActionLoading(true);
    try {
      const response = await mqttConfigurationApi.createConfiguration(formData);
      if (response.success) {
        toast.success("MQTT configuration created successfully");
        setIsCreateDialogOpen(false);
        resetForm();
        loadData();
      } else {
        toast.error(response.message || "Failed to create MQTT configuration");
      }
    } catch (error) {
      toast.error("Network error: Failed to create MQTT configuration");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfiguration) return;

    if (!formData.brokerHost && !formData.useEnvironmentConfig) {
      toast.error("Please provide broker host or use environment configuration");
      return;
    }

    setActionLoading(true);
    try {
      const updateData: UpdateMqttConfigurationRequest = { ...formData };
      const response = await mqttConfigurationApi.updateConfiguration(selectedConfiguration.id, updateData);
      
      if (response.success) {
        toast.success("MQTT configuration updated successfully");
        setIsEditDialogOpen(false);
        resetForm();
        setSelectedConfiguration(null);
        loadData();
      } else {
        toast.error(response.message || "Failed to update MQTT configuration");
      }
    } catch (error) {
      toast.error("Network error: Failed to update MQTT configuration");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestConnection = async (config: MqttConfiguration) => {
    setTestingConnection(true);
    try {
      const response = await mqttConfigurationApi.testConnection(config.id);
      if (response.success && response.data) {
        Swal.fire({
          icon: response.data.success ? 'success' : 'error',
          title: response.data.success ? 'Connection Successful!' : 'Connection Failed',
          text: response.data.message || (response.data.success ? 'MQTT broker connection test passed successfully.' : 'Failed to connect to MQTT broker.'),
          position: 'top-end',
          timer: 3000,
          timerProgressBar: true,
          toast: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Test Failed',
        text: 'An error occurred while testing the connection.',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestFormConnection = async () => {
    if (!formData.brokerHost) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please provide broker host address.',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false,
      });
      return;
    }

    setTestingConnection(true);
    try {
      const testRequest: TestMqttConnectionRequest = {
        brokerHost: formData.brokerHost,
        brokerPort: formData.brokerPort || 1883,
        username: formData.username,
        password: formData.password,
        clientId: formData.clientId,
        useSsl: formData.useSsl,
        keepAliveInterval: formData.keepAliveInterval
      };

      const response = await mqttConfigurationApi.testConnectionWithConfig(testRequest);
      if (response.success && response.data) {
        Swal.fire({
          icon: response.data.success ? 'success' : 'error',
          title: response.data.success ? 'Connection Successful!' : 'Connection Failed',
          text: response.data.message || (response.data.success ? 'MQTT broker connection test passed successfully.' : 'Failed to connect to MQTT broker.'),
          position: 'top-end',
          timer: 3000,
          toast: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Test Failed',
        text: 'An error occurred while testing the connection.',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const openEditDialog = (configuration: MqttConfiguration) => {
    setSelectedConfiguration(configuration);
    setFormData({
      isEnabled: configuration.isEnabled,
      useEnvironmentConfig: configuration.useEnvironmentConfig,
      brokerHost: configuration.brokerHost || "",
      brokerPort: configuration.brokerPort || 1883,
      username: configuration.username || "",
      password: configuration.password || "",
      clientId: configuration.clientId || "",
      useSsl: configuration.useSsl,
      keepAliveInterval: configuration.keepAliveInterval,
      reconnectDelay: configuration.reconnectDelay,
      topicPrefix: configuration.topicPrefix || "",
      description: configuration.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (configuration: MqttConfiguration) => {
    setSelectedConfiguration(configuration);
    setIsViewDialogOpen(true);
  };

  // Preload components when user hovers over tabs or page loads
  const preloadComponent = useCallback((tabValue: string) => {
    if (tabValue === "management") {
      import("@/components/mqtt/mqtt-management").catch(() => {});
    } else if (tabValue === "overview") {
      import("@/components/mqtt/mqtt-overview").catch(() => {});
    }
  }, []);

  // Preload overview component immediately since it's the default tab
  useEffect(() => {
    preloadComponent("overview");
  }, [preloadComponent]);

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            <h1 className="text-lg font-semibold">MQTT Configuration</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Quick loading skeleton */}
          <div className="space-y-4">
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
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
          <Wifi className="h-5 w-5" />
          <h1 className="text-lg font-semibold">MQTT Configuration</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create MQTT Configuration</DialogTitle>
                <DialogDescription>
                  Create a new MQTT broker configuration for the system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                    />
                    <Label htmlFor="isEnabled">Enable MQTT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="useEnvironmentConfig"
                      checked={formData.useEnvironmentConfig}
                      onCheckedChange={(checked) => setFormData({ ...formData, useEnvironmentConfig: checked })}
                    />
                    <Label htmlFor="useEnvironmentConfig">Use Environment Config</Label>
                  </div>
                </div>

                {!formData.useEnvironmentConfig && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brokerHost">Broker Host *</Label>
                        <Input
                          id="brokerHost"
                          value={formData.brokerHost}
                          onChange={(e) => setFormData({ ...formData, brokerHost: e.target.value })}
                          placeholder="localhost"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brokerPort">Broker Port</Label>
                        <Input
                          id="brokerPort"
                          type="number"
                          value={formData.brokerPort}
                          onChange={(e) => setFormData({ ...formData, brokerPort: parseInt(e.target.value) || 1883 })}
                          placeholder="1883"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Client ID</Label>
                        <Input
                          id="clientId"
                          value={formData.clientId}
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                          placeholder="ContainmentSystem"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="topicPrefix">Topic Prefix</Label>
                        <Input
                          id="topicPrefix"
                          value={formData.topicPrefix}
                          onChange={(e) => setFormData({ ...formData, topicPrefix: e.target.value })}
                          placeholder="containment"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="useSsl"
                          checked={formData.useSsl}
                          onCheckedChange={(checked) => setFormData({ ...formData, useSsl: checked })}
                        />
                        <Label htmlFor="useSsl">Use SSL</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keepAlive">Keep Alive (sec)</Label>
                        <Input
                          id="keepAlive"
                          type="number"
                          value={formData.keepAliveInterval}
                          onChange={(e) => setFormData({ ...formData, keepAliveInterval: parseInt(e.target.value) || 60 })}
                          placeholder="60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reconnectDelay">Reconnect Delay (sec)</Label>
                        <Input
                          id="reconnectDelay"
                          type="number"
                          value={formData.reconnectDelay}
                          onChange={(e) => setFormData({ ...formData, reconnectDelay: parseInt(e.target.value) || 5 })}
                          placeholder="5"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description for this configuration"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestFormConnection}
                        disabled={testingConnection || !formData.brokerHost}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {testingConnection ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Configuration"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="overview"
              onMouseEnter={() => preloadComponent("overview")}
            >
              Configuration & Settings
            </TabsTrigger>
            <TabsTrigger 
              value="management"
              onMouseEnter={() => preloadComponent("management")}
            >
              Advanced Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Suspense fallback={<ComponentLoader />}>
              <MQTTOverview
                activeConfiguration={activeConfiguration}
                effectiveConfiguration={effectiveConfiguration}
                isLoading={loading}
                onEdit={openEditDialog}
                onView={openViewDialog}
                onTest={handleTestConnection}
                testingConnection={testingConnection}
                onRefresh={loadData}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <Suspense fallback={<ComponentLoader />}>
              <MQTTManagement
                configurations={configurations}
                activeConfiguration={activeConfiguration}
                effectiveConfiguration={effectiveConfiguration}
                connectionStatuses={connectionStatuses}
                isLoading={loading}
                onEdit={openEditDialog}
                onView={openViewDialog}
                onTest={handleTestConnection}
                onCreate={() => { resetForm(); setIsCreateDialogOpen(true); }}
                testingConnection={testingConnection}
                onRefresh={loadData}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Edit and View Dialogs remain the same but are only rendered when needed */}
        {selectedConfiguration && (
          <>
            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit MQTT Configuration</DialogTitle>
                  <DialogDescription>Update MQTT broker configuration.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-isEnabled"
                        checked={formData.isEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                      />
                      <Label htmlFor="edit-isEnabled">Enable MQTT</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-useEnvironmentConfig"
                        checked={formData.useEnvironmentConfig}
                        onCheckedChange={(checked) => setFormData({ ...formData, useEnvironmentConfig: checked })}
                      />
                      <Label htmlFor="edit-useEnvironmentConfig">Use Environment Config</Label>
                    </div>
                  </div>

                  {!formData.useEnvironmentConfig && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-brokerHost">Broker Host *</Label>
                          <Input
                            id="edit-brokerHost"
                            value={formData.brokerHost}
                            onChange={(e) => setFormData({ ...formData, brokerHost: e.target.value })}
                            placeholder="localhost"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-brokerPort">Broker Port</Label>
                          <Input
                            id="edit-brokerPort"
                            type="number"
                            value={formData.brokerPort}
                            onChange={(e) => setFormData({ ...formData, brokerPort: parseInt(e.target.value) || 1883 })}
                            placeholder="1883"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-username">Username</Label>
                          <Input
                            id="edit-username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-password">Password</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-clientId">Client ID</Label>
                          <Input
                            id="edit-clientId"
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                            placeholder="ContainmentSystem"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-topicPrefix">Topic Prefix</Label>
                          <Input
                            id="edit-topicPrefix"
                            value={formData.topicPrefix}
                            onChange={(e) => setFormData({ ...formData, topicPrefix: e.target.value })}
                            placeholder="containment"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="edit-useSsl"
                            checked={formData.useSsl}
                            onCheckedChange={(checked) => setFormData({ ...formData, useSsl: checked })}
                          />
                          <Label htmlFor="edit-useSsl">Use SSL</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-keepAlive">Keep Alive (sec)</Label>
                          <Input
                            id="edit-keepAlive"
                            type="number"
                            value={formData.keepAliveInterval}
                            onChange={(e) => setFormData({ ...formData, keepAliveInterval: parseInt(e.target.value) || 60 })}
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-reconnectDelay">Reconnect Delay (sec)</Label>
                          <Input
                            id="edit-reconnectDelay"
                            type="number"
                            value={formData.reconnectDelay}
                            onChange={(e) => setFormData({ ...formData, reconnectDelay: parseInt(e.target.value) || 5 })}
                            placeholder="5"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Optional description for this configuration"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestFormConnection}
                          disabled={testingConnection || !formData.brokerHost}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          {testingConnection ? "Testing..." : "Test Connection"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                  <Button onClick={handleUpdate} disabled={actionLoading}>
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Configuration"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    MQTT Configuration Details
                  </DialogTitle>
                  <DialogDescription>View detailed MQTT configuration information.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Status Information */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Status Information</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                        <div className="mt-1">
                          {selectedConfiguration.isEnabled ? (
                            <Badge className="bg-green-500">Enabled</Badge>
                          ) : (
                            <Badge variant="destructive">Disabled</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Active</Label>
                        <div className="mt-1">
                          {selectedConfiguration.isActive ? (
                            <Badge className="bg-blue-500">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Config Source</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig ? "Environment" : "Database"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">ID</Label>
                        <p className="text-sm mt-1 font-mono">#{selectedConfiguration.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Settings */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Connection Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Broker Host</Label>
                        <p className="text-sm mt-1 font-mono">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.brokerHost || "Not set")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Broker Port</Label>
                        <p className="text-sm mt-1 font-mono">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.brokerPort || "1883")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Client ID</Label>
                        <p className="text-sm mt-1 font-mono">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.clientId || "ContainmentSystem")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Username</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.username ? "••••••" : "Not set")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.password ? "••••••" : "Not set")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Use SSL</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.useSsl ? "Yes" : "No")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Advanced Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Keep Alive Interval</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : `${selectedConfiguration.keepAliveInterval || 60} seconds`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Reconnect Delay</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : `${selectedConfiguration.reconnectDelay || 5} seconds`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Topic Prefix</Label>
                        <p className="text-sm mt-1 font-mono">
                          {selectedConfiguration.useEnvironmentConfig 
                            ? "From Environment" 
                            : (selectedConfiguration.topicPrefix || "containment")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Metadata</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                        <p className="text-sm mt-1">{selectedConfiguration.description || "No description provided"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Created At</Label>
                        <p className="text-sm mt-1">{new Date(selectedConfiguration.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Updated At</Label>
                        <p className="text-sm mt-1">{new Date(selectedConfiguration.updatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Created By</Label>
                        <p className="text-sm mt-1">
                          {selectedConfiguration.createdByUser?.name || `User ID: ${selectedConfiguration.createdBy}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (selectedConfiguration) {
                        openEditDialog(selectedConfiguration);
                        setIsViewDialogOpen(false);
                      }
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (selectedConfiguration) {
                        handleTestConnection(selectedConfiguration);
                      }
                    }}
                    disabled={testingConnection}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </SidebarInset>
  );
}