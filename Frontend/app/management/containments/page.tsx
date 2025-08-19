"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Server,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Activity,
  AlertTriangle,
  Search,
  Building,
  HardDriveUpload,
  Eye,
  Computer,
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
import { Switch } from "@/components/ui/switch";
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
  containmentsApi,
  racksApi,
  Containment,
  Rack,
  ContainmentType,
  CreateContainmentRequest,
  UpdateContainmentRequest,
  getContainmentTypeString,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  usePermissions,
  PermissionWrapper,
  CrudPermission,
} from "@/lib/role-permissions";

const ITEMS_PER_PAGE = 10;

export default function ContainmentManagementPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const [containments, setContainments] = useState<Containment[]>([]);
  const [rackCounts, setRackCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContainment, setEditingContainment] =
    useState<Containment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRacksModal, setShowRacksModal] = useState(false);
  const [selectedContainment, setSelectedContainment] =
    useState<Containment | null>(null);
  const [selectedRacks, setSelectedRacks] = useState<Rack[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<
    CreateContainmentRequest | UpdateContainmentRequest
  >({
    name: "",
    type: ContainmentType.HotAisleContainment,
    description: "",
    location: "",
    isActive: true,
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(containments);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sorted,
    ["name", "location", "description"]
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedContainments = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalContainments = containments.length;
  const activeContainments = containments.filter(
    (containment) => containment.isActive
  ).length;
  const inactiveContainments = totalContainments - activeContainments;
  const hotAisleContainments = containments.filter(
    (containment) => containment.type === ContainmentType.HotAisleContainment
  ).length;
  const coldAisleContainments = containments.filter(
    (containment) => containment.type === ContainmentType.ColdAisleContainment
  ).length;

  // Calculate total racks across all containments
  const totalRacks = Array.from(rackCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  // Load rack counts for all containments
  const loadRackCounts = async (containments: Containment[]) => {
    const rackCountMap = new Map<number, number>();

    try {
      // Load rack counts for each containment in parallel
      const rackCountPromises = containments.map(async (containment) => {
        try {
          const racksResult = await racksApi.getRacksByContainment(
            containment.id
          );
          if (racksResult.success && racksResult.data) {
            rackCountMap.set(containment.id, racksResult.data.length);
          } else {
            rackCountMap.set(containment.id, 0);
          }
        } catch (error) {
          console.error(
            `Failed to load racks for containment ${containment.id}:`,
            error
          );
          rackCountMap.set(containment.id, 0);
        }
      });

      await Promise.all(rackCountPromises);
      setRackCounts(rackCountMap);
    } catch (error: any) {
      console.error("Error loading rack counts:", error);
      // Set all counts to 0 if there's an error
      containments.forEach((containment) => {
        rackCountMap.set(containment.id, 0);
      });
      setRackCounts(rackCountMap);
    }
  };

  // Load containments
  const loadContainments = async () => {
    setLoading(true);
    try {
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        setContainments(result.data);
        // Load rack counts after containments are loaded
        await loadRackCounts(result.data);
      } else {
        toast.error(result.message || "Failed to load containments");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading containments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContainments();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: ContainmentType.HotAisleContainment,
      description: "",
      location: "",
      isActive: true,
    });
    setEditingContainment(null);
  };

  // Handle create containment
  const handleCreateContainment = async () => {
    setActionLoading(true);
    try {
      const result = await containmentsApi.createContainment(
        formData as CreateContainmentRequest
      );
      if (result.success) {
        toast.success("Containment created successfully");
        setShowCreateDialog(false);
        resetForm();
        await loadContainments();
      } else {
        toast.error(result.message || "Failed to create containment");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating containment");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit containment
  const handleEditContainment = (containment: Containment) => {
    setEditingContainment(containment);
    setFormData({
      name: containment.name,
      type: containment.type,
      description: containment.description || "",
      location: containment.location,
      isActive: containment.isActive ?? true,
    });
    setShowEditDialog(true);
  };

  // Handle update containment
  const handleUpdateContainment = async () => {
    if (!editingContainment) return;

    setActionLoading(true);
    try {
      const result = await containmentsApi.updateContainment(
        editingContainment.id,
        formData as UpdateContainmentRequest
      );
      if (result.success) {
        toast.success("Containment updated successfully");
        setShowEditDialog(false);
        resetForm();
        await loadContainments();
      } else {
        toast.error(result.message || "Failed to update containment");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating containment");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete containment
  const handleDeleteContainment = async (containmentId: number) => {
    setActionLoading(true);
    try {
      const result = await containmentsApi.deleteContainment(containmentId);
      if (result.success) {
        toast.success("Containment deleted successfully");
        await loadContainments();
      } else {
        toast.error(result.message || "Failed to delete containment");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting containment");
    } finally {
      setActionLoading(false);
    }
  };

  // Get containment type color
  const getContainmentTypeColor = (type: ContainmentType): string => {
    switch (type) {
      case ContainmentType.HotAisleContainment:
        return "text-red-600 bg-red-100";
      case ContainmentType.ColdAisleContainment:
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Handle manage racks - redirect to rack management page with containment ID
  const handleManageRacks = (containment: Containment) => {
    router.push(
      `/management/racks?containmentId=${
        containment.id
      }&containmentName=${encodeURIComponent(containment.name)}`
    );
  };

  // Handle show racks modal
  const handleShowRacks = async (containment: Containment) => {
    setSelectedContainment(containment);
    setRacksLoading(true);
    setShowRacksModal(true);

    try {
      const racksResult = await racksApi.getRacksByContainment(containment.id);
      if (racksResult.success && racksResult.data) {
        setSelectedRacks(racksResult.data);
      } else {
        setSelectedRacks([]);
        toast.error(racksResult.message || "Failed to load racks");
      }
    } catch (error: any) {
      console.error("Error loading racks:", error);
      setSelectedRacks([]);
      toast.error("Failed to load racks");
    } finally {
      setRacksLoading(false);
    }
  };

  // Close racks modal
  const closeRacksModal = () => {
    setShowRacksModal(false);
    setSelectedContainment(null);
    setSelectedRacks([]);
    setRacksLoading(false);
  };

  // Render containment management page
  const isContainmentSingle =
    process.env.NEXT_PUBLIC_SINGLE_CONTAINMENT_MODE === "true";

  const shouldShowAddButton =
    !isContainmentSingle || (isContainmentSingle && containments.length === 0);

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Server className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Containment Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <CrudPermission module="containmentManagement" operation="create">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <>
                {shouldShowAddButton && (
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Containment
                    </Button>
                  </DialogTrigger>
                )}
              </>

              <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Containment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Containment Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter containment name"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Containment Type</Label>
                  <Select
                    value={formData.type.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: parseInt(value) as ContainmentType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select containment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value={ContainmentType.HotAisleContainment.toString()}
                      >
                        Hot Aisle Containment
                      </SelectItem>
                      <SelectItem
                        value={ContainmentType.ColdAisleContainment.toString()}
                      >
                        Cold Aisle Containment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Enter location"
                  />
                </div>
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive ?? false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active Status</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateContainment}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create Containment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </CrudPermission>
        </div>
      </header>

      {/* Stats Cards */}
      <>
        {shouldShowAddButton && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 m-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Containments
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Server className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalContainments}</div>
                <p className="text-xs text-muted-foreground">
                  All containments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {activeContainments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {inactiveContainments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Inactive containments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hot Aisle</CardTitle>
                <Badge className="text-red-600 bg-red-100 text-xs">Hot</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hotAisleContainments}</div>
                <p className="text-xs text-muted-foreground">
                  Hot aisle containments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cold Aisle
                </CardTitle>
                <Badge className="text-blue-600 bg-blue-100 text-xs">
                  Cold
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {coldAisleContainments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cold aisle containments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Racks
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {totalRacks}
                </div>
                <p className="text-xs text-muted-foreground">
                  Racks across all containments
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </>

      {/* Containment List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Containments ({filteredData.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search containments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-64"
              />
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
                      Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("type")}
                    >
                      Type <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>

                    <TableHead>Description</TableHead>
                    <TableHead>Total Racks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <PermissionWrapper condition={permissions.containment.canUpdate || permissions.containment.canDelete}>
                      <TableHead className="text-right">Actions</TableHead>
                    </PermissionWrapper>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContainments.length > 0 ? (
                    paginatedContainments.map((containment, index) => (
                      <TableRow key={containment.id}>
                        <TableCell>
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {containment.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {containment.location}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              `text-center ` +
                              getContainmentTypeColor(containment.type)
                            }
                          >
                            {getContainmentTypeString(containment.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {containment.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => handleShowRacks(containment)}
                            >
                              {rackCounts.get(containment.id) || 0} Racks
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              containment.isActive ? "default" : "secondary"
                            }
                          >
                            {containment.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {containment.createdAt
                            ? new Date(
                                containment.createdAt
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <PermissionWrapper condition={permissions.containment.canUpdate || permissions.containment.canDelete}>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleManageRacks(containment)}
                              title="Manage Racks"
                            >
                              <HardDriveUpload className="h-4 w-4" />
                            </Button>
                            <CrudPermission
                              module="containmentManagement"
                              operation="update"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => handleEditContainment(containment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </CrudPermission>
                            <CrudPermission
                              module="containmentManagement"
                              operation="delete"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="text-red-600 bg-red-100 hover:bg-red-200">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Containment
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {containment.name}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteContainment(containment.id)
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </CrudPermission>
                          </TableCell>
                        </PermissionWrapper>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={permissions.containment.canUpdate || permissions.containment.canDelete ? 9 : 8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No containments found matching your search."
                          : "No containments found."}
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

      {/* Edit Containment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Containment: {editingContainment?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Containment Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter containment name"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Containment Type</Label>
              <Select
                value={formData.type.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: parseInt(value) as ContainmentType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select containment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={ContainmentType.HotAisleContainment.toString()}
                  >
                    Hot Aisle Containment
                  </SelectItem>
                  <SelectItem
                    value={ContainmentType.ColdAisleContainment.toString()}
                  >
                    Cold Aisle Containment
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter location"
              />
            </div>
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
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive ?? false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Active Status</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContainment} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Containment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Racks Modal Dialog */}
      <Dialog open={showRacksModal} onOpenChange={closeRacksModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Racks in {selectedContainment?.name}
            </DialogTitle>
            <DialogDescription>
              Total {selectedRacks.length} racks found in this containment
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {racksLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedRacks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Rack Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRacks.map((rack, index) => (
                    <TableRow key={rack.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Computer className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{rack.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{rack.description || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={rack.isActive ? "default" : "secondary"}
                        >
                          {rack.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Computer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No racks found in this containment.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleManageRacks(selectedContainment!)}
              className="flex items-center gap-2"
            >
              <HardDriveUpload className="h-4 w-4" />
              Manage Racks
            </Button>
            <Button variant="outline" onClick={closeRacksModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
