"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HardDriveUpload, HardDrive, Plus, Edit, Trash2, ArrowUpDown, Activity, Server, AlertTriangle, Search, Building, Filter, ArrowLeft } from "lucide-react";
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
  racksApi, 
  containmentsApi,
  devicesApi,
  Rack, 
  Containment,
  Device,
  CreateRackRequest, 
  UpdateRackRequest,
  getContainmentTypeString 
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

interface RackManagementPageProps {
  containmentId?: number;
}

export default function RackManagementPage({ containmentId: propContainmentId }: RackManagementPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get containmentId from URL params or props
  const urlContainmentId = searchParams.get('containmentId');
  const containmentName = searchParams.get('containmentName') || '';
  const containmentId = propContainmentId || (urlContainmentId ? parseInt(urlContainmentId) : undefined);

  const [racks, setRacks] = useState<Rack[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContainmentFilter, setSelectedContainmentFilter] = useState<string>("all");
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [selectedRackDevices, setSelectedRackDevices] = useState<{ rack: Rack; devices: Device[] }>({ rack: {} as Rack, devices: [] });
  const [deviceDialogLoading, setDeviceDialogLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRackRequest | UpdateRackRequest>({
    name: "",
    containmentId: 0,
    description: "",
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(racks);
  const { searchQuery, setSearchQuery, filteredData: searchFiltered } = useSearchFilter(sorted, [
    "name",
    "description",
  ]);

  // Filter by containment - Skip filtering if we already loaded by containment
  const filteredData = containmentId 
    ? searchFiltered // Already filtered by backend
    : (selectedContainmentFilter === "all" 
        ? searchFiltered 
        : searchFiltered.filter(rack => rack.containmentId && rack.containmentId.toString() === selectedContainmentFilter));


  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedRacks = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalRacks = racks.length;
  const activeRacks = racks.filter(rack => rack.isActive).length;
  const inactiveRacks = totalRacks - activeRacks;
  
  // Group racks by containment for stats
  const racksByContainment = containments.map(containment => ({
    containment,
    count: racks.filter(rack => rack.containmentId === containment.id).length
  }));

  // Load device counts for racks
  const loadDeviceCounts = async (racks: Rack[]) => {
    try {
      const deviceCountPromises = racks.map(async (rack) => {
        const result = await devicesApi.getDevicesByRack(rack.id);
        return { rackId: rack.id, count: result.success && result.data ? result.data.length : 0 };
      });
      
      const counts = await Promise.all(deviceCountPromises);
      const deviceCountMap: Record<number, number> = {};
      counts.forEach(({ rackId, count }) => {
        deviceCountMap[rackId] = count;
      });
      
      setDeviceCounts(deviceCountMap);
    } catch (error: any) {
      console.error("Failed to load device counts:", error);
    }
  };

  // Load racks by containment ID  
  const loadRacksByContainment = async (containmentId: number) => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacksByContainment(containmentId),
        containmentsApi.getContainments()
      ]);


      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        // Load device counts after setting racks
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(containmentsResult.message || "Failed to load containments");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Load all racks and containments
  const loadRacks = async () => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacks(),
        containmentsApi.getContainments()
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        // Load device counts after setting racks
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(containmentsResult.message || "Failed to load containments");
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  // Set filter when containmentId changes
  useEffect(() => {
    if (containmentId) {
      setSelectedContainmentFilter(containmentId.toString());
      setFormData(prev => ({ ...prev, containmentId }));
    } else {
      setSelectedContainmentFilter("all");
    }
  }, [containmentId]);


  // Load data
  useEffect(() => {
    if (containmentId) {
      loadRacksByContainment(containmentId);
    } else {
      loadRacks();
    }
  }, [containmentId]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      containmentId: containmentId || 0,
      description: "",
    });
    setEditingRack(null);
  };

  // Handle create rack
  const handleCreateRack = async () => {
    if (!formData.containmentId) {
      toast.error("Please select a containment");
      return;
    }

    setActionLoading(true);
    try {
      const result = await racksApi.createRack(formData as CreateRackRequest);
      if (result.success) {
        toast.success("Rack created successfully");
        setShowCreateDialog(false);
        resetForm();
        if (containmentId) {
          loadRacksByContainment(containmentId);
        } else {
          loadRacks();
        }
      } else {
        toast.error(result.message || "Failed to create rack");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating rack");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit rack
  const handleEditRack = (rack: Rack) => {
    setEditingRack(rack);
    setFormData({
      name: rack.name,
      containmentId: rack.containmentId,
      description: rack.description || "",
    });
    setShowEditDialog(true);
  };

  // Handle update rack
  const handleUpdateRack = async () => {
    if (!editingRack) return;
    
    if (!formData.containmentId) {
      toast.error("Please select a containment");
      return;
    }

    setActionLoading(true);
    try {
      const result = await racksApi.updateRack(editingRack.id, formData as UpdateRackRequest);
      if (result.success) {
        toast.success("Rack updated successfully");
        setShowEditDialog(false);
        resetForm();
        if (containmentId) {
          loadRacksByContainment(containmentId);
        } else {
          loadRacks();
        }
      } else {
        toast.error(result.message || "Failed to update rack");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating rack");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete rack
  const handleDeleteRack = async (rackId: number) => {
    setActionLoading(true);
    try {
      const result = await racksApi.deleteRack(rackId);
      if (result.success) {
        toast.success("Rack deleted successfully");
        if (containmentId) {
          loadRacksByContainment(containmentId);
        } else {
          loadRacks();
        }
      } else {
        toast.error(result.message || "Failed to delete rack");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting rack");
    } finally {
      setActionLoading(false);
    }
  };

  // Get containment name by ID
  const getContainmentName = (containmentId: number | null | undefined): string => {
    if (!containmentId || containmentId <= 0 || !containments.length) return 'Unknown Containment';
    const containment = containments.find(c => c.id === containmentId);
    return containment ? containment.name : 'Unknown Containment';
  };

  // Get containment by ID
  const getContainment = (containmentId: number | null | undefined): Containment | undefined => {
    if (!containmentId || containmentId <= 0 || !containments.length) return undefined;
    return containments.find(c => c.id === containmentId);
  };

  // Show devices dialog for a specific rack
  const handleShowRackDevices = async (rack: Rack) => {
    setDeviceDialogLoading(true);
    setShowDeviceDialog(true);
    setSelectedRackDevices({ rack, devices: [] });

    try {
      const result = await devicesApi.getDevicesByRack(rack.id);
      if (result.success && result.data) {
        setSelectedRackDevices({ rack, devices: result.data });
      } else {
        toast.error(result.message || "Failed to load devices");
        setSelectedRackDevices({ rack, devices: [] });
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading devices");
      setSelectedRackDevices({ rack, devices: [] });
    } finally {
      setDeviceDialogLoading(false);
    }
  };

  // Get status badge color for devices
  const getDeviceStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
      case 'offline':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100';
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
          
          {/* Back button when filtering by containment */}
          {containmentId && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/management/containments')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Containments
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4" />
            </>
          )}
          
          <HardDriveUpload className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Rack Management
            {containmentId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {containmentName || getContainmentName(containmentId)}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rack
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Rack</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Rack Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter rack name"
                  />
                </div>
                <div>
                  <Label htmlFor="containmentId">Containment</Label>
                  <Select
                    value={formData.containmentId && formData.containmentId > 0 ? formData.containmentId.toString() : ""}
                    onValueChange={(value) => setFormData({ ...formData, containmentId: parseInt(value) || 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select containment" />
                    </SelectTrigger>
                    <SelectContent>
                      {containments.map((containment) => (
                        <SelectItem key={containment.id} value={containment.id.toString()}>
                          {containment.name} - {getContainmentTypeString(containment.type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button onClick={handleCreateRack} disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "Create Rack"}
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
            <CardTitle className="text-sm font-medium">Total Racks</CardTitle>
            <div className="p-2 bg-gray-100 rounded-lg">
            <HardDriveUpload className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRacks}</div>
            <p className="text-xs text-muted-foreground">All racks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Racks</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRacks}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Racks</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveRacks}</div>
            <p className="text-xs text-muted-foreground">Inactive racks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Containments</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
            <Server className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{containments.length}</div>
            <p className="text-xs text-muted-foreground">Available containments</p>
          </CardContent>
        </Card>
      </div>

      {/* Rack List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {containmentId ? `Racks in ${containmentName || getContainmentName(containmentId)}` : 'All Racks'} ({filteredData.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Containment Filter - only show if not filtering by specific containment */}
              {!containmentId && (
                <Select value={selectedContainmentFilter} onValueChange={setSelectedContainmentFilter}>
                  <SelectTrigger className="w-48 h-8">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by containment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Containments</SelectItem>
                    {containments.map((containment) => (
                      <SelectItem key={containment.id} value={containment.id.toString()}>
                        {containment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search racks..."
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
                      Rack Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    {!containmentId && <TableHead>Containment</TableHead>}
                    {!containmentId && <TableHead>Containment Type</TableHead>}
                    <TableHead>Description</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRacks.length > 0 ? (
                    paginatedRacks.map((rack, index) => {
                      const containment = getContainment(rack.containmentId);
                      return (
                        <TableRow key={rack.id}>
                          <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                          <TableCell className="font-medium">{rack.name}</TableCell>
                          {!containmentId && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{getContainmentName(rack.containmentId)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {containment?.location || 'No location'}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {!containmentId && (
                            <TableCell>
                              {containment ? (
                                <Badge className={containment.type === 1 ? "text-center text-red-600 bg-red-100" : "text-center text-blue-600 bg-blue-100"}>
                                  {getContainmentTypeString(containment.type)}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-gray-600 bg-gray-100">
                                  Unknown Type
                                </Badge>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="max-w-[150px] truncate">
                            {rack.description || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowRackDevices(rack)}
                                className="text-blue-600 hover:text-blue-800 p-1 h-auto font-medium"
                                title="View devices in this rack"
                              >
                                {deviceCounts[rack.id] || 0} devices
                              </Button>
                              {(deviceCounts[rack.id] || 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/management/devices/rack?rackId=${rack.id}&rackName=${encodeURIComponent(rack.name)}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-auto"
                                  title="Manage devices"
                                >
                                  <HardDrive className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rack.isActive ? "default" : "secondary"}>
                              {rack.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rack.createdAt ? new Date(rack.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/management/devices/rack?rackId=${rack.id}&rackName=${encodeURIComponent(rack.name)}`)}
                              title="Manage Devices"
                            >
                              <HardDrive className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRack(rack)}
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
                                  <AlertDialogTitle>Delete Rack</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{rack.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRack(rack.id)}
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
                      <TableCell colSpan={containmentId ? 7 : 9} className="text-center py-8 text-muted-foreground">
                        {searchQuery || selectedContainmentFilter !== "all" 
                          ? "No racks found matching your criteria." 
                          : "No racks found."}
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

      {/* Edit Rack Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rack: {editingRack?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Rack Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter rack name"
              />
            </div>
            <div>
              <Label htmlFor="edit-containmentId">Containment</Label>
              <Select
                value={formData.containmentId && formData.containmentId > 0 ? formData.containmentId.toString() : ""}
                onValueChange={(value) => setFormData({ ...formData, containmentId: parseInt(value) || 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select containment" />
                </SelectTrigger>
                <SelectContent>
                  {containments.map((containment) => (
                    <SelectItem key={containment.id} value={containment.id.toString()}>
                      {containment.name} - {getContainmentTypeString(containment.type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleUpdateRack} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Rack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device List Dialog */}
      <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Devices in {selectedRackDevices.rack.name}
              <Badge variant="outline" className="ml-2">
                {selectedRackDevices.devices.length} devices
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {deviceDialogLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedRackDevices.devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MQTT Topic</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRackDevices.devices.map((device, index) => (
                    <TableRow key={device.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{device.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.serialNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getDeviceStatusBadgeColor(device.status)}>
                          {device.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.topic || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {device.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No devices found</p>
                <p className="text-sm">This rack doesn't have any devices installed.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-4 w-4" />
              <span>Rack: {selectedRackDevices.rack.name}</span>
              {selectedRackDevices.rack.containment && (
                <>
                  <span>•</span>
                  <span>Containment: {selectedRackDevices.rack.containment.name}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>
                Close
              </Button>
              {selectedRackDevices.devices.length > 0 && (
                <Button 
                  onClick={() => {
                    setShowDeviceDialog(false);
                    router.push(`/management/devices/rack?rackId=${selectedRackDevices.rack.id}&rackName=${encodeURIComponent(selectedRackDevices.rack.name)}`);
                  }}
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Manage Devices
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}