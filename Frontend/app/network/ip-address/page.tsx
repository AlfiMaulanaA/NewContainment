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
  Trash2
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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          <h1 className="text-lg font-semibold">IP Address Management</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Network Configuration</h2>
            <p className="text-muted-foreground">
              Manage network interfaces, IP addresses, and network settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchConfigurations} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => openEditDialog()} disabled={isLoading}>
              <Plus className="w-4 h-4 mr-2" />
              Add Configuration
            </Button>
          </div>
        </div>

        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configurations">Configurations</TabsTrigger>
            <TabsTrigger value="status">Interface Status</TabsTrigger>
            <TabsTrigger value="connectivity">Connectivity Test</TabsTrigger>
            <TabsTrigger value="interfaces-file">Interfaces File</TabsTrigger>
          </TabsList>

          {/* Configurations Tab */}
          <TabsContent value="configurations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Configurations</CardTitle>
                <CardDescription>
                  Manage static IP configurations for network interfaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Loading configurations...</span>
                  </div>
                ) : configurations.length === 0 ? (
                  <div className="text-center py-8">
                    <Network className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No network configurations found</p>
                    <Button onClick={() => openEditDialog()} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Configuration
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          onClick={handleApplyConfigurations} 
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={isLoading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Apply to Interfaces File
                        </Button>
                        <Button 
                          onClick={parseInterfacesFile} 
                          variant="outline"
                          disabled={isLoading}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Parse from Interfaces File
                        </Button>
                        <Button 
                          onClick={handleBackupConfiguration} 
                          variant="outline"
                          disabled={isLoading}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Backup Configuration
                        </Button>
                        <Button 
                          onClick={handleRestoreConfiguration} 
                          variant="outline"
                          disabled={isLoading}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Restore Configuration
                        </Button>
                        <Button 
                          onClick={handleClearAllStatic} 
                          variant="outline"
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Power className="w-4 h-4 mr-2" />
                          Clear All Static
                        </Button>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Subnet Mask</TableHead>
                          <TableHead>Gateway</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configurations.map((config) => (
                          <TableRow key={config.id}>
                            <TableCell className="font-medium">
                              {config.interfaceType === 1 ? "ETH0" : config.interfaceType === 2 ? "ETH1" : `Interface ${config.interfaceType}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.configMethod === 2 ? "default" : "secondary"}>
                                {config.configMethod === 1 ? "DHCP" : config.configMethod === 2 ? "Static" : `Method ${config.configMethod}`}
                              </Badge>
                            </TableCell>
                            <TableCell>{config.ipAddress || "Auto"}</TableCell>
                            <TableCell>{config.subnetMask || "Auto"}</TableCell>
                            <TableCell>{config.gateway || "Auto"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(config)}
                                  disabled={isLoading}
                                  title="Edit Configuration"
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
                                    className="text-orange-600 hover:text-orange-700"
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
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interface Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Interface Status</CardTitle>
                    <CardDescription>
                      Real-time status of network interfaces
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={fetchNetworkStatus} variant="outline" disabled={isLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      onClick={handleRestartNetworking} 
                      variant="outline"
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Restart Networking
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {networkStatus.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No interface status available</p>
                    <Button onClick={fetchNetworkStatus} className="mt-4">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interface</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>MAC Address</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {networkStatus.map((status, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{status.interfaceName}</TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell>{status.currentIpAddress || "N/A"}</TableCell>
                          <TableCell>{status.macAddress || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {status.configMethod === 1 ? "DHCP" : status.configMethod === 2 ? "Static" : `Method ${status.configMethod}`}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(status.lastUpdated).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connectivity Test Tab */}
          <TabsContent value="connectivity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connectivity Test</CardTitle>
                <CardDescription>
                  Test network connectivity to specific IP addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="testIp">IP Address to Test</Label>
                    <Input
                      id="testIp"
                      placeholder="192.168.1.1"
                      value={testIpAddress}
                      onChange={(e) => setTestIpAddress(e.target.value)}
                      className={testIpAddress && !isValidIP(testIpAddress) ? "border-red-500" : ""}
                    />
                    {testIpAddress && !isValidIP(testIpAddress) && (
                      <p className="text-xs text-red-500 mt-1">Invalid IP address format</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleTestConnectivity} 
                      disabled={isLoading || !testIpAddress}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test Connectivity
                    </Button>
                  </div>
                </div>

                {connectivityResult && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{connectivityResult.ipAddress}</strong> is{" "}
                      <span className={connectivityResult.isReachable ? "text-green-600" : "text-red-600"}>
                        {connectivityResult.isReachable ? "reachable" : "not reachable"}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interfaces File Tab */}
          <TabsContent value="interfaces-file" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Interfaces File</CardTitle>
                <CardDescription>
                  View and manage /etc/network/interfaces file content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={fetchInterfacesFile} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh File Content
                  </Button>
                  <Button onClick={parseInterfacesFile} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Parse to Configurations
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="interfacesContent">File Content</Label>
                  <Textarea
                    id="interfacesContent"
                    value={interfacesFileContent}
                    readOnly
                    rows={15}
                    className="font-mono text-sm"
                    placeholder="No interfaces file content available"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedConfig ? 'Edit Network Configuration' : 'Create Network Configuration'}
              </DialogTitle>
              <DialogDescription>
                Configure network interface settings for static IP or DHCP
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interfaceType">Interface Type</Label>
                  <Select
                    value={editConfig.interfaceType === 1 ? "ETH0" : "ETH1"}
                    onValueChange={(value) => 
                      handleInputChange("interfaceType", value === "ETH0" ? 1 : 2)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH0">ETH0</SelectItem>
                      <SelectItem value="ETH1">ETH1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="configMethod">Configuration Method</Label>
                  <Select
                    value={editConfig.configMethod === 1 ? "DHCP" : "Static"}
                    onValueChange={(value) => 
                      handleInputChange("configMethod", value === "DHCP" ? 1 : 2)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHCP">DHCP</SelectItem>
                      <SelectItem value="Static">Static</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editConfig.configMethod === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ipAddress">IP Address</Label>
                      <Input
                        id="ipAddress"
                        placeholder="192.168.1.100"
                        value={editConfig.ipAddress}
                        onChange={(e) => handleInputChange("ipAddress", e.target.value)}
                        className={editConfig.ipAddress && !isValidIP(editConfig.ipAddress) ? "border-red-500" : ""}
                      />
                      {editConfig.ipAddress && !isValidIP(editConfig.ipAddress) && (
                        <p className="text-xs text-red-500">Invalid IP address format</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subnetMask">Subnet Mask</Label>
                      <Input
                        id="subnetMask"
                        placeholder="255.255.255.0"
                        value={editConfig.subnetMask}
                        onChange={(e) => handleInputChange("subnetMask", e.target.value)}
                        className={editConfig.subnetMask && !isValidNetmask(editConfig.subnetMask) ? "border-red-500" : ""}
                      />
                      {editConfig.subnetMask && !isValidNetmask(editConfig.subnetMask) && (
                        <p className="text-xs text-red-500">Invalid subnet mask format</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gateway">Gateway</Label>
                      <Input
                        id="gateway"
                        placeholder="192.168.1.1"
                        value={editConfig.gateway}
                        onChange={(e) => handleInputChange("gateway", e.target.value)}
                        className={editConfig.gateway && !isValidIP(editConfig.gateway) ? "border-red-500" : ""}
                      />
                      {editConfig.gateway && !isValidIP(editConfig.gateway) && (
                        <p className="text-xs text-red-500">Invalid gateway IP address</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metric">Metric (Optional)</Label>
                      <Input
                        id="metric"
                        placeholder="100"
                        value={editConfig.metric}
                        onChange={(e) => handleInputChange("metric", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryDns">Primary DNS (Optional)</Label>
                      <Input
                        id="primaryDns"
                        placeholder="8.8.8.8"
                        value={editConfig.primaryDns}
                        onChange={(e) => handleInputChange("primaryDns", e.target.value)}
                        className={editConfig.primaryDns && !isValidIP(editConfig.primaryDns) ? "border-red-500" : ""}
                      />
                      {editConfig.primaryDns && !isValidIP(editConfig.primaryDns) && (
                        <p className="text-xs text-red-500">Invalid DNS IP address</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryDns">Secondary DNS (Optional)</Label>
                      <Input
                        id="secondaryDns"
                        placeholder="8.8.4.4"
                        value={editConfig.secondaryDns}
                        onChange={(e) => handleInputChange("secondaryDns", e.target.value)}
                        className={editConfig.secondaryDns && !isValidIP(editConfig.secondaryDns) ? "border-red-500" : ""}
                      />
                      {editConfig.secondaryDns && !isValidIP(editConfig.secondaryDns) && (
                        <p className="text-xs text-red-500">Invalid DNS IP address</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveConfiguration}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedConfig ? 'Update Configuration' : 'Create Configuration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}