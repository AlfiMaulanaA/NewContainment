"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  HardDriveUpload,
  HardDrive,
  ArrowUpDown,
  Activity,
  Server,
  AlertTriangle,
  Search,
  Building,
  Filter,
  ArrowLeft,
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
  racksApi,
  containmentsApi,
  devicesApi,
  Rack,
  Containment,
  Device,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { toast } from "sonner";
import RackVisualizationDialog from "@/components/rack-visualization-dialog";

const ITEMS_PER_PAGE = 10;

interface RackManagementPageProps {
  containmentId?: number;
}

export default function RackManagementPage({
  containmentId: propContainmentId,
}: RackManagementPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlContainmentId = searchParams.get("containmentId");
  const containmentName = searchParams.get("containmentName") || "";
  const containmentId =
    propContainmentId ||
    (urlContainmentId ? parseInt(urlContainmentId) : undefined);

  const [racks, setRacks] = useState<Rack[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContainmentFilter, setSelectedContainmentFilter] =
    useState<string>("all");
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [capacityData, setCapacityData] = useState<
    Record<number, { usedU: number; remainingU: number }>
  >({});

  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(racks);
  const {
    searchQuery,
    setSearchQuery,
    filteredData: searchFiltered,
  } = useSearchFilter(sorted, ["name", "description"]);

  const filteredData = containmentId
    ? searchFiltered
    : selectedContainmentFilter === "all"
    ? searchFiltered
    : searchFiltered.filter(
        (rack) =>
          rack.containmentId &&
          rack.containmentId.toString() === selectedContainmentFilter
      );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedRacks = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalRacks = racks.length;
  const activeRacks = racks.filter((rack) => rack.isActive).length;
  const inactiveRacks = totalRacks - activeRacks;
  const totalUsedU = Object.values(capacityData).reduce(
    (sum, item) => sum + item.usedU,
    0
  );
  const totalRemainingU = Object.values(capacityData).reduce(
    (sum, item) => sum + item.remainingU,
    0
  );

  const loadDeviceAndCapacityData = async (racks: Rack[]) => {
    try {
      const rackCapacityPromises = racks.map(async (rack) => {
        const result = await devicesApi.getDevicesByRack(rack.id);
        const devicesInRack = result.success && result.data ? result.data : [];
        const usedU = devicesInRack.reduce(
          (total, device) => total + (device.uCapacity || 0),
          0
        );
        const remainingU = (rack.capacityU || 0) - usedU;
        return {
          rackId: rack.id,
          deviceCount: devicesInRack.length,
          usedU,
          remainingU,
        };
      });

      const counts = await Promise.all(rackCapacityPromises);
      const deviceCountMap: Record<number, number> = {};
      const capacityMap: Record<
        number,
        { usedU: number; remainingU: number }
      > = {};
      counts.forEach(({ rackId, deviceCount, usedU, remainingU }) => {
        deviceCountMap[rackId] = deviceCount;
        capacityMap[rackId] = { usedU, remainingU };
      });

      setDeviceCounts(deviceCountMap);
      setCapacityData(capacityMap);
    } catch (error: any) {
      console.error("Failed to load device and capacity data:", error);
    }
  };

  const loadRacksByContainment = async (containmentId: number) => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacksByContainment(containmentId),
        containmentsApi.getContainments(),
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceAndCapacityData(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(
          containmentsResult.message || "Failed to load containments"
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const loadRacks = async () => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacks(),
        containmentsApi.getContainments(),
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceAndCapacityData(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(
          containmentsResult.message || "Failed to load containments"
        );
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (containmentId) {
      setSelectedContainmentFilter(containmentId.toString());
    } else {
      setSelectedContainmentFilter("all");
    }
  }, [containmentId]);

  useEffect(() => {
    if (containmentId) {
      loadRacksByContainment(containmentId);
    } else {
      loadRacks();
    }
  }, [containmentId]);

  const getContainmentName = (
    containmentId: number | null | undefined
  ): string => {
    if (!containmentId || containmentId <= 0 || !containments.length)
      return "Unknown Containment";
    const containment = containments.find((c) => c.id === containmentId);
    return containment ? containment.name : "Unknown Containment";
  };

  const getContainment = (
    containmentId: number | null | undefined
  ): Containment | undefined => {
    if (!containmentId || containmentId <= 0 || !containments.length)
      return undefined;
    return containments.find((c) => c.id === containmentId);
  };

  const getCapacityUtilizationColor = (usedU: number, totalU: number) => {
    if (totalU === 0) return "text-gray-500 dark:text-gray-400";
    const percentage = (usedU / totalU) * 100;
    if (percentage >= 90) return "text-red-600 dark:text-red-400";
    if (percentage >= 75) return "text-orange-600 dark:text-orange-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getCapacityUtilizationBadge = (usedU: number, totalU: number) => {
    if (totalU === 0) return <Badge variant="secondary">No Capacity</Badge>;
    const percentage = (usedU / totalU) * 100;
    if (percentage >= 90) return <Badge variant="destructive">Critical</Badge>;
    if (percentage >= 75) return <Badge className="bg-orange-500 dark:bg-orange-600 text-white">High</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-500 dark:bg-yellow-600 text-white dark:text-gray-900">Medium</Badge>;
    return <Badge className="bg-green-500 dark:bg-green-600 text-white">Low</Badge>;
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {containmentId && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/management/containments")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4" />
            </>
          )}
          <HardDriveUpload className="h-5 w-5" />
          <h1 className="text-lg font-semibold">
            Rack Capacity Management
            {containmentId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {containmentName || getContainmentName(containmentId)}
              </span>
            )}
          </h1>
        </div>
      </header>

      {/* Enhanced Stats Cards with Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Racks</CardTitle>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <HardDriveUpload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRacks}</div>
            <p className="text-xs text-muted-foreground">
              Active: {activeRacks} | Inactive: {inactiveRacks}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Racks</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeRacks}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Capacity</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsedU} U</div>
            <p className="text-xs text-muted-foreground">Total units used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Capacity</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Building className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRemainingU} U</div>
            <p className="text-xs text-muted-foreground">Total units remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsedU + totalRemainingU > 0
                ? Math.round((totalUsedU / (totalUsedU + totalRemainingU)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Capacity usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Rack List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {containmentId
                ? `Racks in ${
                    containmentName || getContainmentName(containmentId)
                  }`
                : "All Racks"}{" "}
              ({filteredData.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {!containmentId && (
                <Select
                  value={selectedContainmentFilter}
                  onValueChange={setSelectedContainmentFilter}
                >
                  <SelectTrigger className="w-48 h-8">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by containment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Containments</SelectItem>
                    {containments.map((containment) => (
                      <SelectItem
                        key={containment.id}
                        value={containment.id.toString()}
                      >
                        {containment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                    {!containmentId && (
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("containmentId")}
                      >
                        Containment{" "}
                        <ArrowUpDown className="inline ml-1 h-4 w-4" />
                      </TableHead>
                    )}
                    <TableHead>Capacity (U)</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRacks.length > 0 ? (
                    paginatedRacks.map((rack, index) => {
                      const containment = getContainment(rack.containmentId);
                      const { usedU = 0, remainingU = 0 } = capacityData[rack.id] || {};
                      const totalCapacity = rack.capacityU || 0;
                      return (
                        <TableRow key={rack.id}>
                          <TableCell>
                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{rack.name}</span>
                              {rack.description && (
                                <span className="text-xs text-muted-foreground">
                                  {rack.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {!containmentId && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {getContainmentName(rack.containmentId)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {containment?.location || "No location"}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="max-w-[150px]">
                            <div className="flex flex-col">
                              <span className={`font-bold ${getCapacityUtilizationColor(usedU, totalCapacity)}`}>
                                {usedU} / {totalCapacity} U
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Remaining: {remainingU} U
                              </span>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    totalCapacity > 0 && (usedU / totalCapacity) >= 0.9 ? 'bg-red-500 dark:bg-red-400' :
                                    totalCapacity > 0 && (usedU / totalCapacity) >= 0.75 ? 'bg-orange-500 dark:bg-orange-400' :
                                    totalCapacity > 0 && (usedU / totalCapacity) >= 0.5 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-green-500 dark:bg-green-400'
                                  }`}
                                  style={{
                                    width: `${totalCapacity > 0 ? (usedU / totalCapacity) * 100 : 0}%`
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getCapacityUtilizationBadge(usedU, totalCapacity)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-1 h-auto font-medium"
                                title="View devices in this rack"
                                onClick={() =>
                                  router.push(
                                    `/management/devices/rack?rackId=${
                                      rack.id
                                    }&rackName=${encodeURIComponent(rack.name)}`
                                  )
                                }
                              >
                                {deviceCounts[rack.id] || 0} devices
                              </Button>
                              {(deviceCounts[rack.id] || 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/management/devices/rack?rackId=${
                                        rack.id
                                      }&rackName=${encodeURIComponent(
                                        rack.name
                                      )}`
                                    )
                                  }
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 h-auto"
                                  title="Manage devices"
                                >
                                  <HardDrive className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <RackVisualizationDialog rack={rack} />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/management/devices/rack?rackId=${
                                      rack.id
                                    }&rackName=${encodeURIComponent(rack.name)}`
                                  )
                                }
                                title="Manage Devices"
                              >
                                <HardDrive className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="text-center py-8 text-muted-foreground" colSpan={7}>
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
    </SidebarInset>
  );
}