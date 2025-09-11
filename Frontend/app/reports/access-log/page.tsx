"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  Download,
  RefreshCw,
  Search,
  Key,
  CreditCard,
  Fingerprint,
  Monitor,
  UserSquare,
  Building,
  History,
  Filter,
  ArrowUpDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AccessLog, AccessMethod, accessLogService } from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACCESS_METHODS = [
  { value: AccessMethod.Fingerprint, label: "Fingerprint", icon: Fingerprint },
  { value: AccessMethod.BMS, label: "BMS", icon: Building },
  { value: AccessMethod.Password, label: "Password", icon: Key },
  { value: AccessMethod.Card, label: "Card", icon: CreditCard },
  { value: AccessMethod.Face, label: "Face", icon: UserSquare },
  { value: AccessMethod.Software, label: "Software", icon: Monitor },
];

interface AccessLogResponse {
  data: AccessLog[];
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

interface AccessLogSummary {
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  logsByVia: { via: AccessMethod; count: number }[];
  topUsers: { user: string; count: number }[];
  recentLogs: AccessLog[];
  dateRange: { start?: string; end?: string };
  generatedAt: string;
}

export default function AccessLogPage() {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [summary, setSummary] = useState<AccessLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    via: "all",
    user: "",
    startDate: "",
    endDate: "",
    searchTerm: "",
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Re-fetch data whenever filters change, except for `page` change
    const { page, ...rest } = filters;
    const loadData = async () => {
      await loadAccessLogs();
      await loadSummaryData();
    };
    loadData();
  }, [
    filters.via,
    filters.user,
    filters.startDate,
    filters.endDate,
    filters.searchTerm,
  ]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAccessLogs(), loadSummaryData()]);
    } catch (error: any) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const loadAccessLogs = async () => {
    try {
      setLoadingData(true);
      const params: any = {
        page: filters.page,
        pageSize: filters.pageSize,
      };

      if (filters.via && filters.via !== "all")
        params.via = parseInt(filters.via);
      if (filters.user) params.user = filters.user;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.searchTerm) params.searchTerm = filters.searchTerm;

      const response = await accessLogService.getAccessLogs(params);

      if (response.success && response.data && Array.isArray(response.data)) {
        setAccessLogs(response.data);
      } else {
        throw new Error(response.message || "Failed to load access logs");
      }
    } catch (error: any) {
      console.error("Error loading access logs:", error);
      toast.error(
        "Failed to load access logs: " + (error.message || "Unknown error")
      );
    } finally {
      setLoadingData(false);
    }
  };

  const loadSummaryData = async () => {
    try {
      const response = await accessLogService.getAccessLogSummary(
        filters.startDate || undefined,
        filters.endDate || undefined
      );

      if (response && response.success && response.data) {
        setSummary(response.data);
      }
    } catch (error: any) {
      console.error("Error loading summary:", error);
      toast.error(
        "Failed to load summary: " + (error.message || "Unknown error")
      );
    }
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : prev.page,
    }));
  };

  const applyFilters = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 50,
      via: "all",
      user: "",
      startDate: "",
      endDate: "",
      searchTerm: "",
    });
    setTimeout(() => {
      loadAccessLogs();
      loadSummaryData();
    }, 100);
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

  const getAccessMethodIcon = (via: AccessMethod) => {
    const method = ACCESS_METHODS.find((m) => m.value === via);
    return method ? method.icon : Monitor;
  };

  const getAccessMethodLabel = (via: AccessMethod) => {
    const method = ACCESS_METHODS.find((m) => m.value === via);
    return method ? method.label : "Unknown";
  };

  const exportToCSV = () => {
    try {
      if (!accessLogs || accessLogs.length === 0) {
        toast.error("No data to export");
        return;
      }

      const csvData = accessLogs.map((item) => ({
        User: item.user || "N/A",
        "Access Method": getAccessMethodLabel(item.via),
        Trigger: item.trigger || "N/A",
        Timestamp: formatTimestamp(item.timestamp),
        Success: item.isSuccess ? "Yes" : "No",
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
      a.download = `access-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${accessLogs.length} records to CSV`);
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast.error(
        "Failed to export CSV: " + (error.message || "Unknown error")
      );
    }
  };

  // Use the sortable table hook
  const {
    sorted: sortedLogs,
    sortField,
    sortDirection,
    handleSort,
  } = useSortableTable(accessLogs);

  // Pagination logic for client-side pagination
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  // Update pagination state based on filtered data
  const totalRecords = sortedLogs.length;
  const totalPages = Math.ceil(totalRecords / filters.pageSize);
  const updatedPagination = {
    currentPage: filters.page,
    pageSize: filters.pageSize,
    totalRecords,
    totalPages,
    hasNextPage: filters.page < totalPages,
    hasPreviousPage: filters.page > 1,
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpDown className="h-4 w-4 animate-pulse" />
    ) : (
      <ArrowUpDown className="h-4 w-4 animate-pulse" />
    );
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
          <History className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Access Log Reports
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
            disabled={accessLogs.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="sr-only md:not-sr-only md:ml-2">Export CSV</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="logs">Access Logs</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="via">Access Method</Label>
                    <Select
                      value={filters.via}
                      onValueChange={(value) =>
                        handleFilterChange("via", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All methods</SelectItem>
                        {ACCESS_METHODS.map((method) => (
                          <SelectItem
                            key={method.value}
                            value={method.value.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <method.icon className="h-4 w-4" />
                              {method.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="user">User</Label>
                    <Input
                      id="user"
                      placeholder="Filter by user"
                      value={filters.user}
                      onChange={(e) =>
                        handleFilterChange("user", e.target.value)
                      }
                    />
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

                  <div className="col-span-full md:col-span-2">
                    <Label htmlFor="searchTerm">Search</Label>
                    <Input
                      id="searchTerm"
                      placeholder="Search in user, trigger, or method"
                      value={filters.searchTerm}
                      onChange={(e) =>
                        handleFilterChange("searchTerm", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="pageSize">Records per page</Label>
                    <Select
                      value={filters.pageSize.toString()}
                      onValueChange={(value) => {
                        handleFilterChange("pageSize", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end gap-2 col-span-full md:col-span-1">
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
                  Access Logs ({updatedPagination.totalRecords} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort("timestamp")}
                        >
                          <div className="flex items-center gap-2">
                            Timestamp
                            {renderSortIcon("timestamp")}
                          </div>
                        </TableHead>

                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort("isSuccess")}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            {renderSortIcon("isSuccess")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort("user")}
                        >
                          <div className="flex items-center gap-2">
                            User
                            {renderSortIcon("user")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort("via")}
                        >
                          <div className="flex items-center gap-2">
                            Method
                            {renderSortIcon("via")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort("trigger")}
                        >
                          <div className="flex items-center gap-2">
                            Trigger
                            {renderSortIcon("trigger")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => {
                          const IconComponent = getAccessMethodIcon(log.via);
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-sm">
                                {formatTimestamp(log.timestamp)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={log.isSuccess ? "success" : "danger"}
                                >
                                  {log.isSuccess === true ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  )}
                                  {log.isSuccess ? "Success" : "Failed"}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <div className="font-medium">{log.user}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {getAccessMethodLabel(log.via)}
                                </div>
                              </TableCell>
                              <TableCell>{log.description}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {loadingData ? (
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading access logs...
                              </div>
                            ) : (
                              "No access logs found"
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {updatedPagination.totalPages > 1 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, updatedPagination.totalRecords)} of{" "}
                        {updatedPagination.totalRecords} entries
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                handlePageChange(
                                  updatedPagination.currentPage - 1
                                )
                              }
                              className={
                                !updatedPagination.hasPreviousPage
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink
                              isActive={true}
                              className="cursor-pointer"
                            >
                              {updatedPagination.currentPage}
                            </PaginationLink>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                handlePageChange(
                                  updatedPagination.currentPage + 1
                                )
                              }
                              className={
                                !updatedPagination.hasNextPage
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
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
                        {summary?.totalLogs?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Total Logs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">
                        {summary?.successfulLogs?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Successful</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-red-600">
                        {summary?.failedLogs?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Failed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.logsByVia
                          ?.find((l) => l.via === AccessMethod.Software)
                          ?.count?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Software Access</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Access Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(summary?.logsByVia ?? []).map((item) => {
                          const IconComponent = getAccessMethodIcon(item.via);
                          return (
                            <div
                              key={item.via}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <Badge variant="outline">
                                  {getAccessMethodLabel(item.via)}
                                </Badge>
                              </div>
                              <span className="font-medium">
                                {item?.count?.toLocaleString() ?? "0"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-auto">
                        {(summary?.topUsers ?? []).map((user) => (
                          <div
                            key={user.user}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="font-medium">{user.user}</div>
                            <Badge>
                              {user?.count?.toLocaleString() ?? "0"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
