"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Fingerprint,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Search,
  Server,
  Filter,
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import {
  palmRecognitionDeviceApi,
  PalmRecognitionDevice,
  CreatePalmRecognitionDeviceRequest,
  UpdatePalmRecognitionDeviceRequest,
  usersApi,
  User,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import {
  usePermissions,
  PermissionWrapper,
  CrudPermission,
} from "@/lib/role-permissions";
import { usePalmRecognitionDeviceMQTT } from "@/hooks/usePalmRecognitionDevicesMQTT";

const ITEMS_PER_PAGE = 10;

export default function PalmRecognitionDeviceManagementPage() {
  const permissions = usePermissions();

  // MQTT hook for device connections
  const {
    connections: deviceConnections,
    connectDevice: connectToDevice,
    disconnectDevice: disconnectFromDevice,
    reconnectDevice: reconnectToDevice,
    publishToDevice,
    getDeviceConnection,
  } = usePalmRecognitionDeviceMQTT();

  const [devices, setDevices] = useState<PalmRecognitionDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPalmRegistrationDialog, setShowPalmRegistrationDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PalmRecognitionDevice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Palm User Registration state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDeviceForRegistration, setSelectedDeviceForRegistration] = useState<PalmRecognitionDevice | null>(null);
  const [selectedUserForRegistration, setSelectedUserForRegistration] = useState<number | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<
    CreatePalmRecognitionDeviceRequest | UpdatePalmRecognitionDeviceRequest
  >({
    name: "",
    ipAddress: "",
    isActive: false,
  });

  // Stats calculations
  const totalDevices = devices.length;

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(devices);
  const {
    searchQuery,
    setSearchQuery,
    filteredData: searchFiltered,
  } = useSearchFilter(sorted, [
    "name",
    "ipAddress",
  ]);

  // Pagination logic
  const totalPages = Math.ceil(searchFiltered.length / ITEMS_PER_PAGE);
  const paginatedDevices = searchFiltered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Load devices
  const loadDevices = async () => {
    setLoading(true);
    try {
      const result = await palmRecognitionDeviceApi.getAllPalmRecognitionDevices();
      if (result.success && result.data) {
        setDevices(result.data);
      } else {
        toast.error(result.message || "Failed to load palm recognition devices");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading palm recognition devices");
    } finally {
      setLoading(false);
    }
  };

  // Set form to initial state
  const resetForm = () => {
    setFormData({
      name: "",
      ipAddress: "",
      isActive: false,
    });
    setEditingDevice(null);
  };

  // Handle create device
  const handleCreateDevice = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    if (!formData.ipAddress.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    // Basic IP address validation
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!ipRegex.test(formData.ipAddress)) {
      toast.error("Please enter a valid IP address");
      return;
    }

    setActionLoading(true);
    try {
      const result = await palmRecognitionDeviceApi.createPalmRecognitionDevice(
        formData as CreatePalmRecognitionDeviceRequest
      );
      if (result.success) {
        toast.success("Palm recognition device created successfully");
        setShowCreateDialog(false);
        resetForm();
        await loadDevices();
      } else {
        toast.error(result.message || "Failed to create palm recognition device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating palm recognition device");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit device
  const handleEditDevice = (device: PalmRecognitionDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      ipAddress: device.ipAddress,
      isActive: device.isActive,
    });
    setShowEditDialog(true);
  };

  // Handle update device
  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    if (!formData.name.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    if (!formData.ipAddress.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    // Basic IP address validation
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!ipRegex.test(formData.ipAddress)) {
      toast.error("Please enter a valid IP address");
      return;
    }

    setActionLoading(true);
    try {
      const result = await palmRecognitionDeviceApi.updatePalmRecognitionDevice(
        editingDevice.id,
        formData as UpdatePalmRecognitionDeviceRequest
      );
      if (result.success) {
        toast.success("Palm recognition device updated successfully");
        setShowEditDialog(false);
        resetForm();
        await loadDevices();
      } else {
        toast.error(result.message || "Failed to update palm recognition device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating palm recognition device");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete device
  const handleDeleteDevice = async (deviceId: number) => {
    setActionLoading(true);
    try {
      const result = await palmRecognitionDeviceApi.deletePalmRecognitionDevice(deviceId);
      if (result.success) {
        toast.success("Palm recognition device deleted successfully");
        await loadDevices();
        // Disconnect MQTT connection if exists
        disconnectFromDevice(deviceId);
      } else {
        toast.error(result.message || "Failed to delete palm recognition device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting palm recognition device");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle MQTT connection
  const handleConnectDevice = async (deviceId: number, ipAddress: string) => {
    try {
      const success = await connectToDevice(deviceId, ipAddress);
      if (success) {
        toast.success(`Connected to device at ${ipAddress}`);
      } else {
        toast.error(`Failed to connect to device at ${ipAddress}`);
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(`Connection error: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle MQTT disconnection
  const handleDisconnectDevice = (deviceId: number) => {
    try {
      disconnectFromDevice(deviceId);
      toast.success("Disconnected from device");
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error(`Disconnect error: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle MQTT reconnection
  const handleReconnectDevice = async (deviceId: number, ipAddress: string) => {
    try {
      const success = await reconnectToDevice(deviceId);
      if (success) {
        toast.success(`Reconnected to device at ${ipAddress}`);
      } else {
        toast.error(`Failed to reconnect to device at ${ipAddress}`);
      }
    } catch (error: any) {
      console.error("Reconnection error:", error);
      toast.error(`Reconnection error: ${error?.message || 'Unknown error'}`);
    }
  };

  // Get device connection status
  const getDeviceConnectionStatus = (deviceId: number) => {
    const connection = getDeviceConnection(deviceId);
    return connection || null;
  };

  // Stats calculations
  const connectedDevices = deviceConnections.filter(c => c.isConnected).length;

  // Load users from API
  const loadUsers = async () => {
    try {
      const result = await usersApi.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.log("Error loading users:", error);
    }
  };

  // Handle active device change (single selection logic)
  const handleActiveDeviceChange = async (deviceId: number, isChecked: boolean) => {
    if (!permissions.device.canUpdate) {
      toast.error("No permission to change device status");
      return;
    }

    if (isChecked) {
      // Immediate UI update for better UX
      const updatedDevices = devices.map(device => ({
        ...device,
        isActive: device.id === deviceId
      }));
      setDevices(updatedDevices);

      try {
        // Update all devices asynchronously (set one to active, others to inactive)
        const inactivePromises = devices
          .filter(d => d.id !== deviceId)
          .map(device =>
            palmRecognitionDeviceApi.updatePalmRecognitionDevice(device.id, {
              name: device.name,
              ipAddress: device.ipAddress,
              isActive: false,
            })
          );

        const activePromise = palmRecognitionDeviceApi.updatePalmRecognitionDevice(deviceId, {
          name: devices.find(d => d.id === deviceId)?.name || "",
          ipAddress: devices.find(d => d.id === deviceId)?.ipAddress || "",
          isActive: true,
        });

        await Promise.all([...inactivePromises, activePromise]);

        toast.success(`Device ${devices.find(d => d.id === deviceId)?.name} is now active`);
        await loadDevices(); // Refresh from server to ensure consistency
      } catch (error: any) {
        // Revert UI state on error
        await loadDevices();
        toast.error(`Failed to update device status: ${error.message || "Unknown error"}`);
      }
    } else {
      // If unchecking a device, prevent it if it's the only active device
      const activeDevicesCount = devices.filter(d => d.isActive).length;
      if (activeDevicesCount <= 1) {
        toast.warning("At least one device must remain active");
        return;
      }

      // Immediate UI update
      const updatedDevices = devices.map(device => ({
        ...device,
        isActive: device.id === deviceId ? false : device.isActive
      }));
      setDevices(updatedDevices);

      try {
        await palmRecognitionDeviceApi.updatePalmRecognitionDevice(deviceId, {
          name: devices.find(d => d.id === deviceId)?.name || "",
          ipAddress: devices.find(d => d.id === deviceId)?.ipAddress || "",
          isActive: false,
        });

        toast.success(`Device ${devices.find(d => d.id === deviceId)?.name} is now inactive`);
        await loadDevices(); // Refresh from server to ensure consistency
      } catch (error: any) {
        // Revert UI state on error
        await loadDevices();
        toast.error(`Failed to update device status: ${error.message || "Unknown error"}`);
      }
    }
  };

  // Handle palm user registration
  const handlePalmUserRegistration = (device: PalmRecognitionDevice) => {
    setSelectedDeviceForRegistration(device);
    setSelectedUserForRegistration(null);
    setShowPalmRegistrationDialog(true);
  };

  // Register palm user function
  const registerPalmUser = async () => {
    if (!selectedDeviceForRegistration || !selectedUserForRegistration) {
      toast.error("Please select both device and user");
      return;
    }

    const connection = getDeviceConnection(selectedDeviceForRegistration.id);
    if (!connection?.isConnected) {
      toast.error("Device is not connected. Please connect to the device first");
      return;
    }

    setRegistrationLoading(true);
    const selectedUser = users.find(u => u.id === selectedUserForRegistration);

    if (!selectedUser) {
      setRegistrationLoading(false);
      toast.error("Selected user not found");
      return;
    }

    try {
      // Publish regist command to palm broker
      const payload = JSON.stringify({
        command: "regist",
        user_id: selectedUser.name
      });

      const success = await publishToDevice(selectedDeviceForRegistration.id, 'palm/control', payload);

      if (success) {
        toast.success(`Palm registration initiated for user: ${selectedUser.name} on device: ${selectedDeviceForRegistration.name}`);
        setShowPalmRegistrationDialog(false);
        setSelectedDeviceForRegistration(null);
        setSelectedUserForRegistration(null);
      } else {
        toast.error(`Failed to send palm registration for user: ${selectedUser.name}`);
      }
    } catch (error) {
      toast.error(`Error registering palm for user ${selectedUser.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegistrationLoading(false);
    }
  };

  // Auto-connect to active devices when devices list changes
  useEffect(() => {
    if (!loading && devices.length > 0) {
      const activeDevices = devices.filter(device => device.isActive);
      activeDevices.forEach(device => {
        const connection = getDeviceConnection(device.id);
        // Auto-connect if not already connected or connecting
        if (!connection?.isConnected && !connection?.isConnecting) {
          console.log(`🔗 Auto-connecting to active device: ${device.name} (${device.ipAddress})`);
          connectToDevice(device.id, device.ipAddress)
            .then(success => {
              if (!success) {
                console.warn(`Failed to auto-connect to ${device.name} after 15 seconds`);
              }
            })
            .catch(error => {
              console.error(`Auto-connect error for ${device.name}:`, error);
            });
        }
      });
    }
  }, [devices, loading, connectToDevice, getDeviceConnection]);

  // Load data on component mount
  useEffect(() => {
    loadDevices();
    loadUsers();
  }, []);

  return (
    <SidebarInset>
      <PageHeader
        icon={Fingerprint}
        title="Palm Recognition Device Management"
        subtitle="Manage palm recognition devices in the system"
        actions={
          <CrudPermission module="deviceManagement" operation="create">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Palm Recognition Device</DialogTitle>
                  <DialogDescription>
                    Create a new palm recognition device with basic configuration.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Device Name */}
                  <div>
                    <Label htmlFor="name">Device Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter device name"
                    />
                  </div>

                  {/* IP Address */}
                  <div>
                    <Label htmlFor="ipAddress">IP Address *</Label>
                    <Input
                      id="ipAddress"
                      value={formData.ipAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, ipAddress: e.target.value })
                      }
                      placeholder="192.168.1.100"
                    />
                  </div>

                  {/* Is Active */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive">Active Device</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDevice} disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Device"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CrudPermission>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Fingerprint className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">All palm recognition devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{connectedDevices}</div>
            <p className="text-xs text-muted-foreground">MQTT connections active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connecting</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {deviceConnections.filter(c => c.isConnecting).length}
            </div>
            <p className="text-xs text-muted-foreground">Devices establishing connection</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Palm Recognition Devices ({searchFiltered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      Device Name{" "}
                      <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("ipAddress")}
                    >
                      IP Address <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <PermissionWrapper
                      condition={
                        permissions.device.canUpdate ||
                        permissions.device.canDelete
                      }
                    >
                      <TableHead className="text-right">Actions</TableHead>
                    </PermissionWrapper>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDevices.length > 0 ? (
                    paginatedDevices.map((device, index) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {device.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.ipAddress}
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={device.isActive}
                            onChange={(e) => handleActiveDeviceChange(device.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            disabled={!permissions.device.canUpdate}
                            title={permissions.device.canUpdate ? "Toggle device active status" : "No permission to change device status"}
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const connection = getDeviceConnectionStatus(device.id);
                            let statusText = "Disconnected";
                            let statusVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                            let icon = null;

                            if (connection?.isConnecting) {
                              statusText = "Connecting";
                              statusVariant = "outline";
                              icon = <RefreshCw className="h-3 w-3 mr-1 animate-spin" />;
                            } else if (connection?.isConnected) {
                              statusText = "Connected";
                              statusVariant = "default";
                              // Update with connected timestamp if available
                              icon = <Wifi className="h-3 w-3 mr-1" />;
                            } else if (connection?.error) {
                              statusText = "Error";
                              statusVariant = "destructive";
                              icon = <AlertCircle className="h-3 w-3 mr-1" />;
                            }

                            return (
                              <Badge variant={statusVariant} className="text-xs">
                                {icon}
                                {statusText}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {device.timestamp
                            ? new Date(device.timestamp).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {/* MQTT Connection Status Indicator */}
                          {(() => {
                            const connection = getDeviceConnectionStatus(device.id);
                            if (connection?.isConnected) {
                              return (
                                <div className="flex items-center justify-end gap-2 text-green-600">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium">Connected</span>
                                </div>
                              );
                            } else if (connection?.isConnecting) {
                              return (
                                <div className="flex items-center justify-end gap-2 text-yellow-600">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium">Connecting...</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center justify-end gap-2 text-red-600">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-xs font-medium">Disconnected</span>
                                </div>
                              );
                            }
                          })()}

                          {/* Edit and Delete controls for authorized users */}
                          <PermissionWrapper
                            condition={
                              permissions.device.canUpdate ||
                              permissions.device.canDelete
                            }
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-600 hover:bg-purple-50"
                              onClick={() => handlePalmUserRegistration(device)}
                              title="Register Palm User"
                              disabled={!getDeviceConnectionStatus(device.id)?.isConnected}
                            >
                              <Fingerprint className="h-4 w-4" />
                            </Button>
                            <CrudPermission
                              module="deviceManagement"
                              operation="update"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => handleEditDevice(device)}
                                title="Edit Device"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </CrudPermission>
                            <CrudPermission
                              module="deviceManagement"
                              operation="delete"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-red-600 bg-red-100 hover:bg-red-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Palm Recognition Device
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{device.name}"?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteDevice(device.id)
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </CrudPermission>
                          </PermissionWrapper>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          7 +
                          (permissions.device.canUpdate ||
                          permissions.device.canDelete
                            ? 1
                            : 0)
                        }
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No palm recognition devices found matching your search."
                          : "No palm recognition devices found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(p - 1, 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(p + 1, totalPages))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Palm Recognition Device: {editingDevice?.name}</DialogTitle>
            <DialogDescription>
              Update the device information. Modify the fields below and click Update to save changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Device Name */}
            <div>
              <Label htmlFor="edit-name">Device Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter device name"
              />
            </div>

            {/* IP Address */}
            <div>
              <Label htmlFor="edit-ipAddress">IP Address *</Label>
              <Input
                id="edit-ipAddress"
                value={formData.ipAddress}
                onChange={(e) =>
                  setFormData({ ...formData, ipAddress: e.target.value })
                }
                placeholder="192.168.1.100"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Active Device</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDevice} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Palm User Registration Dialog */}
      <Dialog open={showPalmRegistrationDialog} onOpenChange={setShowPalmRegistrationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Register Palm User
            </DialogTitle>
            <DialogDescription>
              Register a user for palm recognition on device: <strong>{selectedDeviceForRegistration?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Selected Device Info */}
            {selectedDeviceForRegistration && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Selected Device:</div>
                <div className="font-medium">{selectedDeviceForRegistration.name}</div>
                <div className="text-sm text-muted-foreground">{selectedDeviceForRegistration.ipAddress}</div>
              </div>
            )}

            {/* User Selection */}
            <div>
              <Label htmlFor="user-select">Select User *</Label>
              <Select
                value={selectedUserForRegistration?.toString() || ""}
                onValueChange={(value) => setSelectedUserForRegistration(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to register" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instruction */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Select a user from the dropdown</li>
                    <li>Click "Register Palm" to send command</li>
                    <li>User must place palm on device scanner</li>
                    <li>The palm data will be captured and stored</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPalmRegistrationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={registerPalmUser}
              disabled={registrationLoading || !selectedUserForRegistration}
            >
              {registrationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Register Palm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
