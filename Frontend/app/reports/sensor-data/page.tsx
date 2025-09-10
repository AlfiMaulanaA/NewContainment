"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  Filter,
  Database,
} from "lucide-react";
import {
  deviceSensorDataApi,
  devicesApi,
  racksApi,
  containmentsApi,
  DeviceSensorData,
} from "@/lib/api-service";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface SensorDataResponse {
  data: DeviceSensorData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: any;
}

interface SensorDataSummary {
  totalRecords: number;
  activeDevices: number;
  sensorTypes: { sensorType: string; count: number }[];
  devicesSummary: {
    deviceId: number;
    deviceName: string;
    latestTimestamp: string;
    recordCount: number;
  }[];
  dateRange: {
    start?: string;
    end?: string;
  };
  generatedAt: string;
}

export default function SensorDataReportsPage() {
  const [sensorData, setSensorData] = useState<DeviceSensorData[]>([]);
  const [summary, setSummary] = useState<SensorDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    deviceId: "all",
    rackId: "all",
    containmentId: "all",
    sensorType: "all",
    startDate: "",
    endDate: "",
    searchTerm: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [availableSensorTypes, setAvailableSensorTypes] = useState<string[]>(
    []
  );
  const [devices, setDevices] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [containments, setContainments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSensorData();
    }
  }, [filters.page, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [
        sensorTypesRes,
        devicesRes,
        racksRes,
        containmentsRes,
        summaryRes,
      ] = await Promise.all([
        deviceSensorDataApi.getAvailableSensorTypes(),
        devicesApi.getDevices(),
        racksApi.getRacks(),
        containmentsApi.getContainments(),
        deviceSensorDataApi.getSensorDataSummary(),
      ]);

      if (sensorTypesRes?.data && Array.isArray(sensorTypesRes.data))
        setAvailableSensorTypes(sensorTypesRes.data || []);
      if (devicesRes?.data && Array.isArray(devicesRes.data))
        setDevices(devicesRes.data || []);
      if (racksRes?.data && Array.isArray(racksRes.data))
        setRacks(racksRes.data || []);
      if (containmentsRes?.data && Array.isArray(containmentsRes.data))
        setContainments(containmentsRes.data || []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch (error: any) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const loadSensorData = async () => {
    try {
      setLoadingData(true);
      const params: any = {
        page: filters.page,
        pageSize: filters.pageSize,
      };

      if (filters.deviceId && filters.deviceId !== "all")
        params.deviceId = parseInt(filters.deviceId);
      if (filters.rackId && filters.rackId !== "all")
        params.rackId = parseInt(filters.rackId);
      if (filters.containmentId && filters.containmentId !== "all")
        params.containmentId = parseInt(filters.containmentId);
      if (filters.sensorType && filters.sensorType !== "all")
        params.sensorType = filters.sensorType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await deviceSensorDataApi.getSensorData(params);

      if (response?.data && Array.isArray(response.data)) {
        setSensorData(response.data || []);
        // Simple pagination calculation since backend now returns direct data
        setPagination({
          currentPage: filters.page,
          pageSize: filters.pageSize,
          totalRecords: response.data.length,
          totalPages: Math.ceil(response.data.length / filters.pageSize),
          hasNextPage: response.data.length >= filters.pageSize,
          hasPreviousPage: filters.page > 1,
        });
      } else {
        throw new Error("Failed to load sensor data");
      }
    } catch (error: any) {
      console.error("Error loading sensor data:", error);
      toast.error(
        "Failed to load sensor data: " + (error.message || "Unknown error")
      );
    } finally {
      setLoadingData(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const applyFilters = () => {
    loadSensorData();
    loadSummaryData();
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 50,
      deviceId: "all",
      rackId: "all",
      containmentId: "all",
      sensorType: "all",
      startDate: "",
      endDate: "",
      searchTerm: "",
    });
    setTimeout(() => {
      loadSensorData();
      loadSummaryData();
    }, 100);
  };

  const loadSummaryData = async () => {
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await deviceSensorDataApi.getSensorDataSummary(params);

      if (response?.data) {
        setSummary(response.data);
      }
    } catch (error: any) {
      console.error("Error loading summary:", error);
      toast.error(
        "Failed to load summary: " + (error.message || "Unknown error")
      );
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), "PPp");
    } catch {
      return timestamp;
    }
  };

  const parsePayload = (payload: string) => {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  };

  const exportToCSV = () => {
    try {
      if (!sensorData || sensorData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const csvData = sensorData.map((item) => ({
        "Device Name": item.device?.name || "N/A",
        "Sensor Type": item.sensorType || item.device?.sensorType || "N/A",
        Containment: item.containment?.name || "N/A",
        Rack: item.rack?.name || "N/A",
        Topic: item.topic || "N/A",
        Timestamp: formatTimestamp(item.timestamp),
        "Raw Payload": item.rawPayload || "N/A",
      }));

      const csvString = [
        Object.keys(csvData[0] || {}).join(","),
        ...csvData.map((row) =>
          Object.values(row)
            .map((field) =>
              typeof field === "string" && field.includes(",")
                ? `"${field.replace(/"/g, '""')}"`
                : field
            )
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sensor-data-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${sensorData.length} records to CSV`);
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast.error(
        "Failed to export CSV: " + (error.message || "Unknown error")
      );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <Database className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Sensor Data Reports
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={applyFilters}
            variant="outline"
            size="sm"
            disabled={loadingData}
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`}
            />
            <span className="sr-only md:not-sr-only md:ml-2">Refresh</span>
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            disabled={sensorData.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="sr-only md:not-sr-only md:ml-2">Export CSV</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <Tabs defaultValue="data" className="space-y-6">
          <TabsList>
            <TabsTrigger value="data">Data Table</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="deviceId">Device</Label>
                    <Select
                      value={filters.deviceId}
                      onValueChange={(value) =>
                        handleFilterChange("deviceId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All devices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All devices</SelectItem>
                        {Array.isArray(devices) &&
                          devices.map((device) => (
                            <SelectItem
                              key={device.id}
                              value={device.id.toString()}
                            >
                              {device.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sensorType">Sensor Type</Label>
                    <Select
                      value={filters.sensorType}
                      onValueChange={(value) =>
                        handleFilterChange("sensorType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {Array.isArray(availableSensorTypes) &&
                          availableSensorTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="containmentId">Containment</Label>
                    <Select
                      value={filters.containmentId}
                      onValueChange={(value) =>
                        handleFilterChange("containmentId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All containments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All containments</SelectItem>
                        {Array.isArray(containments) &&
                          containments.map((containment) => (
                            <SelectItem
                              key={containment.id}
                              value={containment.id.toString()}
                            >
                              {containment.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rackId">Rack</Label>
                    <Select
                      value={filters.rackId}
                      onValueChange={(value) =>
                        handleFilterChange("rackId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All racks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All racks</SelectItem>
                        {Array.isArray(racks) &&
                          racks.map((rack) => (
                            <SelectItem
                              key={rack.id}
                              value={rack.id.toString()}
                            >
                              {rack.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={filters.startDate}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={filters.endDate}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex items-end gap-2 col-span-full md:col-span-1 lg:col-span-2">
                    <Button
                      onClick={applyFilters}
                      className="flex-1"
                      disabled={loadingData}
                    >
                      {loadingData ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Apply Filters
                    </Button>
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="flex-1"
                      disabled={loadingData}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Sensor Data ({pagination.totalRecords} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sensorData.length > 0 ? (
                        sensorData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.device?.name || "Unknown Device"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {item.deviceId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {item.sensorType ||
                                  item.device?.sensorType ||
                                  "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{item.containment?.name || "Unknown"}</div>
                                <div className="text-muted-foreground">
                                  {item.rack?.name || "Unknown"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded max-w-32 truncate block">
                                {item.topic || "N/A"}
                              </code>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatTimestamp(item.timestamp)}
                            </TableCell>
                            <TableCell>
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View Payload
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded max-w-xs overflow-auto whitespace-pre-wrap">
                                  {JSON.stringify(
                                    parsePayload(item.rawPayload),
                                    null,
                                    2
                                  )}
                                </pre>
                              </details>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {loadingData ? (
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading sensor data...
                              </div>
                            ) : (
                              "No sensor data found"
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              handlePageChange(pagination.currentPage - 1)
                            }
                            className={
                              !pagination.hasPreviousPage
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(5, pagination.totalPages) },
                          (_, i) => {
                            const page = i + 1;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={page === pagination.currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}

                        {pagination.totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              handlePageChange(pagination.currentPage + 1)
                            }
                            className={
                              !pagination.hasNextPage
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            {summary && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.totalRecords?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Total Records</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.activeDevices ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Active Devices</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.sensorTypes?.length ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Sensor Types</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.devicesSummary?.length ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Reporting Devices</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sensor Types Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary?.sensorTypes &&
                        summary.sensorTypes.length > 0 ? (
                          summary.sensorTypes.map((type) => (
                            <div
                              key={type.sensorType}
                              className="flex items-center justify-between"
                            >
                              <Badge variant="outline">
                                {type.sensorType || "Unknown"}
                              </Badge>
                              <span className="font-medium">
                                {type.count?.toLocaleString() || 0}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            No sensor types available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-auto">
                        {summary?.devicesSummary &&
                        summary.devicesSummary.length > 0 ? (
                          summary.devicesSummary.map((device) => (
                            <div
                              key={device.deviceId}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <div className="font-medium">
                                  {device.deviceName || "Unknown Device"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Last:{" "}
                                  {formatTimestamp(device.latestTimestamp)}
                                </div>
                              </div>
                              <Badge>
                                {device.recordCount?.toLocaleString() || 0}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            No device activity data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select a device and date range to view sensor data charts.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
