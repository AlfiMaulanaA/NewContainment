"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  HardDrive,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Activity,
  AlertTriangle,
  Search,
  Server,
  Filter,
  ArrowLeft,
  Eye,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  devicesApi,
  racksApi,
  deviceActivityApi,
  Device,
  Rack,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  SensorType,
  DeviceType,
  DeviceActivityInfo,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { DeviceStatusBadge } from "@/components/device-status-badge";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

interface DeviceManagementPageProps {
  rackId?: number;
}

const DEVICE_TYPES = Object.values(DeviceType);

const SENSOR_TYPES = Object.values(SensorType);

export default function DeviceManagementPage({
  rackId: propRackId,
}: DeviceManagementPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get rackId from URL params or props
  const urlRackId = searchParams.get("rackId");
  const rackName = searchParams.get("rackName") || "";
  const rackId = propRackId || (urlRackId ? parseInt(urlRackId) : undefined);

  const [devices, setDevices] = useState<Device[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRackFilter, setSelectedRackFilter] = useState<string>("all");
  const [deviceActivity, setDeviceActivity] = useState<DeviceActivityInfo[]>(
    []
  );
  const [activityLoading, setActivityLoading] = useState(false);

  // Device status hook for real-time status monitoring
  const { 
    deviceStatuses, 
    loading: statusLoading, 
    getDeviceStatusFromCache,
    forceStatusCheck,
    initializeMonitoring 
  } = useDeviceStatus(30000); // Refresh every 30 seconds

  // Form state
  const [formData, setFormData] = useState<
    CreateDeviceRequest | UpdateDeviceRequest
  >({
    name: "",
    type: "",
    rackId: 0,
    description: "",
    serialNumber: "",
    topic: "",
    sensorType: "",
    uCapacity: undefined,
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(devices);
  const {
    searchQuery,
    setSearchQuery,
    filteredData: searchFiltered,
  } = useSearchFilter(sorted, [
    "name",
    "type",
    "description",
    "serialNumber",
    "status",
  ]);

  // Filter by rack - Skip filtering if we already loaded by rack
  const filteredData = rackId
    ? searchFiltered // Already filtered by backend
    : selectedRackFilter === "all"
    ? searchFiltered
    : searchFiltered.filter(
        (device) =>
          device.rackId && device.rackId.toString() === selectedRackFilter
      );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalDevices = devices.length;
  const activeDevices = devices.filter(
    (device) => device.status === "Active"
  ).length;
  const inactiveDevices = totalDevices - activeDevices;

  // Group devices by rack for stats
  const devicesByRack = racks.map((rack) => ({
    rack,
    count: devices.filter((device) => device.rackId === rack.id).length,
  }));

  // Load device activity data
  const loadDeviceActivity = async () => {
    setActivityLoading(true);
    try {
      const result = await deviceActivityApi.getAllDevicesActivity();
      if (result.success && result.data) {
        setDeviceActivity(result.data);
      } else {
        console.warn("Failed to load device activity:", result.message);
      }
    } catch (error: any) {
      console.error("Error loading device activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  // Get activity info for specific device
  const getDeviceActivityInfo = (
    deviceId: number
  ): DeviceActivityInfo | null => {
    return (
      deviceActivity.find((activity) => activity.deviceId === deviceId) || null
    );
  };

  // Load devices by rack ID
  const loadDevicesByRack = async (rackId: number) => {
    setLoading(true);
    try {
      const [devicesResult, racksResult] = await Promise.all([
        devicesApi.getDevicesByRack(rackId),
        racksApi.getRacks(),
      ]);

      if (devicesResult.success && devicesResult.data) {
        setDevices(devicesResult.data);
      } else {
        toast.error(devicesResult.message || "Failed to load devices");
      }

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      // Load device activity
      await loadDeviceActivity();
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Load all devices and racks
  const loadDevices = async () => {
    setLoading(true);
    try {
      const [devicesResult, racksResult] = await Promise.all([
        devicesApi.getDevices(),
        racksApi.getRacks(),
      ]);

      if (devicesResult.success && devicesResult.data) {
        setDevices(devicesResult.data);
      } else {
        toast.error(devicesResult.message || "Failed to load devices");
      }

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      // Load device activity
      await loadDeviceActivity();
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Set filter when rackId changes
  useEffect(() => {
    if (rackId) {
      setSelectedRackFilter(rackId.toString());
      setFormData((prev) => ({ ...prev, rackId }));
    } else {
      setSelectedRackFilter("all");
    }
  }, [rackId]);

  // Load data
  useEffect(() => {
    if (rackId) {
      loadDevicesByRack(rackId);
    } else {
      loadDevices();
    }
  }, [rackId]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      rackId: rackId || 0,
      description: "",
      serialNumber: "",
      topic: "",
      sensorType: "",
      uCapacity: undefined,
    });
    setEditingDevice(null);
  };

  // Handle create device
  const handleCreateDevice = async () => {
    if (!formData.rackId) {
      toast.error("Please select a rack");
      return;
    }

    // Validate sensor type for sensor devices
    if (formData.type === DeviceType.Sensor && !formData.sensorType) {
      toast.error("Please select a sensor type for sensor devices");
      return;
    }

    // Validate U capacity for non-sensor devices
    if (
      formData.type &&
      formData.type !== DeviceType.Sensor &&
      !formData.uCapacity
    ) {
      toast.error("Please select U capacity for non-sensor devices");
      return;
    }

    setActionLoading(true);
    try {
      const result = await devicesApi.createDevice(
        formData as CreateDeviceRequest
      );
      if (result.success) {
        toast.success("Device created successfully");
        setShowCreateDialog(false);
        resetForm();
        if (rackId) {
          loadDevicesByRack(rackId);
        } else {
          loadDevices();
        }
      } else {
        toast.error(result.message || "Failed to create device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating device");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit device
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      type: device.type,
      rackId: device.rackId,
      description: device.description || "",
      serialNumber: device.serialNumber || "",
      topic: device.topic || "",
      sensorType: device.sensorType || "",
      uCapacity: device.uCapacity || undefined,
    });
    setShowEditDialog(true);
  };

  // Handle view device detail
  const handleViewDevice = (device: Device) => {
    setSelectedDevice(device);
    setShowDetailDialog(true);
  };

  // Handle update device
  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    if (!formData.rackId) {
      toast.error("Please select a rack");
      return;
    }

    // Validate sensor type for sensor devices
    if (formData.type === DeviceType.Sensor && !formData.sensorType) {
      toast.error("Please select a sensor type for sensor devices");
      return;
    }

    // Validate U capacity for non-sensor devices
    if (
      formData.type &&
      formData.type !== DeviceType.Sensor &&
      !formData.uCapacity
    ) {
      toast.error("Please select U capacity for non-sensor devices");
      return;
    }

    setActionLoading(true);
    try {
      const result = await devicesApi.updateDevice(
        editingDevice.id,
        formData as UpdateDeviceRequest
      );
      if (result.success) {
        toast.success("Device updated successfully");
        setShowEditDialog(false);
        resetForm();
        if (rackId) {
          loadDevicesByRack(rackId);
        } else {
          loadDevices();
        }
      } else {
        toast.error(result.message || "Failed to update device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating device");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete device
  const handleDeleteDevice = async (deviceId: number) => {
    setActionLoading(true);
    try {
      const result = await devicesApi.deleteDevice(deviceId);
      if (result.success) {
        toast.success("Device deleted successfully");
        if (rackId) {
          loadDevicesByRack(rackId);
        } else {
          loadDevices();
        }
      } else {
        toast.error(result.message || "Failed to delete device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting device");
    } finally {
      setActionLoading(false);
    }
  };

  // Get rack name by ID
  const getRackName = (rackId: number): string => {
    if (!rackId || !racks.length) return "Unknown Rack";
    const rack = racks.find((r) => r.id === rackId);
    return rack ? rack.name : "Unknown Rack";
  };

  // Get rack by ID
  const getRack = (rackId: number): Rack | undefined => {
    if (!rackId || !racks.length) return undefined;
    return racks.find((r) => r.id === rackId);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
      case "offline":
        return "secondary";
      case "error":
      case "fault":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get status badge color based on MQTT activity
  const getStatusBadgeColor = (
    device: Device,
    activityInfo?: DeviceActivityInfo | null
  ) => {
    // For sensor devices, use MQTT-based activity status
    if (device.type?.toLowerCase() === "sensor" && activityInfo) {
      switch (activityInfo.activityStatus?.toLowerCase()) {
        case "online":
          return "text-green-600 bg-green-100";
        case "offline":
          return "text-red-600 bg-red-100";
        case "warning":
          return "text-yellow-600 bg-yellow-100";
        case "never seen":
          return "text-gray-600 bg-gray-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    }

    // For non-sensor devices, use manual status
    switch (device.status?.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
      case "offline":
        return "text-gray-600 bg-gray-100";
      case "error":
      case "fault":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Get display status text based on MQTT activity
  const getDisplayStatus = (
    device: Device,
    activityInfo?: DeviceActivityInfo | null
  ) => {
    // For sensor devices, use MQTT-based activity status
    if (device.type?.toLowerCase() === "sensor" && activityInfo) {
      return activityInfo.activityStatus || "Unknown";
    }

    // For non-sensor devices, use manual status
    return device.status || "Unknown";
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Back button when filtering by rack */}
          {rackId && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/management/racks")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Racks
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4" />
            </>
          )}

          <HardDrive className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Device Management
            {rackId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {rackName || getRackName(rackId)}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Device</DialogTitle>
                <DialogDescription>
                  Create a new device in the selected rack. Choose the device type and fill in the required information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Row 1: Device Name and Type */}
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="type">Device Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          type: value,
                          sensorType: "",
                          uCapacity: undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Conditional Fields - Sensor Type or U Capacity */}
                <div className="grid grid-cols-2 gap-4">
                  {formData.type === DeviceType.Sensor && (
                    <div>
                      <Label htmlFor="sensorType">Sensor Type *</Label>
                      <Select
                        value={formData.sensorType || ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sensorType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sensor type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SENSOR_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.type && formData.type !== DeviceType.Sensor && (
                    <div>
                      <Label htmlFor="uCapacity">U Capacity *</Label>
                      <Select
                        value={
                          formData.uCapacity
                            ? formData.uCapacity.toString()
                            : ""
                        }
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            uCapacity: parseInt(value) || undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select U capacity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1U</SelectItem>
                          <SelectItem value="2">2U</SelectItem>
                          <SelectItem value="3">3U</SelectItem>
                          <SelectItem value="4">4U</SelectItem>
                          <SelectItem value="5">5U</SelectItem>
                          <SelectItem value="6">6U</SelectItem>
                          <SelectItem value="8">8U</SelectItem>
                          <SelectItem value="10">10U</SelectItem>
                          <SelectItem value="12">12U</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="rackId">Rack *</Label>
                    <Select
                      value={
                        formData.rackId && formData.rackId > 0
                          ? formData.rackId.toString()
                          : ""
                      }
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          rackId: parseInt(value) || 0,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rack" />
                      </SelectTrigger>
                      <SelectContent>
                        {racks.map((rack) => (
                          <SelectItem key={rack.id} value={rack.id.toString()}>
                            {rack.name} -{" "}
                            {rack.containment?.name || "Unknown Containment"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Serial Number and Status */}
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serialNumber: e.target.value,
                      })
                    }
                    placeholder="Enter serial number"
                  />
                </div>

                {/* Row 4: MQTT Topic (only for sensors) */}
                {formData.type === DeviceType.Sensor && (
                  <div>
                    <Label htmlFor="topic">MQTT Topic</Label>
                    <Input
                      id="topic"
                      value={formData.topic}
                      onChange={(e) =>
                        setFormData({ ...formData, topic: e.target.value })
                      }
                      placeholder="Enter MQTT topic"
                    />
                  </div>
                )}

                {/* Row 5: Description */}
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter description"
                    rows={3}
                  />
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
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <div className="p-2 bg-gray-100 rounded-lg">
              <HardDrive className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">All devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Devices
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeDevices}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Devices
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactiveDevices}
            </div>
            <p className="text-xs text-muted-foreground">Inactive devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Racks</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{racks.length}</div>
            <p className="text-xs text-muted-foreground">Available racks</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {rackId
                ? `Devices in ${rackName || getRackName(rackId)}`
                : "All Devices"}{" "}
              ({filteredData.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Rack Filter - only show if not filtering by specific rack */}
              {!rackId && (
                <Select
                  value={selectedRackFilter}
                  onValueChange={setSelectedRackFilter}
                >
                  <SelectTrigger className="w-48 h-8">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by rack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Racks</SelectItem>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id.toString()}>
                        {rack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

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
                      onClick={() => handleSort("type")}
                    >
                      Type <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    {!rackId && <TableHead>Rack</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDevices.length > 0 ? (
                    paginatedDevices.map((device, index) => {
                      const rack = getRack(device.rackId);
                      const activityInfo = getDeviceActivityInfo(device.id);
                      return (
                        <TableRow key={device.id}>
                          <TableCell>
                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {device.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{device.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {device.type === DeviceType.Sensor ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {device.sensorType || "No Type"}
                                </Badge>
                                {activityInfo && activityInfo.lastDataReceived && (
                                  <span className="text-xs text-muted-foreground">
                                    {activityInfo.minutesSinceLastData}m ago
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {device.uCapacity
                                    ? `${device.uCapacity}U`
                                    : "No Capacity"}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          {!rackId && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {getRackName(device.rackId)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {rack?.containment?.name ||
                                    "Unknown Containment"}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-sm">
                            {device.serialNumber || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                className={getStatusBadgeColor(
                                  device,
                                  activityInfo
                                )}
                              >
                                {getDisplayStatus(device, activityInfo)}
                              </Badge>
                              {device.type === DeviceType.Sensor &&
                                activityInfo && (
                                  <span className="text-xs text-muted-foreground">
                                    {activityInfo.hasRecentData
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[130px] truncate">
                            {device.topic || "-"}
                          </TableCell>
                          <TableCell className="max-w-[130px] truncate">
                            {device.description || "-"}
                          </TableCell>
                          <TableCell>
                            {device.createdAt
                              ? new Date(device.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDevice(device)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDevice(device)}
                              title="Edit Device"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Device
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {device.name}"? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rackId ? 9 : 10}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery || selectedRackFilter !== "all"
                          ? "No devices found matching your criteria."
                          : "No devices found."}
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
            <DialogTitle>Edit Device: {editingDevice?.name}</DialogTitle>
            <DialogDescription>
              Update the device information. Modify the fields below and click Update to save changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Row 1: Device Name and Type */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="edit-type">Device Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value,
                      sensorType: "",
                      uCapacity: undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Conditional Fields - Sensor Type or U Capacity */}
            <div className="grid grid-cols-2 gap-4">
              {formData.type === DeviceType.Sensor && (
                <div>
                  <Label htmlFor="edit-sensorType">Sensor Type *</Label>
                  <Select
                    value={formData.sensorType || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sensorType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sensor type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SENSOR_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type && formData.type !== DeviceType.Sensor && (
                <div>
                  <Label htmlFor="edit-uCapacity">U Capacity *</Label>
                  <Select
                    value={
                      formData.uCapacity ? formData.uCapacity.toString() : ""
                    }
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        uCapacity: parseInt(value) || undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select U capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1U</SelectItem>
                      <SelectItem value="2">2U</SelectItem>
                      <SelectItem value="3">3U</SelectItem>
                      <SelectItem value="4">4U</SelectItem>
                      <SelectItem value="5">5U</SelectItem>
                      <SelectItem value="6">6U</SelectItem>
                      <SelectItem value="8">8U</SelectItem>
                      <SelectItem value="10">10U</SelectItem>
                      <SelectItem value="12">12U</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="edit-rackId">Rack *</Label>
                <Select
                  value={
                    formData.rackId && formData.rackId > 0
                      ? formData.rackId.toString()
                      : ""
                  }
                  onValueChange={(value) =>
                    setFormData({ ...formData, rackId: parseInt(value) || 0 })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rack" />
                  </SelectTrigger>
                  <SelectContent>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id.toString()}>
                        {rack.name} -{" "}
                        {rack.containment?.name || "Unknown Containment"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Serial Number and Status */}
            <div>
              <Label htmlFor="edit-serialNumber">Serial Number</Label>
              <Input
                id="edit-serialNumber"
                value={formData.serialNumber}
                onChange={(e) =>
                  setFormData({ ...formData, serialNumber: e.target.value })
                }
                placeholder="Enter serial number"
              />
            </div>

            {/* Row 4: MQTT Topic (only for sensors) */}
            {formData.type === DeviceType.Sensor && (
              <div>
                <Label htmlFor="edit-topic">MQTT Topic</Label>
                <Input
                  id="edit-topic"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  placeholder="Enter MQTT topic"
                />
              </div>
            )}

            {/* Row 5: Description */}
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter description"
                rows={3}
              />
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

      {/* Device Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Device Details: {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              Complete information about this device
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Device Name</Label>
                    <p className="text-sm font-medium">{selectedDevice.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Device Type</Label>
                    <Badge variant="outline" className="mt-1">{selectedDevice.type}</Badge>
                  </div>
                  {selectedDevice.type === DeviceType.Sensor && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Sensor Type</Label>
                      <Badge variant="secondary" className="mt-1">
                        {selectedDevice.sensorType || "Not specified"}
                      </Badge>
                    </div>
                  )}
                  {selectedDevice.type !== DeviceType.Sensor && selectedDevice.uCapacity && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">U Capacity</Label>
                      <Badge variant="outline" className="mt-1">
                        {selectedDevice.uCapacity}U
                      </Badge>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusBadgeColor(selectedDevice, getDeviceActivityInfo(selectedDevice.id))}>
                        {getDisplayStatus(selectedDevice, getDeviceActivityInfo(selectedDevice.id))}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Rack</Label>
                    <div className="mt-1">
                      <p className="text-sm font-medium">{getRackName(selectedDevice.rackId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRack(selectedDevice.rackId)?.containment?.name || "Unknown Containment"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                    <p className="text-sm font-mono">{selectedDevice.serialNumber || "Not specified"}</p>
                  </div>
                  {selectedDevice.topic && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">MQTT Topic</Label>
                      <p className="text-sm font-mono break-all">{selectedDevice.topic}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm">
                      {selectedDevice.createdAt
                        ? new Date(selectedDevice.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedDevice.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-md">{selectedDevice.description}</p>
                </div>
              )}

              {selectedDevice.type === DeviceType.Sensor && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-muted-foreground">Activity Information</Label>
                  {(() => {
                    const activityInfo = getDeviceActivityInfo(selectedDevice.id);
                    return activityInfo ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={activityInfo.hasRecentData ? "default" : "secondary"}>
                            {activityInfo.hasRecentData ? "Active" : "Inactive"}
                          </Badge>
                          {activityInfo.lastDataReceived && (
                            <span className="text-xs text-muted-foreground">
                              Last seen: {activityInfo.minutesSinceLastData} minutes ago
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Activity Status: {activityInfo.activityStatus}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">No activity data available</p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailDialog(false);
              if (selectedDevice) handleEditDevice(selectedDevice);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
