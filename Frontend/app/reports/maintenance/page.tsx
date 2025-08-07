"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, FileText, Download, RefreshCw, BarChart3, Clock, User, MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Maintenance, 
  MaintenanceTarget, 
  User as UserType,
  maintenanceApi,
  usersApi
} from "@/lib/api-service";

const MAINTENANCE_STATUSES = [
  "Scheduled",
  "In Progress", 
  "Completed",
  "Cancelled",
  "On Hold"
];

const TARGET_TYPES = [
  { value: MaintenanceTarget.Device, label: "Device" },
  { value: MaintenanceTarget.Rack, label: "Rack" },
  { value: MaintenanceTarget.Containment, label: "Containment" }
];

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last-week", label: "Last Week" },
  { value: "last-month", label: "Last Month" },
  { value: "custom", label: "Custom Range" }
];

interface MaintenanceStats {
  total: number;
  completed: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  cancelled: number;
}

interface MaintenanceByTarget {
  targetType: MaintenanceTarget;
  count: number;
  completed: number;
}

interface MaintenanceByUser {
  userId: number;
  userName: string;
  assigned: number;
  completed: number;
}

export default function MaintenanceReportsPage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<MaintenanceTarget | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateDateRange();
  }, [dateRange]);

  const updateDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        setStartDate(now);
        setEndDate(now);
        break;
      case "week":
        setStartDate(startOfWeek(now));
        setEndDate(endOfWeek(now));
        break;
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "last-week":
        setStartDate(startOfWeek(subWeeks(now, 1)));
        setEndDate(endOfWeek(subWeeks(now, 1)));
        break;
      case "last-month":
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      default:
        break;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [maintenanceRes, usersRes] = await Promise.all([
        maintenanceApi.getMaintenances(),
        usersApi.getUsers()
      ]);

      if (maintenanceRes.success) setMaintenances(maintenanceRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const statusMatch = !statusFilter || statusFilter === "all" || maintenance.status === statusFilter;
    const targetMatch = !targetFilter || maintenance.targetType === targetFilter;
    const assigneeMatch = !assigneeFilter || assigneeFilter === "all" || maintenance.assignTo.toString() === assigneeFilter;
    
    let dateMatch = true;
    if (startDate && endDate) {
      const maintenanceStart = new Date(maintenance.startTask);
      const maintenanceEnd = new Date(maintenance.endTask);
      dateMatch = (maintenanceStart >= startDate && maintenanceStart <= endDate) ||
                  (maintenanceEnd >= startDate && maintenanceEnd <= endDate) ||
                  (maintenanceStart <= startDate && maintenanceEnd >= endDate);
    }
    
    return statusMatch && targetMatch && assigneeMatch && dateMatch;
  });

  const calculateStats = (): MaintenanceStats => {
    const now = new Date();
    return {
      total: filteredMaintenances.length,
      completed: filteredMaintenances.filter(m => m.status === "Completed").length,
      inProgress: filteredMaintenances.filter(m => m.status === "In Progress").length,
      scheduled: filteredMaintenances.filter(m => m.status === "Scheduled").length,
      overdue: filteredMaintenances.filter(m => 
        new Date(m.endTask) < now && m.status !== "Completed" && m.status !== "Cancelled"
      ).length,
      cancelled: filteredMaintenances.filter(m => m.status === "Cancelled").length,
    };
  };

  const calculateByTarget = (): MaintenanceByTarget[] => {
    const targetStats = TARGET_TYPES.map(type => ({
      targetType: type.value,
      count: filteredMaintenances.filter(m => m.targetType === type.value).length,
      completed: filteredMaintenances.filter(m => m.targetType === type.value && m.status === "Completed").length
    }));
    return targetStats.filter(stat => stat.count > 0);
  };

  const calculateByUser = (): MaintenanceByUser[] => {
    const userStats = users.map(user => {
      const assigned = filteredMaintenances.filter(m => m.assignTo === user.id).length;
      const completed = filteredMaintenances.filter(m => m.assignTo === user.id && m.status === "Completed").length;
      return {
        userId: user.id,
        userName: user.name,
        assigned,
        completed
      };
    }).filter(stat => stat.assigned > 0);
    
    return userStats.sort((a, b) => b.assigned - a.assigned);
  };

  const getTargetName = (maintenance: Maintenance) => {
    switch (maintenance.targetType) {
      case MaintenanceTarget.Device:
        return maintenance.targetDevice?.name || `Device #${maintenance.targetId}`;
      case MaintenanceTarget.Rack:
        return maintenance.targetRack?.name || `Rack #${maintenance.targetId}`;
      case MaintenanceTarget.Containment:
        return maintenance.targetContainment?.name || `Containment #${maintenance.targetId}`;
      default:
        return "Unknown";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default";
      case "in progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "cancelled":
        return "destructive";
      case "on hold":
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportToCSV = () => {
    const headers = ["Task Name", "Description", "Target Type", "Target", "Assigned To", "Start Date", "End Date", "Status", "Created At"];
    const csvData = filteredMaintenances.map(maintenance => [
      maintenance.name,
      maintenance.description || "",
      TARGET_TYPES.find(t => t.value === maintenance.targetType)?.label || "",
      getTargetName(maintenance),
      maintenance.assignedToUser?.name || `User #${maintenance.assignTo}`,
      format(new Date(maintenance.startTask), "yyyy-MM-dd"),
      format(new Date(maintenance.endTask), "yyyy-MM-dd"),
      maintenance.status,
      format(new Date(maintenance.createdAt), "yyyy-MM-dd HH:mm")
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `maintenance-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Report exported successfully");
  };

  const stats = calculateStats();
  const targetStats = calculateByTarget();
  const userStats = calculateByUser();

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Maintenance Reports</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Maintenance Reports</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Configure the report parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {MAINTENANCE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Type</label>
                <Select value={targetFilter.toString()} onValueChange={(value) => setTargetFilter(value === "all" ? "" : value as MaintenanceTarget)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TARGET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value.toString()}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">In Progress</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-muted-foreground">Scheduled</span>
              </div>
              <p className="text-2xl font-bold text-gray-600">{stats.scheduled}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Cancelled</span>
              </div>
              <p className="text-2xl font-bold text-gray-500">{stats.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Target Type */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance by Target Type</CardTitle>
              <CardDescription>Distribution across device types</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetStats.map((stat) => (
                    <TableRow key={stat.targetType}>
                      <TableCell className="font-medium">
                        {TARGET_TYPES.find(t => t.value === stat.targetType)?.label}
                      </TableCell>
                      <TableCell className="text-right">{stat.count}</TableCell>
                      <TableCell className="text-right">{stat.completed}</TableCell>
                      <TableCell className="text-right">
                        {stat.count > 0 ? `${Math.round((stat.completed / stat.count) * 100)}%` : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {targetStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* By User */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance by User</CardTitle>
              <CardDescription>Performance by assigned technician</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.slice(0, 10).map((stat) => (
                    <TableRow key={stat.userId}>
                      <TableCell className="font-medium">{stat.userName}</TableCell>
                      <TableCell className="text-right">{stat.assigned}</TableCell>
                      <TableCell className="text-right">{stat.completed}</TableCell>
                      <TableCell className="text-right">
                        {stat.assigned > 0 ? `${Math.round((stat.completed / stat.assigned) * 100)}%` : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Detailed List */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Details</CardTitle>
            <CardDescription>
              Detailed list of maintenance tasks ({filteredMaintenances.length} records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenances.map((maintenance) => {
                  const startDate = new Date(maintenance.startTask);
                  const endDate = new Date(maintenance.endTask);
                  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <TableRow key={maintenance.id}>
                      <TableCell className="font-medium">{maintenance.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {maintenance.targetType === MaintenanceTarget.Device && <MapPin className="h-4 w-4" />}
                          {maintenance.targetType === MaintenanceTarget.Rack && <MapPin className="h-4 w-4" />}
                          {maintenance.targetType === MaintenanceTarget.Containment && <MapPin className="h-4 w-4" />}
                          {getTargetName(maintenance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {maintenance.assignedToUser?.name || `User #${maintenance.assignTo}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(startDate, "MMM dd")} - {format(endDate, "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                          {maintenance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{duration} day{duration !== 1 ? 's' : ''}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMaintenances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No maintenance records found for the selected criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}