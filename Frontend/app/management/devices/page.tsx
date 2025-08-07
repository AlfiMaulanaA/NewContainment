"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HardDrive, Plus, Edit, Trash2, ArrowUpDown, Activity, AlertTriangle, Search, Server, Filter, ArrowLeft } from "lucide-react";
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
  UpdateDeviceRequest
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

interface DeviceManagementPageProps {
  rackId?: number;
}

export default function DeviceManagementPage({ rackId: propRackId }: DeviceManagementPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get rackId from URL params or props
  const urlRackId = searchParams.get('rackId');
  const rackName = searchParams.get('rackName') || '';
  const rackId = propRackId || (urlRackId ? parseInt(urlRackId) : undefined);

  const [devices, setDevices] = useState<Device[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRackFilter, setSelectedRackFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState<CreateDeviceRequest | UpdateDeviceRequest>({
    name: "",
    type: "",
    rackId: 0,
    description: "",
    serialNumber: "",
    status: "Active",
    topic: "",
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(devices);
  const { searchQuery, setSearchQuery, filteredData: searchFiltered } = useSearchFilter(sorted, [
    "name",
    "type",
    "description",
    "serialNumber",
    "status",
  ]);

  // Filter by rack - Skip filtering if we already loaded by rack
  const filteredData = rackId 
    ? searchFiltered // Already filtered by backend
    : (selectedRackFilter === "all" 
        ? searchFiltered 
        : searchFiltered.filter(device => device.rackId && device.rackId.toString() === selectedRackFilter));

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalDevices = devices.length;
  const activeDevices = devices.filter(device => device.status === "Active").length;
  const inactiveDevices = totalDevices - activeDevices;
  
  // Group devices by rack for stats
  const devicesByRack = racks.map(rack => ({
    rack,
    count: devices.filter(device => device.rackId === rack.id).length
  }));

  // Load devices by rack ID
  const loadDevicesByRack = async (rackId: number) => {
    setLoading(true);
    try {
      const [devicesResult, racksResult] = await Promise.all([
        devicesApi.getDevicesByRack(rackId),
        racksApi.getRacks()
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
        racksApi.getRacks()
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
      setFormData(prev => ({ ...prev, rackId }));
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
      status: "Active",
      topic: "",
    });
    setEditingDevice(null);
  };

  // Handle create device
  const handleCreateDevice = async () => {
    if (!formData.rackId) {
      toast.error("Please select a rack");
      return;
    }

    setActionLoading(true);
    try {
      const result = await devicesApi.createDevice(formData as CreateDeviceRequest);
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
      status: device.status || "Active",
      topic: device.topic || "",
    });
    setShowEditDialog(true);
  };

  // Handle update device
  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    
    if (!formData.rackId) {
      toast.error("Please select a rack");
      return;
    }

    setActionLoading(true);
    try {
      const result = await devicesApi.updateDevice(editingDevice.id, formData as UpdateDeviceRequest);
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
    if (!rackId || !racks.length) return 'Unknown Rack';
    const rack = racks.find(r => r.id === rackId);
    return rack ? rack.name : 'Unknown Rack';
  };

  // Get rack by ID
  const getRack = (rackId: number): Rack | undefined => {
    if (!rackId || !racks.length) return undefined;
    return racks.find(r => r.id === rackId);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
      case 'offline':
        return 'secondary';
      case 'error':
      case 'fault':
        return 'destructive';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
      case 'offline':
        return 'text-gray-600 bg-gray-100';
      case 'error':
      case 'fault':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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
                onClick={() => router.push('/management/racks')}
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
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Device Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter device name"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Device Type</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="Enter device type (e.g., Server, Switch, Router)"
                  />
                </div>
                <div>
                  <Label htmlFor="rackId">Rack</Label>
                  <Select
                    value={formData.rackId && formData.rackId > 0 ? formData.rackId.toString() : ""}
                    onValueChange={(value) => setFormData({ ...formData, rackId: parseInt(value) || 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rack" />
                    </SelectTrigger>
                    <SelectContent>
                      {racks.map((rack) => (
                        <SelectItem key={rack.id} value={rack.id.toString()}>
                          {rack.name} - {rack.containment?.name || 'Unknown Containment'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Enter serial number"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || "Active"}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Error">Error</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="topic">MQTT Topic</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Enter MQTT topic"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">All devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDevices}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Devices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveDevices}</div>
            <p className="text-xs text-muted-foreground">Inactive devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Racks</CardTitle>
            <Server className="h-4 w-4 text-blue-600" />
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
              {rackId ? `Devices in ${rackName || getRackName(rackId)}` : 'All Devices'} ({filteredData.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Rack Filter - only show if not filtering by specific rack */}
              {!rackId && (
                <Select value={selectedRackFilter} onValueChange={setSelectedRackFilter}>
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
                      Device Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("type")}
                    >
                      Type <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    {!rackId && <TableHead>Rack</TableHead>}
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
                    paginatedDevices.map((device, index) => {
                      const rack = getRack(device.rackId);
                      return (
                        <TableRow key={device.id}>
                          <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{device.type}</Badge>
                          </TableCell>
                          {!rackId && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{getRackName(device.rackId)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {rack?.containment?.name || 'Unknown Containment'}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-sm">
                            {device.serialNumber || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(device.status)}>
                              {device.status || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[130px] truncate">
                            {device.topic || '-'}
                          </TableCell>
                          <TableCell className="max-w-[130px] truncate">
                            {device.description || '-'}
                          </TableCell>
                          <TableCell>
                            {device.createdAt ? new Date(device.createdAt).toLocaleDateString() : '-'}
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
                                  <AlertDialogTitle>Delete Device</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{device.name}"? This action cannot be undone.
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
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={rackId ? 9 : 10} className="text-center py-8 text-muted-foreground">
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
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Device Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter device name"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Device Type</Label>
              <Input
                id="edit-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="Enter device type"
              />
            </div>
            <div>
              <Label htmlFor="edit-rackId">Rack</Label>
              <Select
                value={formData.rackId && formData.rackId > 0 ? formData.rackId.toString() : ""}
                onValueChange={(value) => setFormData({ ...formData, rackId: parseInt(value) || 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rack" />
                </SelectTrigger>
                <SelectContent>
                  {racks.map((rack) => (
                    <SelectItem key={rack.id} value={rack.id.toString()}>
                      {rack.name} - {rack.containment?.name || 'Unknown Containment'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-serialNumber">Serial Number</Label>
              <Input
                id="edit-serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Enter serial number"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status || "Active"}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Error">Error</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-topic">MQTT Topic</Label>
              <Input
                id="edit-topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Enter MQTT topic"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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