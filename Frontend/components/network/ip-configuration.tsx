"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Download,
  Power,
  Loader2
} from "lucide-react";
import { 
  NetworkConfiguration, 
  NetworkConfigurationRequest, 
  NetworkInterfaceStatus,
  networkConfigurationApi
} from "@/lib/api-service";
import { TableSkeleton } from "@/components/loading-skeleton";

// Types
type NetworkInterfaceType = 'ETH0' | 'ETH1';
type NetworkConfigMethod = 'DHCP' | 'Static';

interface IPConfigurationProps {
  isLoading?: boolean;
}

const IPConfiguration: React.FC<IPConfigurationProps> = ({ isLoading: parentLoading = false }) => {
  const [configurations, setConfigurations] = useState<NetworkConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<NetworkConfiguration | null>(null);
  const [editConfig, setEditConfig] = useState<NetworkConfigurationRequest>({
    interfaceType: 'ETH0',
    configMethod: 'Static',
    ipAddress: "",
    subnetMask: "",
    gateway: "",
    primaryDns: "",
    secondaryDns: "",
    metric: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkInterfaceStatus[]>([]);
  const [testIpAddress, setTestIpAddress] = useState("");

  // Memoized validation functions
  const { isValidIP, isValidNetmask } = useMemo(() => ({
    isValidIP: (ip: string) => {
      if (!ip) return false;
      return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);
    },
    isValidNetmask: (mask: string) => {
      if (!mask) return false;
      const validMasks = [
        "255.255.255.255", "255.255.255.254", "255.255.255.252", "255.255.255.248",
        "255.255.255.240", "255.255.255.224", "255.255.255.192", "255.255.255.128",
        "255.255.255.0", "255.255.254.0", "255.255.252.0", "255.255.248.0",
        "255.255.240.0", "255.255.224.0", "255.255.192.0", "255.255.128.0",
        "255.255.0.0", "255.254.0.0", "255.252.0.0", "255.248.0.0",
        "255.240.0.0", "255.224.0.0", "255.192.0.0", "255.128.0.0", "255.0.0.0"
      ];
      return validMasks.includes(mask);
    }
  }), []);

  const handleInputChange = (field: keyof NetworkConfigurationRequest, value: string | 'ETH0' | 'ETH1' | 'DHCP' | 'Static') => {
    setEditConfig(prev => ({ ...prev, [field]: value }));
  };

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await networkConfigurationApi.getAllConfigurations();
      if (response.success && response.data) {
        setConfigurations(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load network configurations',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const response = await networkConfigurationApi.getInterfaceStatus();
      if (response.success && response.data) {
        setNetworkStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch network status:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      if (editConfig.configMethod === 'Static') {
        if (!editConfig.ipAddress || !editConfig.subnetMask || !editConfig.gateway || 
            !isValidIP(editConfig.ipAddress) || !isValidNetmask(editConfig.subnetMask) || !isValidIP(editConfig.gateway)) {
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please provide valid IP address, subnet mask, and gateway for static configuration',
            position: 'top-end',
            timer: 3000,
            toast: true,
            showConfirmButton: false
          });
          return;
        }
      }

      setIsLoading(true);
      let response;

      if (selectedConfig) {
        response = await networkConfigurationApi.updateConfiguration(selectedConfig.id, editConfig);
      } else {
        response = await networkConfigurationApi.createConfiguration(editConfig);
      }

      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Network configuration ${selectedConfig ? 'updated' : 'created'} successfully`,
          position: 'top-end',
          timer: 3000,
          toast: true,
          showConfirmButton: false
        });
        setIsDialogOpen(false);
        await fetchConfigurations();
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save network configuration',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnectivity = async () => {
    if (!isValidIP(testIpAddress)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid IP',
        text: 'Please enter a valid IP address to test',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await networkConfigurationApi.testConnectivity({ ipAddress: testIpAddress });

      if (response.success && response.data) {
        Swal.fire({
          icon: response.data.isReachable ? 'success' : 'error',
          title: response.data.isReachable ? 'Reachable' : 'Not Reachable',
          text: `${testIpAddress} is ${response.data.isReachable ? 'reachable' : 'not reachable'}`,
          position: 'top-end',
          timer: 3000,
          toast: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Failed to test connectivity:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to test connectivity',
        position: 'top-end',
        timer: 3000,
        toast: true,
        showConfirmButton: false
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        interfaceType: 'ETH0',
        configMethod: 'Static',
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

  useEffect(() => {
    if (!parentLoading) {
      fetchConfigurations();
      fetchNetworkStatus();
    }
  }, [parentLoading]);

  if (parentLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Tabs defaultValue="interfaces" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="connectivity">Test</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          <TabsContent value="interfaces" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Interfaces</CardTitle>
                <CardDescription>Loading network interface configurations...</CardDescription>
              </CardHeader>
              <CardContent>
                <TableSkeleton />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="interfaces" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="connectivity">Test</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="interfaces" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Network Interfaces</CardTitle>
                  <CardDescription>Configure ETH0 and ETH1 network interfaces</CardDescription>
                </div>
                <Button onClick={() => openEditDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Interface
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {configurations.length === 0 ? (
                <div className="text-center py-8">
                  <Network className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No network interfaces configured</p>
                  <Button onClick={() => openEditDialog()} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Configure First Interface
                  </Button>
                </div>
              ) : (
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
                        <TableCell className="font-medium">{config.interfaceType}</TableCell>
                        <TableCell>
                          <Badge variant={config.configMethod === 'Static' ? "default" : "secondary"}>
                            {config.configMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>{config.ipAddress || "Auto"}</TableCell>
                        <TableCell>{config.subnetMask || "Auto"}</TableCell>
                        <TableCell>{config.gateway || "Auto"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(config)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interface Status</CardTitle>
              <CardDescription>Current status of network interfaces</CardDescription>
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
                      <TableHead>Speed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {networkStatus.map((status, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{status.interfaceName}</TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>{status.currentIpAddress || "N/A"}</TableCell>
                        <TableCell>{"N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Connectivity</CardTitle>
              <CardDescription>Test network connectivity to specific IP addresses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter IP address (e.g., 8.8.8.8)"
                  value={testIpAddress}
                  onChange={(e) => setTestIpAddress(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTestConnectivity} disabled={!testIpAddress}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Actions</CardTitle>
              <CardDescription>Apply configurations and manage network services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button disabled={configurations.length === 0} className="h-16">
                  <div className="flex flex-col items-center">
                    <Download className="w-5 h-5 mb-1" />
                    <span>Apply Configuration</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-16">
                  <div className="flex flex-col items-center">
                    <Power className="w-5 h-5 mb-1" />
                    <span>Restart Networking</span>
                  </div>
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Important Notes</h4>
                    <ul className="text-sm text-amber-700 mt-1 space-y-1">
                      <li>• Applying configuration modifies /etc/network/interfaces</li>
                      <li>• Network restart may temporarily disconnect the device</li>
                      <li>• Always backup configurations before making changes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? "Edit Network Interface" : "Add Network Interface"}
            </DialogTitle>
            <DialogDescription>
              Configure network interface settings for static IP or DHCP
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interface">Interface Type</Label>
                <Select
                  value={editConfig.interfaceType}
                  onValueChange={(value) => handleInputChange("interfaceType", value as 'ETH0' | 'ETH1')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH0">ETH0</SelectItem>
                    <SelectItem value="ETH1">ETH1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Configuration Method</Label>
                <Select
                  value={editConfig.configMethod}
                  onValueChange={(value) => handleInputChange("configMethod", value as 'DHCP' | 'Static')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DHCP">DHCP</SelectItem>
                    <SelectItem value="Static">Static</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editConfig.configMethod === 'Static' && (
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
                    <Label htmlFor="primaryDns">Primary DNS</Label>
                    <Input
                      id="primaryDns"
                      placeholder="8.8.8.8"
                      value={editConfig.primaryDns}
                      onChange={(e) => handleInputChange("primaryDns", e.target.value)}
                      className={editConfig.primaryDns && !isValidIP(editConfig.primaryDns) ? "border-red-500" : ""}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfiguration} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {selectedConfig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(IPConfiguration);