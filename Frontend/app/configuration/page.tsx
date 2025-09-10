"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  Cpu,
  Zap,
  Save,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  Pin,
  HardDrive,
  Loader2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// Mock interfaces - replace with actual API types
interface PinConfiguration {
  id: string;
  name: string;
  pin_number: number;
  mode: "input" | "output";
  enabled: boolean;
  default_value: boolean;
  description: string;
  last_updated: string;
}

interface SystemConfiguration {
  id: string;
  name: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  category: string;
  description: string;
  is_sensitive: boolean;
  last_updated: string;
}

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState("pin-config");
  
  // Pin Configuration State
  const [pinConfigs, setPinConfigs] = useState<PinConfiguration[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [editingPin, setEditingPin] = useState<PinConfiguration | null>(null);
  
  // System Configuration State
  const [systemConfigs, setSystemConfigs] = useState<SystemConfiguration[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemConfiguration | null>(null);

  // Mock data - replace with actual API calls
  const mockPinConfigs: PinConfiguration[] = [
    {
      id: "1",
      name: "Emergency Button",
      pin_number: 18,
      mode: "input",
      enabled: true,
      default_value: false,
      description: "Emergency stop button input",
      last_updated: new Date().toISOString(),
    },
    {
      id: "2", 
      name: "Door Lock Control",
      pin_number: 19,
      mode: "output",
      enabled: true,
      default_value: false,
      description: "Controls main door lock mechanism",
      last_updated: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Alarm Output",
      pin_number: 20,
      mode: "output",
      enabled: true,
      default_value: false,
      description: "Alarm system activation output",
      last_updated: new Date().toISOString(),
    },
  ];

  const mockSystemConfigs: SystemConfiguration[] = [
    {
      id: "1",
      name: "max_temperature_threshold",
      value: "35.0",
      type: "number",
      category: "Safety",
      description: "Maximum temperature threshold in Celsius",
      is_sensitive: false,
      last_updated: new Date().toISOString(),
    },
    {
      id: "2",
      name: "mqtt_broker_url",
      value: "mqtt://localhost:1883",
      type: "string", 
      category: "Network",
      description: "MQTT broker connection URL",
      is_sensitive: true,
      last_updated: new Date().toISOString(),
    },
    {
      id: "3",
      name: "auto_backup_enabled",
      value: "true",
      type: "boolean",
      category: "System",
      description: "Enable automatic database backups",
      is_sensitive: false,
      last_updated: new Date().toISOString(),
    },
  ];

  // Load configurations
  const loadPinConfigurations = useCallback(async () => {
    setIsLoadingPins(true);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPinConfigs(mockPinConfigs);
      toast.success("Pin configurations loaded");
    } catch (error) {
      toast.error("Failed to load pin configurations");
    } finally {
      setIsLoadingPins(false);
    }
  }, []);

  const loadSystemConfigurations = useCallback(async () => {
    setIsLoadingSystem(true);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSystemConfigs(mockSystemConfigs);
      toast.success("System configurations loaded");
    } catch (error) {
      toast.error("Failed to load system configurations");
    } finally {
      setIsLoadingSystem(false);
    }
  }, []);

  // Save configurations
  const savePinConfiguration = async (config: PinConfiguration) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPinConfigs(prev => 
        prev.map(p => p.id === config.id ? { ...config, last_updated: new Date().toISOString() } : p)
      );
      setEditingPin(null);
      toast.success("Pin configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save pin configuration");
    }
  };

  const saveSystemConfiguration = async (config: SystemConfiguration) => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSystemConfigs(prev => 
        prev.map(s => s.id === config.id ? { ...config, last_updated: new Date().toISOString() } : s)
      );
      setEditingSystem(null);
      toast.success("System configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save system configuration");
    }
  };

  useEffect(() => {
    loadPinConfigurations();
    loadSystemConfigurations();
  }, [loadPinConfigurations, loadSystemConfigurations]);

  const getPinModeColor = (mode: string) => {
    return mode === "input" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "safety":
        return "bg-red-100 text-red-800";
      case "network":
        return "bg-purple-100 text-purple-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Configuration Management</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            loadPinConfigurations();
            loadSystemConfigurations();
          }}
          disabled={isLoadingPins || isLoadingSystem}
        >
          {(isLoadingPins || isLoadingSystem) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCw className="h-4 w-4" />
          )}
          Refresh All
        </Button>
      </header>

      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pin-config">Pin Configuration</TabsTrigger>
            <TabsTrigger value="system-config">System Configuration</TabsTrigger>
          </TabsList>

          {/* Pin Configuration Tab */}
          <TabsContent value="pin-config" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Pin className="h-5 w-5 text-blue-500" />
                    GPIO Pin Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure GPIO pins for hardware control and monitoring
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPinConfigurations}
                  disabled={isLoadingPins}
                >
                  {isLoadingPins ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RotateCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPins ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pinConfigs.map((pin) => (
                      <Card key={pin.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{pin.name}</h4>
                                <Badge className={getPinModeColor(pin.mode)}>
                                  {pin.mode}
                                </Badge>
                                <Badge variant={pin.enabled ? "default" : "secondary"}>
                                  {pin.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {pin.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Pin: {pin.pin_number}</span>
                                <span>Default: {pin.default_value ? "HIGH" : "LOW"}</span>
                                <span>Updated: {new Date(pin.last_updated).toLocaleString()}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPin(pin)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Configuration Tab */}
          <TabsContent value="system-config" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-green-500" />
                    System Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure system-wide settings and parameters
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSystemConfigurations}
                  disabled={isLoadingSystem}
                >
                  {isLoadingSystem ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RotateCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingSystem ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemConfigs.map((config) => (
                      <Card key={config.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{config.name}</h4>
                                <Badge className={getCategoryColor(config.category)}>
                                  {config.category}
                                </Badge>
                                <Badge variant="outline">
                                  {config.type}
                                </Badge>
                                {config.is_sensitive && (
                                  <Badge variant="destructive" className="text-xs">
                                    Sensitive
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {config.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Value: {config.is_sensitive ? "••••••••" : config.value}</span>
                                <span>Updated: {new Date(config.last_updated).toLocaleString()}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSystem(config)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pin Configuration Edit Dialog */}
      {editingPin && (
        <AlertDialog open={!!editingPin} onOpenChange={() => setEditingPin(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Configure Pin: {editingPin.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Modify the GPIO pin configuration settings below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pin-name">Pin Name</Label>
                <Input
                  id="pin-name"
                  value={editingPin.name}
                  onChange={(e) => setEditingPin({...editingPin, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin-number">Pin Number</Label>
                <Input
                  id="pin-number"
                  type="number"
                  value={editingPin.pin_number}
                  onChange={(e) => setEditingPin({...editingPin, pin_number: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin-mode">Mode</Label>
                <Select
                  value={editingPin.mode}
                  onValueChange={(value: "input" | "output") => setEditingPin({...editingPin, mode: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pin-enabled"
                  checked={editingPin.enabled}
                  onCheckedChange={(checked) => setEditingPin({...editingPin, enabled: checked})}
                />
                <Label htmlFor="pin-enabled">Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pin-default"
                  checked={editingPin.default_value}
                  onCheckedChange={(checked) => setEditingPin({...editingPin, default_value: checked})}
                />
                <Label htmlFor="pin-default">Default Value (HIGH/LOW)</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin-description">Description</Label>
                <Input
                  id="pin-description"
                  value={editingPin.description}
                  onChange={(e) => setEditingPin({...editingPin, description: e.target.value})}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => savePinConfiguration(editingPin)}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* System Configuration Edit Dialog */}
      {editingSystem && (
        <AlertDialog open={!!editingSystem} onOpenChange={() => setEditingSystem(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Configure: {editingSystem.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Modify the system configuration setting below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="config-value">Value</Label>
                {editingSystem.type === "boolean" ? (
                  <Switch
                    checked={editingSystem.value === "true"}
                    onCheckedChange={(checked) => setEditingSystem({...editingSystem, value: checked.toString()})}
                  />
                ) : (
                  <Input
                    id="config-value"
                    type={editingSystem.type === "number" ? "number" : "text"}
                    value={editingSystem.value}
                    onChange={(e) => setEditingSystem({...editingSystem, value: e.target.value})}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-description">Description</Label>
                <Input
                  id="config-description"
                  value={editingSystem.description}
                  onChange={(e) => setEditingSystem({...editingSystem, description: e.target.value})}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Type: {editingSystem.type} | Category: {editingSystem.category}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => saveSystemConfiguration(editingSystem)}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarInset>
  );
}