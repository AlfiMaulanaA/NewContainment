"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  Flame, 
  Thermometer,
  Building2,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle
} from "lucide-react";
import { 
  emergencyReportsApi, 
  EmergencyReport, 
  EmergencyReportSummary, 
  EmergencyReportFilter 
} from "@/lib/api-service";
import { toast } from "sonner";

export default function EmergencyReportsPage() {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [summaries, setSummaries] = useState<EmergencyReportSummary[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EmergencyReport | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date()); // New state for current time

  // Filter states
  const [filter, setFilter] = useState<EmergencyReportFilter>({
    page: 1,
    pageSize: 50
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // Sorting and pagination
  const [sortField, setSortField] = useState<keyof EmergencyReport>("startTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const emergencyTypes = [
    { value: "SmokeDetector", label: "Smoke Detector", icon: <Flame className="h-4 w-4" />, color: "destructive" },
    { value: "FSS", label: "Fire Suppression System", icon: <Building2 className="h-4 w-4" />, color: "secondary" },
    { value: "EmergencyButton", label: "Emergency Button", icon: <AlertTriangle className="h-4 w-4" />, color: "destructive" },
    { value: "EmergencyTemp", label: "Emergency Temperature", icon: <Thermometer className="h-4 w-4" />, color: "warning" }
  ];

  // Effect to update current time every second for live duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const updatedFilter = {
      ...filter,
      emergencyType: selectedEmergencyType && selectedEmergencyType !== "all" ? selectedEmergencyType : undefined,
      isActive: showActiveOnly ? true : undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      page: currentPage,
      pageSize: pageSize
    };
    setFilter(updatedFilter);
    // Only load reports when filter changes that affect the backend query
    loadReports(updatedFilter);
    // Also reload summaries if date range changes
    if (dateRange.start !== filter.startDate || dateRange.end !== filter.endDate) {
        loadSummaries(dateRange.start || undefined, dateRange.end || undefined);
    }
  }, [selectedEmergencyType, showActiveOnly, dateRange, currentPage, pageSize]); // Add filter dependencies

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadReports(),
        loadSummaries(), // Load summaries with current date range
        loadActiveEmergencies()
      ]);
    } catch (error) {
      toast.error("Failed to load emergency reports data");
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (customFilter?: EmergencyReportFilter) => {
    try {
      const result = await emergencyReportsApi.getEmergencyReports(customFilter || filter);
      if (result.success && result.data) {
        setReports(result.data);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  };

  // Modified loadSummaries to accept date range
  const loadSummaries = async (startDate?: string, endDate?: string) => {
    try {
      const result = await emergencyReportsApi.getEmergencyReportSummary(
        startDate, 
        endDate
      );
      if (result.success && result.data) {
        setSummaries(result.data);
      }
    } catch (error) {
      console.error("Failed to load summaries:", error);
    }
  };

  const loadActiveEmergencies = async () => {
    try {
      const result = await emergencyReportsApi.getActiveEmergencies();
      if (result.success && result.data) {
        setActiveEmergencies(result.data);
      }
    } catch (error) {
      console.error("Failed to load active emergencies:", error);
    }
  };

  const handleCloseEmergency = async (emergencyType: string) => {
    try {
      const result = await emergencyReportsApi.closeActiveEmergency(emergencyType);
      if (result.success) {
        toast.success(`Emergency ${emergencyType} has been manually closed`);
        await loadInitialData(); // Reload all data after closing
      } else {
        toast.error(result.message || "Failed to close emergency");
      }
    } catch (error) {
      toast.error("Failed to close emergency");
    }
  };

  const handleSort = (field: keyof EmergencyReport) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = () => {
    const csvData = reports.map(report => ({
      ID: report.id,
      "Emergency Type": report.emergencyType,
      Status: report.isActive ? "Active" : "Resolved",
      // Use live duration for active reports during export
      "Start Time": new Date(report.startTime).toLocaleString(),
      "End Time": report.endTime ? new Date(report.endTime).toLocaleString() : "",
      Duration: report.isActive 
                  ? getLiveDurationString(report.startTime, report.endTime, currentTime) 
                  : formatApiDurationString(report.duration),
      Notes: report.notes || ""
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).map(val => {
        // Simple CSV escaping for values
        const strVal = String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Emergency reports exported successfully");
  };

  const getEmergencyTypeConfig = (type: string) => {
    return emergencyTypes.find(t => t.value === type) || {
      value: type,
      label: type,
      icon: <AlertCircle className="h-4 w-4" />,
      color: "default" as const
    };
  };

  // Helper to format API provided duration string (e.g., "00:01:30")
  const formatApiDurationString = (durationString: string | undefined | null) => {
    if (!durationString) return "N/A";
    try {
      const parts = durationString.split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const s = parseInt(parts[2]);
        let formattedParts = [];
        if (h > 0) formattedParts.push(`${h}h`);
        if (m > 0) formattedParts.push(`${m}m`);
        if (s > 0 || formattedParts.length === 0) formattedParts.push(`${s}s`); // Ensure seconds if no larger units
        return formattedParts.join(' ') || "0s";
      }
      return durationString; // Return as is if format doesn't match
    } catch {
      return durationString;
    }
  };

  // New helper to calculate live duration from start and end (or current time)
  const getLiveDurationString = (startTime: string, endTime: string | null | undefined, now: Date) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : now; // Use 'now' if endTime is null/undefined

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Invalid Date";
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 0) return "0s"; // Should not happen if start < end

    const totalSeconds = Math.floor(durationMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`); 

    return parts.join(" ") || "0s";
  };

  // Enrich summaries with live total duration for active types
  const enrichedSummaries = summaries.map(summary => {
    let combinedTotalDurationMs = 0;

    // Add API provided total duration (for resolved events)
    if (summary.totalDuration) {
        const match = summary.totalDuration.match(/(\d+):(\d+):(\d+)/);
        if (match) {
            const [, hours, minutes, seconds] = match;
            combinedTotalDurationMs += (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
        }
    }
    
    // Add live duration from currently active emergencies of this type
    if (summary.currentlyActive) {
        const activeReportsOfType = activeEmergencies.filter(
            (ae) => ae.emergencyType === summary.emergencyType
        );
        activeReportsOfType.forEach((ae) => {
            const start = new Date(ae.startTime);
            if (!isNaN(start.getTime())) {
                combinedTotalDurationMs += (currentTime.getTime() - start.getTime());
            }
        });
    }
    
    // Convert combined milliseconds back to a friendly string
    const totalSeconds = Math.floor(combinedTotalDurationMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let combinedFormattedDurationParts = [];
    if (days > 0) combinedFormattedDurationParts.push(`${days}d`);
    if (hours > 0) combinedFormattedDurationParts.push(`${hours}h`);
    if (minutes > 0) combinedFormattedDurationParts.push(`${minutes}m`);
    if (seconds > 0 || combinedFormattedDurationParts.length === 0) combinedFormattedDurationParts.push(`${seconds}s`);

    return {
        ...summary,
        // Add a new field for the dynamically calculated total duration
        displayTotalDuration: combinedFormattedDurationParts.join(" ") || "0s"
    };
  });

  // Apply client-side filtering and sorting
  const filteredAndSortedReports = reports
    .filter(report => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          report.emergencyType.toLowerCase().includes(term) ||
          report.notes?.toLowerCase().includes(term) ||
          report.id.toString().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">Emergency Reports</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadInitialData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4">{/* Changed from container mx-auto p-6 */}

      {/* Active Emergencies Alert */}
      {activeEmergencies.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Emergencies ({activeEmergencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeEmergencies.map((emergency) => {
                const config = getEmergencyTypeConfig(emergency.emergencyType);
                return (
                  <div key={emergency.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-muted-foreground">
                          Active since {new Date(emergency.startTime).toLocaleString()}
                        </div>
                        <div className="text-sm font-semibold text-red-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {getLiveDurationString(emergency.startTime, null, currentTime)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCloseEmergency(emergency.emergencyType)}
                    >
                      Close
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {enrichedSummaries.map((summary) => { {/* Use enrichedSummaries */}
          const config = getEmergencyTypeConfig(summary.emergencyType);
          return (
            <Card key={summary.emergencyType}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                {config.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Total Duration: {summary.displayTotalDuration} {/* Use new display field */}
                </p>
                {summary.currentlyActive && (
                  <Badge variant="destructive" className="mt-2">
                    Currently Active
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Combined Filters and Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Emergency Reports ({filteredAndSortedReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-type">Emergency Type</Label>
              <Select value={selectedEmergencyType} onValueChange={setSelectedEmergencyType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {emergencyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="datetime-local"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={setShowActiveOnly}
              />
              <Label htmlFor="active-only">Active Only</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-size">Page Size</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Table Section */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("id")}
                  >
                    ID {sortField === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("emergencyType")}
                  >
                    Type {sortField === "emergencyType" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("startTime")}
                  >
                    Start Time {sortField === "startTime" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("endTime")}
                  >
                    End Time {sortField === "endTime" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No emergency reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedReports.map((report) => {
                    const config = getEmergencyTypeConfig(report.emergencyType);
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono">{report.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {config.icon}
                            {config.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.isActive ? "destructive" : "secondary"}>
                            {report.isActive ? (
                              <XCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            {report.isActive ? "Active" : "Resolved"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.startTime).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.endTime ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(report.endTime).toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Ongoing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.isActive
                                ? getLiveDurationString(report.startTime, null, currentTime)
                                : formatApiDurationString(report.duration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Emergency Report Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information about emergency report #{report.id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Emergency Type</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      {config.icon}
                                      {config.label}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">
                                      <Badge variant={report.isActive ? "destructive" : "secondary"}>
                                        {report.isActive ? "Active" : "Resolved"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Start Time</Label>
                                    <div className="mt-1">{new Date(report.startTime).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <Label>End Time</Label>
                                    <div className="mt-1">
                                      {report.endTime ? new Date(report.endTime).toLocaleString() : "Ongoing"}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Duration</Label>
                                    <div className="mt-1">
                                        {report.isActive
                                            ? getLiveDurationString(report.startTime, null, currentTime)
                                            : formatApiDurationString(report.duration)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Created</Label>
                                    <div className="mt-1">{new Date(report.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                                {report.notes && (
                                  <div>
                                    <Label>Notes</Label>
                                    <div className="mt-1 p-3 bg-muted rounded-md">{report.notes}</div>
                                  </div>
                                )}
                                {report.rawMqttPayload && (
                                  <div>
                                    <Label>Raw MQTT Payload</Label>
                                    <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm overflow-x-auto">
                                      {report.rawMqttPayload}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedReports.length} of {reports.length} reports
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">Page {currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={filteredAndSortedReports.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </SidebarInset>
  );
}
