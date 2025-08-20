"use client";

import React, { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Swal from "sweetalert2";
import { 
  Network, 
  Plus, 
  Edit2, 
  RefreshCw, 
  Save, 
  TestTube, 
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Download,
  Upload,
  Power,
  Loader2,
  Search,
  FileText,
  Trash2,
  CheckCircle2,
  Globe
} from "lucide-react";

import { 
  NetworkConfiguration, 
  NetworkConfigurationRequest, 
  NetworkInterfaceStatus,
  ApplyNetworkConfigRequest,
  TestConnectivityRequest,
  NetworkInterfaceType,
  NetworkConfigMethod,
  getNetworkInterfaceTypeString,
  getNetworkConfigMethodString,
  getNetworkInterfaceTypeFromString,
  getNetworkConfigMethodFromString,
  networkConfigurationApi
} from "@/lib/api-service";

// Validation utilities
const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  const parts = ip.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
};

const isValidNetmask = (netmask: string): boolean => {
  const validMasks = [
    '255.255.255.255', '255.255.255.254', '255.255.255.252', '255.255.255.248',
    '255.255.255.240', '255.255.255.224', '255.255.255.192', '255.255.255.128',
    '255.255.255.0', '255.255.254.0', '255.255.252.0', '255.255.248.0',
    '255.255.240.0', '255.255.224.0', '255.255.192.0', '255.255.128.0',
    '255.255.0.0', '255.254.0.0', '255.252.0.0', '255.248.0.0',
    '255.240.0.0', '255.224.0.0', '255.192.0.0', '255.128.0.0',
    '255.0.0.0', '254.0.0.0', '252.0.0.0', '248.0.0.0',
    '240.0.0.0', '224.0.0.0', '192.0.0.0', '128.0.0.0'
  ];
  return isValidIP(netmask) && validMasks.includes(netmask);
};

