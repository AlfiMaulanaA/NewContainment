"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
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
  ArrowLeft,
  Server,
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
  Device,
  Rack,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DeviceType,
  SensorType,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;
const DEVICE_TYPES = Object.values(DeviceType);
const SENSOR_TYPES = Object.values(SensorType);

const DEVICE_STATUSES = [
  "Active",
  "Inactive",
  "Offline",
  "Error",
  "Warning",
  "Maintenance",
];

function RackDevicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rackId = searchParams.get("rackId");
  const rackName = searchParams.get("rackName") || "";

  const [devices, setDevices] = useState<Device[]>([]);
  const [rack, setRack] = useState<Rack | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState<
    CreateDeviceRequest | UpdateDeviceRequest
  >({
    name: "",
    type: "",
    rackId: rackId ? parseInt(rackId) : 0,
    description: "",
    serialNumber: "",
    topic: "",
    sensorType: "",
    uCapacity: undefined,
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(devices);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sorted,
    ["name", "type", "description", "serialNumber", "status", "topic"]
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
  const inactiveDevices = devices.filter(
    (device) => device.status !== "Active"
  ).length;
  const errorDevices = devices.filter(
    (device) => device.status === "Error"
  ).length;

  // Load devices and rack info
  const loadData = async () => {
    if (!rackId) return;

    setLoading(true);
    try {
      const [devicesResult, rackResult] = await Promise.all([
        devicesApi.getDevicesByRack(parseInt(rackId)),
        racksApi.getRack(parseInt(rackId)),
      ]);

      if (devicesResult.success && devicesResult.data) {
        setDevices(devicesResult.data);
      } else {
        toast.error(devicesResult.message || "Failed to load devices");
      }

      if (rackResult.success && rackResult.data) {
        setRack(rackResult.data);
      } else {
        toast.error(rackResult.message || "Failed to load rack info");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rackId) {
      loadData();
      setFormData((prev) => ({ ...prev, rackId: parseInt(rackId) }));
    }
  }, [rackId]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      rackId: rackId ? parseInt(rackId) : 0,
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
    if (!formData.name.trim()) {
      toast.error("Please enter device name");
      return;
    }
    if (!formData.type.trim()) {
      toast.error("Please enter device type");
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
        loadData();
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
      uCapacity: device.uCapacity,
    });
    setShowEditDialog(true);
  };

  // Handle update device
  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    if (!formData.name.trim()) {
      toast.error("Please enter device name");
      return;
    }
    if (!formData.type.trim()) {
      toast.error("Please enter device type");
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
        loadData();
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
        loadData();
      } else {
        toast.error(result.message || "Failed to delete device");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting device");
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
      case "offline":
        return "text-gray-600 bg-gray-100";
      case "error":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "maintenance":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!rackId) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600">
              Invalid Rack ID
            </h2>
            <p className="text-muted-foreground">
              Please provide a valid rack ID.
            </p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Back button */}
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

          <HardDrive className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Device Management
            <span className="text-sm font-normal text-muted-foreground ml-2">
              - {rack?.name || rackName}
            </span>
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
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <HardDrive />
                    </div>
                    <div> Add Device to {rack?.name || rackName}</div>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Create a new device in this rack. Choose the device type and fill in the required information.
                </DialogDescription>
              </DialogHeader>
              {/* Mengubah tata letak menjadi 2 kolom */}
              <div className="grid grid-cols-2 gap-4 py-4">
                {/* Baris 1, Kolom 1 */}
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

                {/* Baris 1, Kolom 2 */}
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

                {/* Baris 2, Kolom 1 */}
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                    placeholder="Enter serial number"
                  />
                </div>

                {/* Conditional Fields - Sensor Type or U Capacity */}
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

                {/* Baris 2, Kolom 2 */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || "Active"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional MQTT Topic field - only for sensors */}
                {formData.type === DeviceType.Sensor && (
                  <div className="col-span-2">
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
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
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

      {/* Rack Info Card */}
      {rack && (
        <Card className="m-4 mb-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{rack.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {rack.containment?.name} •{" "}
                    {rack.description || "No description"}
                  </p>
                </div>
              </div>
              <Badge variant={rack.isActive ? "default" : "secondary"}>
                {rack.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mx-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <div className="p-2 bg-gray-100 rounded-lg">
              <HardDrive className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">In this rack</p>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inactiveDevices}
            </div>
            <p className="text-xs text-muted-foreground">Not active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Devices</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {errorDevices}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Devices ({filteredData.length})</CardTitle>
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
                      onClick={() => handleSort("type")}
                    >
                      Type <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MQTT Topic</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>
                          <Badge variant="outline">{device.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.serialNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(device.status)}>
                            {device.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate">
                          {device.topic || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {device.description || "-"}
                        </TableCell>
                        <TableCell>
                          {device.createdAt
                            ? new Date(device.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditDevice(device)}
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
                                  Are you sure you want to delete "{device.name}
                                  "? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDevice(device.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No devices found matching your search."
                          : "No devices found in this rack."}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            </div>

            {/* Row 3: MQTT Topic (only for sensors) */}
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

            {/* Row 4: Description */}
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
    </SidebarInset>
  );
}

export default function RackDevicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <RackDevicesContent />
    </Suspense>
  );
}