export default function NetworkIPAddressPage() {
  // State Management
  const [configurations, setConfigurations] = useState<NetworkConfiguration[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkInterfaceStatus[]>([]);
  const [interfacesFileContent, setInterfacesFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedConfig, setSelectedConfig] = useState<NetworkConfiguration | null>(null);
  const [connectivityResult, setConnectivityResult] = useState<{ ipAddress: string; isReachable: boolean } | null>(null);
  const [testIpAddress, setTestIpAddress] = useState<string>("");

  // Form state
  const [editConfig, setEditConfig] = useState<NetworkConfigurationRequest>({
    interfaceType: 1,
    configMethod: 2,
    ipAddress: "",
    subnetMask: "",
    gateway: "",
    primaryDns: "",
    secondaryDns: "",
    metric: ""
  });

  // Data fetching functions
  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await networkConfigurationApi.getAllConfigurations();
      if (response.success && response.data) {
        setConfigurations(Array.isArray(response.data) ? response.data : []);
      } else {
        console.error('Failed to fetch configurations:', response.message);
        setConfigurations([]);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      setConfigurations([]);
      showErrorAlert('Failed to load network configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const response = await networkConfigurationApi.getInterfaceStatus();
      if (response.success && response.data) {
        setNetworkStatus(Array.isArray(response.data) ? response.data : []);
      } else {
        setNetworkStatus([]);
      }
    } catch (error) {
      console.error('Failed to fetch network status:', error);
      setNetworkStatus([]);
    }
  };

  const fetchInterfacesFile = async () => {
    try {
      const response = await networkConfigurationApi.getInterfacesFile();
      if (response.success && response.data) {
        setInterfacesFileContent(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch interfaces file:', error);
    }
  };

  const parseInterfacesFile = async () => {
    try {
      const response = await networkConfigurationApi.parseInterfacesFile();
      if (response.success && response.data) {
        setConfigurations(Array.isArray(response.data) ? response.data : []);
        showSuccessAlert('Interfaces file parsed successfully');
      } else {
        showErrorAlert(response.message || 'Failed to parse interfaces file');
      }
    } catch (error) {
      console.error('Failed to parse interfaces file:', error);
      showErrorAlert('Failed to parse interfaces file');
    }
  };

  // Configuration management
  const handleSaveConfiguration = async () => {
    try {
      // Validation for static configuration
      if (editConfig.configMethod === 2) {
        if (!editConfig.ipAddress || !editConfig.subnetMask || !editConfig.gateway || 
            !isValidIP(editConfig.ipAddress) || !isValidNetmask(editConfig.subnetMask) || !isValidIP(editConfig.gateway)) {
          showErrorAlert('Please provide valid IP address, subnet mask, and gateway for static configuration');
          return;
        }

        if (editConfig.primaryDns && !isValidIP(editConfig.primaryDns)) {
          showErrorAlert('Please provide a valid primary DNS address');
          return;
        }

        if (editConfig.secondaryDns && !isValidIP(editConfig.secondaryDns)) {
          showErrorAlert('Please provide a valid secondary DNS address');
          return;
        }
      }

      // Ensure enum values are correct integers before sending
      const requestData: NetworkConfigurationRequest = {
        ...editConfig
      };

      console.log('Sending request data:', requestData); // Debug log

      setIsLoading(true);
      let response;

      if (selectedConfig) {
        // Update existing configuration
        response = await networkConfigurationApi.updateConfiguration(selectedConfig.id, requestData);
      } else {
        // Create new configuration
        response = await networkConfigurationApi.createConfiguration(requestData);
      }

      if (response.success) {
        showSuccessAlert(selectedConfig ? 'Configuration updated successfully' : 'Configuration created successfully');
        setIsDialogOpen(false);
        resetForm();
        await fetchConfigurations();
      } else {
        showErrorAlert(response.message || 'Failed to save configuration');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfiguration = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Configuration?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.deleteConfiguration(id);

      if (response.success) {
        showSuccessAlert('Configuration deleted successfully');
        await fetchConfigurations();
      } else {
        showErrorAlert(response.message || 'Failed to delete configuration');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to delete configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToDhcp = async (interfaceType: number) => {
    try {
      const interfaceString = interfaceType === 1 ? "ETH0" : "ETH1";
      
      const result = await Swal.fire({
        title: `Revert ${interfaceString} to DHCP?`,
        text: 'This will remove the static IP configuration and set the interface to use DHCP.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, revert to DHCP!'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.revertToDhcp(interfaceType);

      if (response.success) {
        showSuccessAlert(`${interfaceString} successfully reverted to DHCP`);
        await fetchConfigurations();
      } else {
        showErrorAlert(response.message || 'Failed to revert interface to DHCP');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to revert interface to DHCP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyConfigurations = async () => {
    try {
      const result = await Swal.fire({
        title: 'Apply Network Configurations?',
        text: 'This will write configurations to /etc/network/interfaces and restart networking.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, apply configurations!',
        input: 'checkbox',
        inputValue: 1,
        inputPlaceholder: 'Backup current configuration before applying'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const applyRequest: ApplyNetworkConfigRequest = {
        restartNetworking: true,
        backupCurrentConfig: !!result.value
      };

      const response = await networkConfigurationApi.applyConfiguration(applyRequest);

      if (response.success) {
        showSuccessAlert('Network configurations applied successfully');
        await fetchConfigurations();
        await fetchNetworkStatus();
      } else {
        showErrorAlert(response.message || 'Failed to apply network configurations');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to apply network configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnectivity = async () => {
    if (!testIpAddress || !isValidIP(testIpAddress)) {
      showErrorAlert('Please enter a valid IP address');
      return;
    }

    try {
      setIsLoading(true);
      const request: TestConnectivityRequest = { ipAddress: testIpAddress };
      const response = await networkConfigurationApi.testConnectivity(request);

      if (response.success && response.data) {
        setConnectivityResult(response.data);
        showInfoAlert(
          response.data.isReachable 
            ? `${testIpAddress} is reachable` 
            : `${testIpAddress} is not reachable`
        );
      } else {
        showErrorAlert(response.message || 'Failed to test connectivity');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to test connectivity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupConfiguration = async () => {
    try {
      const result = await Swal.fire({
        title: 'Backup Network Configuration?',
        text: 'This will create a backup of the current /etc/network/interfaces file.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, backup now!'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.backupConfiguration();

      if (response.success) {
        showSuccessAlert('Network configuration backed up successfully');
      } else {
        showErrorAlert(response.message || 'Failed to backup network configuration');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to backup network configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreConfiguration = async () => {
    try {
      const result = await Swal.fire({
        title: 'Restore Network Configuration?',
        text: 'This will restore the network configuration from backup. Current configuration will be lost!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, restore from backup!'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.restoreConfiguration();

      if (response.success) {
        showSuccessAlert('Network configuration restored successfully');
        await fetchConfigurations();
        await fetchNetworkStatus();
      } else {
        showErrorAlert(response.message || 'Failed to restore network configuration');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to restore network configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllStatic = async () => {
    try {
      const result = await Swal.fire({
        title: 'Clear All Static Configurations?',
        text: 'This will revert ALL interfaces to DHCP. All static IP configurations will be removed!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, clear all static configs!',
        input: 'checkbox',
        inputValue: 1,
        inputPlaceholder: 'I understand this will remove all static IP configurations'
      });

      if (!result.isConfirmed || !result.value) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.clearAllStaticConfigurations();

      if (response.success) {
        showSuccessAlert('All static configurations cleared successfully');
        await fetchConfigurations();
        await fetchNetworkStatus();
      } else {
        showErrorAlert(response.message || 'Failed to clear static configurations');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to clear static configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartNetworking = async () => {
    try {
      const result = await Swal.fire({
        title: 'Restart Networking Service?',
        text: 'This will restart the networking service. Network connections may be temporarily interrupted!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, restart networking!'
      });

      if (!result.isConfirmed) return;

      setIsLoading(true);
      const response = await networkConfigurationApi.restartNetworking();

      if (response.success) {
        showSuccessAlert('Networking service restarted successfully');
        // Wait a bit for network to stabilize, then refresh status
        setTimeout(async () => {
          await fetchNetworkStatus();
        }, 3000);
      } else {
        showErrorAlert(response.message || 'Failed to restart networking service');
      }
    } catch (error: any) {
      showErrorAlert(error.message || 'Failed to restart networking service');
    } finally {
      setIsLoading(false);
    }
  };

  // UI helpers
  const openEditDialog = (config?: NetworkConfiguration) => {
    if (config) {
      setSelectedConfig(config);
      setEditConfig({
        interfaceType: config.interfaceType,
        configMethod: config.configMethod,
        ipAddress: config.ipAddress || "",
        subnetMask: config.subnetMask || "",
        gateway: config.gateway || "",
        primaryDns: config.primaryDns || "",
        secondaryDns: config.secondaryDns || "",
        metric: config.metric || ""
      });
    } else {
      setSelectedConfig(null);
      setEditConfig({
        interfaceType: 1,
        configMethod: 2,
        ipAddress: "",
        subnetMask: "",
        gateway: "",
        primaryDns: "",
        secondaryDns: "",
        metric: ""
      });
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedConfig(null);
    setEditConfig({
      interfaceType: 1,
      configMethod: 2,
      ipAddress: "",
      subnetMask: "",
      gateway: "",
      primaryDns: "",
      secondaryDns: "",
      metric: ""
    });
  };

  const handleInputChange = (field: keyof NetworkConfigurationRequest, value: string | number) => {
    setEditConfig(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: NetworkInterfaceStatus) => {
    const isUp = status.isUp;
    return (
      <Badge variant={isUp ? "default" : "destructive"}>
        {isUp ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Up
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Down
          </>
        )}
      </Badge>
    );
  };

  // Alert helpers
  const showSuccessAlert = (message: string) => {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: message,
      position: 'top-end',
      timer: 3000,
      toast: true,
      showConfirmButton: false
    });
  };

  const showErrorAlert = (message: string) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      position: 'top-end',
      timer: 5000,
      toast: true,
      showConfirmButton: false
    });
  };

  const showInfoAlert = (message: string) => {
    Swal.fire({
      icon: 'info',
      title: 'Information',
      text: message,
      position: 'top-end',
      timer: 3000,
      toast: true,
      showConfirmButton: false
    });
  };

  // Effects
  useEffect(() => {
    fetchConfigurations();
    fetchNetworkStatus();
    fetchInterfacesFile();
  }, []);

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Globe className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">IP Address Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchConfigurations} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Refresh All Data
          </Button>
          <Button onClick={() => openEditDialog()} size="sm" disabled={isLoading}>
            <Plus className="w-4 h-4 mr-1" />
            Add Configuration
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">

        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-10">
            <TabsTrigger value="configurations" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurations
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Interface Status
            </TabsTrigger>
            <TabsTrigger value="connectivity" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Connectivity Test
            </TabsTrigger>
            <TabsTrigger value="interfaces-file" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Interfaces File
            </TabsTrigger>
          </TabsList>

          {/* Configurations Tab */}
          <TabsContent value="configurations" className="space-y-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Network Configurations
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                </CardTitle>
                <CardDescription>
                  Manage static IP configurations for network interfaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                    <span className="text-lg text-blue-500">Loading configurations...</span>
                    <p className="text-sm text-muted-foreground mt-2">Please wait while we fetch network settings</p>
                  </div>
                ) : configurations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-50 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      <Network className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No configurations found</h3>
                    <p className="text-gray-500 mb-6">Start by creating your first network configuration</p>
                    <Button onClick={() => openEditDialog()} className="h-11">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Configuration
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <Button 
                          onClick={handleApplyConfigurations} 
                          className="bg-blue-600 hover:bg-blue-700 h-10"
                          disabled={isLoading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Apply Changes
                        </Button>
                        <Button 
                          onClick={parseInterfacesFile} 
                          variant="outline"
                          disabled={isLoading}
                          className="h-10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Parse File
                        </Button>
                        <Button 
                          onClick={handleBackupConfiguration} 
                          variant="outline"
                          disabled={isLoading}
                          className="h-10"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Backup
                        </Button>
                        <Button 
                          onClick={handleRestoreConfiguration} 
                          variant="outline"
                          disabled={isLoading}
                          className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50 h-10"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                        <Button 
                          onClick={handleClearAllStatic} 
                          variant="outline"
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 h-10"
                        >
                          <Power className="w-4 h-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="font-semibold">Interface</TableHead>
                            <TableHead className="font-semibold">Method</TableHead>
                            <TableHead className="font-semibold">IP Address</TableHead>
                            <TableHead className="font-semibold">Subnet Mask</TableHead>
                            <TableHead className="font-semibold">Gateway</TableHead>
                            <TableHead className="font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {configurations.map((config, index) => (
                            <TableRow key={config.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Network className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">
                                    {config.interfaceType === 1 ? "ETH0" : config.interfaceType === 2 ? "ETH1" : `Interface ${config.interfaceType}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={config.configMethod === 2 ? "default" : "secondary"} className="font-medium">
                                  {config.configMethod === 1 ? "DHCP" : config.configMethod === 2 ? "Static" : `Method ${config.configMethod}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {config.ipAddress || <span className="text-muted-foreground">Auto</span>}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {config.subnetMask || <span className="text-muted-foreground">Auto</span>}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {config.gateway || <span className="text-muted-foreground">Auto</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(config)}
                                    disabled={isLoading}
                                    title="Edit Configuration"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  {config.configMethod === 2 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRevertToDhcp(config.interfaceType)}
                                      disabled={isLoading}
                                      title="Revert to DHCP"
                                      className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50 h-8 w-8 p-0"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteConfiguration(config.id)}
                                    disabled={isLoading}
                                    title="Delete Configuration"
                                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interface Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      Interface Status
                    </CardTitle>
                    <CardDescription>
                      Real-time status of network interfaces
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={fetchNetworkStatus} variant="outline" size="sm" disabled={isLoading}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      onClick={handleRestartNetworking} 
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <Power className="w-4 h-4 mr-1" />
                      Restart Networking
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {networkStatus.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-50 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      <Activity className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No interface status available</h3>
                    <p className="text-gray-500 mb-6">Check network interfaces and refresh status</p>
                    <Button onClick={fetchNetworkStatus} className="h-11">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Interface</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">IP Address</TableHead>
                          <TableHead className="font-semibold">MAC Address</TableHead>
                          <TableHead className="font-semibold">Method</TableHead>
                          <TableHead className="font-semibold">Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {networkStatus.map((status, index) => (
                          <TableRow key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Network className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{status.interfaceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(status)}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {status.currentIpAddress || <span className="text-muted-foreground">N/A</span>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {status.macAddress || <span className="text-muted-foreground">N/A</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {status.configMethod === 1 ? "DHCP" : status.configMethod === 2 ? "Static" : `Method ${status.configMethod}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(status.lastUpdated).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connectivity Test Tab */}
          <TabsContent value="connectivity" className="space-y-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-purple-600" />
                  Connectivity Test
                </CardTitle>
                <CardDescription>
                  Test network connectivity to specific IP addresses using ping
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="testIp" className="text-sm font-semibold">IP Address to Test</Label>
                    <Input
                      id="testIp"
                      placeholder="192.168.1.1"
                      value={testIpAddress}
                      onChange={(e) => setTestIpAddress(e.target.value)}
                      className={`h-11 ${testIpAddress && !isValidIP(testIpAddress) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {testIpAddress && !isValidIP(testIpAddress) && (
                      <p className="text-xs text-red-500 mt-1">Invalid IP address format (e.g., 192.168.1.1)</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleTestConnectivity} 
                      disabled={isLoading || !testIpAddress || !isValidIP(testIpAddress)}
                      className="w-full h-11"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube className="w-4 h-4 mr-2" />
                          Test Connectivity
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {connectivityResult && (
                  <Alert className={`border-2 ${connectivityResult.isReachable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center gap-2">
                      {connectivityResult.isReachable ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className="font-medium">
                        <strong className="font-mono">{connectivityResult.ipAddress}</strong> is{" "}
                        <span className={`font-semibold ${connectivityResult.isReachable ? "text-green-600" : "text-red-600"}`}>
                          {connectivityResult.isReachable ? "reachable" : "not reachable"}
                        </span>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 mb-1">Connectivity Test Information</p>
                      <ul className="text-blue-700 space-y-1 text-xs">
                        <li>• This test uses ICMP ping to check if the target IP is reachable</li>
                        <li>• Some devices may block ping requests while still being accessible</li>
                        <li>• Test results depend on network configuration and firewall settings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interfaces File Tab */}
          <TabsContent value="interfaces-file" className="space-y-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Network Interfaces File
                </CardTitle>
                <CardDescription>
                  View and manage /etc/network/interfaces file content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onClick={fetchInterfacesFile} 
                    variant="outline" 
                    disabled={isLoading}
                    className="h-10"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh File Content
                  </Button>
                  <Button 
                    onClick={parseInterfacesFile} 
                    variant="outline"
                    disabled={isLoading}
                    className="h-10"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Parse to Configurations
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="interfacesContent" className="text-sm font-semibold">
                      File Content (/etc/network/interfaces)
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Read-only view
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-1">
                    <Textarea
                      id="interfacesContent"
                      value={interfacesFileContent}
                      readOnly
                      rows={15}
                      className="font-mono text-sm border-0 resize-none focus-visible:ring-0 bg-slate-50"
                      placeholder="No interfaces file content available. Click 'Refresh File Content' to load..."
                    />
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 mb-1">Interfaces File Information</p>
                      <ul className="text-orange-700 space-y-1 text-xs">
                        <li>• This displays the current content of /etc/network/interfaces</li>
                        <li>• Use "Parse to Configurations" to load settings from this file</li>
                        <li>• Changes made in the UI will be applied to this file when you click "Apply Changes"</li>
                        <li>• Always backup before making changes to network configuration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2">
                {selectedConfig ? (
                  <>
                    <Edit2 className="w-5 h-5 text-blue-600" />
                    Edit Network Configuration
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-green-600" />
                    Create Network Configuration
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Configure network interface settings for static IP or DHCP. Make sure to apply changes after saving.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interfaceType" className="text-sm font-semibold">Interface Type</Label>
                  <Select
                    value={editConfig.interfaceType === 1 ? "ETH0" : "ETH1"}
                    onValueChange={(value) => 
                      handleInputChange("interfaceType", value === "ETH0" ? 1 : 2)
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH0">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          ETH0 (Primary Interface)
                        </div>
                      </SelectItem>
                      <SelectItem value="ETH1">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          ETH1 (Secondary Interface)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="configMethod" className="text-sm font-semibold">Configuration Method</Label>
                  <Select
                    value={editConfig.configMethod === 1 ? "DHCP" : "Static"}
                    onValueChange={(value) => 
                      handleInputChange("configMethod", value === "DHCP" ? 1 : 2)
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHCP">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          DHCP (Automatic)
                        </div>
                      </SelectItem>
                      <SelectItem value="Static">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Static (Manual)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editConfig.configMethod === 2 && (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Static IP Configuration</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Configure manual network settings. All required fields must be valid IP addresses.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ipAddress" className="text-sm font-semibold">IP Address *</Label>
                      <Input
                        id="ipAddress"
                        placeholder="192.168.1.100"
                        value={editConfig.ipAddress}
                        onChange={(e) => handleInputChange("ipAddress", e.target.value)}
                        className={`h-11 font-mono ${editConfig.ipAddress && !isValidIP(editConfig.ipAddress) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {editConfig.ipAddress && !isValidIP(editConfig.ipAddress) && (
                        <p className="text-xs text-red-500">Invalid IP address format (e.g., 192.168.1.100)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subnetMask" className="text-sm font-semibold">Subnet Mask *</Label>
                      <Input
                        id="subnetMask"
                        placeholder="255.255.255.0"
                        value={editConfig.subnetMask}
                        onChange={(e) => handleInputChange("subnetMask", e.target.value)}
                        className={`h-11 font-mono ${editConfig.subnetMask && !isValidNetmask(editConfig.subnetMask) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {editConfig.subnetMask && !isValidNetmask(editConfig.subnetMask) && (
                        <p className="text-xs text-red-500">Invalid subnet mask format (e.g., 255.255.255.0)</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gateway" className="text-sm font-semibold">Gateway *</Label>
                      <Input
                        id="gateway"
                        placeholder="192.168.1.1"
                        value={editConfig.gateway}
                        onChange={(e) => handleInputChange("gateway", e.target.value)}
                        className={`h-11 font-mono ${editConfig.gateway && !isValidIP(editConfig.gateway) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {editConfig.gateway && !isValidIP(editConfig.gateway) && (
                        <p className="text-xs text-red-500">Invalid gateway IP address (e.g., 192.168.1.1)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metric" className="text-sm font-semibold">Metric <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        id="metric"
                        placeholder="100"
                        value={editConfig.metric}
                        onChange={(e) => handleInputChange("metric", e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Network route metric (default: auto)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryDns" className="text-sm font-semibold">Primary DNS <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        id="primaryDns"
                        placeholder="8.8.8.8"
                        value={editConfig.primaryDns}
                        onChange={(e) => handleInputChange("primaryDns", e.target.value)}
                        className={`h-11 font-mono ${editConfig.primaryDns && !isValidIP(editConfig.primaryDns) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {editConfig.primaryDns && !isValidIP(editConfig.primaryDns) && (
                        <p className="text-xs text-red-500">Invalid DNS IP address (e.g., 8.8.8.8)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryDns" className="text-sm font-semibold">Secondary DNS <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        id="secondaryDns"
                        placeholder="8.8.4.4"
                        value={editConfig.secondaryDns}
                        onChange={(e) => handleInputChange("secondaryDns", e.target.value)}
                        className={`h-11 font-mono ${editConfig.secondaryDns && !isValidIP(editConfig.secondaryDns) ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {editConfig.secondaryDns && !isValidIP(editConfig.secondaryDns) && (
                        <p className="text-xs text-red-500">Invalid DNS IP address (e.g., 8.8.4.4)</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-11"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveConfiguration}
                disabled={isLoading}
                className="h-11 min-w-[150px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {selectedConfig ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Configuration
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Configuration
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}