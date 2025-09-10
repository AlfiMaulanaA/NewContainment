"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Settings, Plus, Edit2, Trash2, Eye, Filter, RefreshCw, Wrench, Clock, User, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentUserFromToken } from "@/lib/auth-utils";
import {
  usePermissions,
  PermissionWrapper,
  CrudPermission,
} from "@/lib/role-permissions";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Maintenance, 
  MaintenanceTarget, 
  CreateMaintenanceRequest, 
  UpdateMaintenanceRequest,
  UpdateMaintenanceStatusRequest,
  User as UserType,
  Containment,
  Rack,
  Device,
  maintenanceApi,
  usersApi,
  containmentsApi,
  racksApi,
  devicesApi
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

export default function MaintenancePage() {
  const permissions = usePermissions();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [calendarMaintenances, setCalendarMaintenances] = useState<Maintenance[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<MaintenanceTarget | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<CreateMaintenanceRequest>({
    name: "",
    description: "",
    startTask: "",
    endTask: "",
    assignTo: 0,
    targetType: MaintenanceTarget.Device,
    targetId: 0
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [maintenanceRes, usersRes, containmentsRes, racksRes, devicesRes] = await Promise.all([
        maintenanceApi.getMaintenances(),
        usersApi.getUsers(),
        containmentsApi.getContainments(),
        racksApi.getRacks(),
        devicesApi.getDevices()
      ]);

      if (maintenanceRes.success) setMaintenances(maintenanceRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (containmentsRes.success) setContainments(containmentsRes.data || []);
      if (racksRes.success) setRacks(racksRes.data || []);
      if (devicesRes.success) setDevices(devicesRes.data || []);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarData = async () => {
    try {
      const response = await maintenanceApi.getMaintenancesForCalendar();
      if (response.success) {
        return response.data || [];
      } else {
        toast.error("Failed to load calendar data");
        return [];
      }
    } catch (error) {
      toast.error("Failed to load calendar data");
      return [];
    }
  };

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const statusMatch = !statusFilter || statusFilter === "all" || maintenance.status === statusFilter;
    const targetMatch = !targetFilter || maintenance.targetType === targetFilter;
    const assigneeMatch = !assigneeFilter || assigneeFilter === "all" || maintenance.assignTo.toString() === assigneeFilter;
    
    if (activeTab === "my-tasks") {
      const currentUserMatch = currentUser ? maintenance.assignTo.toString() === currentUser.id.toString() : false;
      return statusMatch && targetMatch && currentUserMatch;
    }
    
    return statusMatch && targetMatch && assigneeMatch;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startTask: "",
      endTask: "",
      assignTo: 0,
      targetType: MaintenanceTarget.Device,
      targetId: 0
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("");
    setEndTime("");
  };

  const handleCreate = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (!formData.name || !formData.assignTo || !formData.targetId) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Combine date and time
    const startDateTime = new Date(startDate);
    if (startTime) {
      const [hours, minutes] = startTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const endDateTime = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(':');
      endDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    const request: CreateMaintenanceRequest = {
      ...formData,
      startTask: startDateTime.toISOString(),
      endTask: endDateTime.toISOString()
    };

    const response = await maintenanceApi.createMaintenance(request);
    if (response.success) {
      toast.success("Maintenance created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
      // Refresh calendar data if we're on calendar tab
      if (activeTab === "calendar") {
        const calendarData = await loadCalendarData();
        setCalendarMaintenances(calendarData);
      }
    } else {
      toast.error(response.message || "Failed to create maintenance");
    }
  };

  const handleUpdate = async () => {
    if (!selectedMaintenance || !startDate || !endDate) return;

    const request: UpdateMaintenanceRequest = {
      ...formData,
      startTask: startDate.toISOString(),
      endTask: endDate.toISOString(),
      status: selectedMaintenance.status
    };

    const response = await maintenanceApi.updateMaintenance(selectedMaintenance.id, request);
    if (response.success) {
      toast.success("Maintenance updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      loadData();
      // Refresh calendar data if we're on calendar tab
      if (activeTab === "calendar") {
        const calendarData = await loadCalendarData();
        setCalendarMaintenances(calendarData);
      }
    } else {
      toast.error(response.message || "Failed to update maintenance");
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      setUpdatingStatus(id);
      const request: UpdateMaintenanceStatusRequest = { status };
      const response = await maintenanceApi.updateMaintenanceStatus(id, request);
      
      if (response.success) {
        toast.success("Status updated successfully");
        
        // Refresh data
        await loadData();
        
        // Refresh calendar data if we're on calendar tab
        if (activeTab === "calendar") {
          const calendarData = await loadCalendarData();
          setCalendarMaintenances(calendarData);
        }
      } else {
        console.error("Failed to update status:", response);
        toast.error(response.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating maintenance status:", error);
      toast.error("An unexpected error occurred while updating status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    const response = await maintenanceApi.deleteMaintenance(id);
    if (response.success) {
      toast.success("Maintenance deleted successfully");
      loadData();
      // Refresh calendar data if we're on calendar tab
      if (activeTab === "calendar") {
        const calendarData = await loadCalendarData();
        setCalendarMaintenances(calendarData);
      }
    } else {
      toast.error(response.message || "Failed to delete maintenance");
    }
  };

  const openEditDialog = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setFormData({
      name: maintenance.name,
      description: maintenance.description || "",
      startTask: maintenance.startTask,
      endTask: maintenance.endTask,
      assignTo: maintenance.assignTo,
      targetType: maintenance.targetType,
      targetId: maintenance.targetId
    });
    setStartDate(new Date(maintenance.startTask));
    setEndDate(new Date(maintenance.endTask));
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setIsViewDialogOpen(true);
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

  const getTargetOptions = () => {
    switch (formData.targetType) {
      case MaintenanceTarget.Device:
        return devices.map(d => ({ value: d.id, label: d.name }));
      case MaintenanceTarget.Rack:
        return racks.map(r => ({ value: r.id, label: r.name }));
      case MaintenanceTarget.Containment:
        return containments.map(c => ({ value: c.id, label: c.name }));
      default:
        return [];
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

  // Handle tab changes with calendar data loading
  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    if (value === "calendar" && calendarMaintenances.length === 0) {
      setCalendarLoading(true);
      const calendarData = await loadCalendarData();
      setCalendarMaintenances(calendarData);
      setCalendarLoading(false);
    }
  };

  // Calendar helper functions
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const getMaintenancesForDate = (date: Date) => {
    // For calendar view, use calendar-specific data that respects role-based filtering
    const dataToUse = activeTab === "calendar" ? calendarMaintenances : filteredMaintenances;
    return dataToUse.filter(maintenance => {
      const startDate = new Date(maintenance.startTask);
      const endDate = new Date(maintenance.endTask);
      return (isSameDay(date, startDate) || isSameDay(date, endDate) || 
              (date >= startDate && date <= endDate));
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500";
      case "in progress":
        return "bg-blue-500";
      case "scheduled":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      case "on hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Maintenance Management</h1>
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
          <Wrench className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Maintenance Management</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <CrudPermission module="maintenanceManagement" operation="create">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Maintenance
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Maintenance</DialogTitle>
                <DialogDescription>
                  Schedule a new maintenance task for devices, racks, or containments.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Task Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignTo">Assign To *</Label>
                    <Select value={formData.assignTo.toString()} onValueChange={(value) => setFormData({ ...formData, assignTo: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter task description"
                    rows={3}
                    aria-describedby="description-help"
                  />
                  <p id="description-help" className="text-xs text-muted-foreground">Optional: Provide additional details about the maintenance task</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetType">Target Type *</Label>
                    <Select value={formData.targetType.toString()} onValueChange={(value) => {
                      setFormData({ ...formData, targetType: parseInt(value) as MaintenanceTarget, targetId: 0 });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value.toString()}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetId">Target *</Label>
                    <Select value={formData.targetId.toString()} onValueChange={(value) => setFormData({ ...formData, targetId: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTargetOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date & Time *</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "MMM dd, yyyy") : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-32"
                        placeholder="Time"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date & Time *</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "MMM dd, yyyy") : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            disabled={(date) => {
                              const today = new Date();
                              const minDate = startDate || today;
                              return date < minDate;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-32"
                        placeholder="Time"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Maintenance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </CrudPermission>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All Maintenance</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4 mb-4 mt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
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
            <Select 
  value={targetFilter.toString()} 
  onValueChange={(value) => setTargetFilter(value === "all" ? "" : (value as unknown as MaintenanceTarget))}
>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Target Type" />
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
            {activeTab === "all" && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Maintenance Tasks</CardTitle>
                <CardDescription>
                  Manage all maintenance tasks across the system
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
                      <PermissionWrapper condition={permissions.maintenance.canUpdate || permissions.maintenance.canDelete}>
                        <TableHead>Actions</TableHead>
                      </PermissionWrapper>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaintenances.map((maintenance) => (
                      <TableRow key={maintenance.id}>
                        <TableCell className="font-medium">{maintenance.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {maintenance.targetType === MaintenanceTarget.Device && <Settings className="h-4 w-4" />}
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
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {format(new Date(maintenance.startTask), "MMM dd")} - {format(new Date(maintenance.endTask), "MMM dd")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={maintenance.status} 
                            onValueChange={(value) => handleStatusUpdate(maintenance.id, value)}
                            disabled={updatingStatus === maintenance.id}
                          >
                            <SelectTrigger className={cn("w-32", updatingStatus === maintenance.id && "opacity-50 cursor-not-allowed")}>
                              <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                                {updatingStatus === maintenance.id ? "Updating..." : maintenance.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {MAINTENANCE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <PermissionWrapper condition={permissions.maintenance.canUpdate || permissions.maintenance.canDelete}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openViewDialog(maintenance)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <CrudPermission module="maintenanceManagement" operation="update">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                  onClick={() => openEditDialog(maintenance)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </CrudPermission>
                              <CrudPermission module="maintenanceManagement" operation="delete">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Maintenance</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this maintenance task? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(maintenance.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </CrudPermission>
                            </div>
                          </TableCell>
                        </PermissionWrapper>
                      </TableRow>
                    ))}
                    {filteredMaintenances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5 + (permissions.maintenance.canUpdate || permissions.maintenance.canDelete ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                          No maintenance tasks found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>
                  Maintenance tasks assigned to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <PermissionWrapper condition={permissions.maintenance.canUpdate || permissions.maintenance.canDelete}>
                        <TableHead>Actions</TableHead>
                      </PermissionWrapper>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaintenances.map((maintenance) => (
                      <TableRow key={maintenance.id}>
                        <TableCell className="font-medium">{maintenance.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {maintenance.targetType === MaintenanceTarget.Device && <Settings className="h-4 w-4" />}
                            {maintenance.targetType === MaintenanceTarget.Rack && <MapPin className="h-4 w-4" />}
                            {maintenance.targetType === MaintenanceTarget.Containment && <MapPin className="h-4 w-4" />}
                            {getTargetName(maintenance)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {format(new Date(maintenance.startTask), "MMM dd")} - {format(new Date(maintenance.endTask), "MMM dd")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={maintenance.status} 
                            onValueChange={(value) => handleStatusUpdate(maintenance.id, value)}
                            disabled={updatingStatus === maintenance.id}
                          >
                            <SelectTrigger className={cn("w-32", updatingStatus === maintenance.id && "opacity-50 cursor-not-allowed")}>
                              <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                                {updatingStatus === maintenance.id ? "Updating..." : maintenance.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {MAINTENANCE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <PermissionWrapper condition={permissions.maintenance.canUpdate || permissions.maintenance.canDelete}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openViewDialog(maintenance)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <CrudPermission module="maintenanceManagement" operation="update">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                  onClick={() => openEditDialog(maintenance)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </CrudPermission>
                            </div>
                          </TableCell>
                        </PermissionWrapper>
                      </TableRow>
                    ))}
                    {filteredMaintenances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4 + (permissions.maintenance.canUpdate || permissions.maintenance.canDelete ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                          No tasks assigned to you
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            {calendarLoading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading calendar data...</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Maintenance Calendar</CardTitle>
                    <CardDescription>
                      {currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || (currentUser?.roleLevel && currentUser.roleLevel >= 2) 
                        ? 'View all maintenance tasks in calendar format' 
                        : 'View your assigned maintenance tasks in calendar format'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-lg font-semibold min-w-[160px] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Header - Day Labels */}
                <div className="grid grid-cols-7 gap-0 mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div key={day} className="h-8 flex items-center justify-center text-sm font-semibold text-gray-600 bg-gray-100 border border-gray-200 first:rounded-tl-lg last:rounded-tr-lg">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-b-lg overflow-hidden">
                  {generateCalendarDays().map((day, index) => {
                    const maintenancesForDay = getMaintenancesForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[80px] md:min-h-[100px] p-2 border-r border-b border-gray-200 transition-all duration-200 relative group cursor-pointer",
                          "hover:bg-blue-50 hover:border-blue-300",
                          !isCurrentMonth && "text-muted-foreground bg-gray-50/70",
                          isSelected && "bg-blue-100 border-blue-400",
                          isCurrentDay && "bg-gradient-to-br from-blue-50 to-blue-100 font-semibold",
                          (index + 1) % 7 === 0 && "border-r-0", // Remove right border for last column in each row
                          index >= generateCalendarDays().length - 7 && "border-b-0" // Remove bottom border for last row
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        {/* Day number - positioned at top left */}
                        <div className={cn(
                          "text-sm font-medium mb-2 flex items-center justify-start",
                          isCurrentDay && "text-blue-700 font-bold",
                          isSelected && "text-blue-600",
                          !isCurrentMonth && "text-gray-400"
                        )}>
                          <span className={cn(
                            "min-w-[20px] h-5 flex items-center justify-center",
                            isCurrentDay && "bg-blue-600 text-white rounded-full text-xs font-bold"
                          )}>
                            {format(day, "d")}
                          </span>
                        </div>
                        
                        {/* Maintenance items with compact layout */}
                        <div className="space-y-1 overflow-hidden">
                          {maintenancesForDay.slice(0, 1).map((maintenance) => (
                            <div
                              key={maintenance.id}
                              className={cn(
                                "text-[9px] md:text-[10px] px-1 py-0.5 rounded text-white font-medium",
                                "cursor-pointer hover:scale-[1.02] transition-all duration-150",
                                "shadow-sm border border-white/20 leading-tight",
                                getStatusColor(maintenance.status)
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openViewDialog(maintenance);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.zIndex = '10';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.zIndex = '1';
                              }}
                              title={`${maintenance.name}\nStatus: ${maintenance.status}\nTarget: ${getTargetName(maintenance)}\nAssigned: ${maintenance.assignedToUser?.name || 'Unknown'}`}
                            >
                              <div className="truncate max-w-full">
                                {maintenance.name.length > 12 ? `${maintenance.name.substring(0, 12)}...` : maintenance.name}
                              </div>
                            </div>
                          ))}
                          
                          {/* Show count indicator for multiple tasks */}
                          {maintenancesForDay.length > 1 && (
                            <div 
                              className="text-[8px] md:text-[9px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded text-center cursor-pointer hover:bg-gray-200 transition-colors border border-gray-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day);
                                // Auto scroll to selected date details
                                setTimeout(() => {
                                  const element = document.getElementById('selected-date-details');
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                  }
                                }, 100);
                              }}
                              title={`View all ${maintenancesForDay.length} maintenance tasks for ${format(day, "MMM d")}`}
                            >
                              {maintenancesForDay.length > 1 && `+${maintenancesForDay.length - 1} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Improved Legend with better visibility */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Status Legend:</h5>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                      <div className="w-3 h-3 bg-green-500 rounded shadow-sm"></div>
                      <span className="font-medium">Completed</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                      <div className="w-3 h-3 bg-blue-500 rounded shadow-sm"></div>
                      <span className="font-medium">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                      <div className="w-3 h-3 bg-gray-500 rounded shadow-sm"></div>
                      <span className="font-medium">Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                      <div className="w-3 h-3 bg-yellow-500 rounded shadow-sm"></div>
                      <span className="font-medium">On Hold</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border">
                      <div className="w-3 h-3 bg-red-500 rounded shadow-sm"></div>
                      <span className="font-medium">Cancelled</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Selected Date Details */}
                {selectedDate && (
                  <div id="selected-date-details" className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-blue-900">
                        📅 {format(selectedDate, "EEEE, MMMM d, yyyy")}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(null)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        ✕ Close
                      </Button>
                    </div>
                    
                    {getMaintenancesForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-6xl mb-2">📝</div>
                        <p className="text-gray-600 font-medium">No maintenance tasks scheduled</p>
                        <p className="text-sm text-gray-500">This date is free for scheduling new maintenance</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm text-blue-700 font-medium mb-3">
                          📋 {getMaintenancesForDate(selectedDate).length} maintenance task(s) scheduled
                        </div>
                        {getMaintenancesForDate(selectedDate).map((maintenance, index) => (
                          <div
                            key={maintenance.id}
                            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                            onClick={() => openViewDialog(maintenance)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                                <div className="font-semibold text-gray-900">{maintenance.name}</div>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                🎯 <strong>Target:</strong> {getTargetName(maintenance)}
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                👤 <strong>Assigned:</strong> {maintenance.assignedToUser?.name || `User #${maintenance.assignTo}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                ⏰ <strong>Duration:</strong> {format(new Date(maintenance.startTask), "MMM dd, HH:mm")} - {format(new Date(maintenance.endTask), "MMM dd, HH:mm")}
                              </div>
                              {maintenance.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📄 <strong>Description:</strong> {maintenance.description.substring(0, 100)}{maintenance.description.length > 100 ? '...' : ''}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex flex-col items-end gap-2">
                              <Badge 
                                variant={getStatusBadgeVariant(maintenance.status)}
                                className="shadow-sm"
                              >
                                {maintenance.status}
                              </Badge>
                              <div className="text-xs text-gray-400">Click to view details</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Maintenance</DialogTitle>
              <DialogDescription>
                Update maintenance task details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Task Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter task name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-assignTo">Assign To *</Label>
                  <Select value={formData.assignTo.toString()} onValueChange={(value) => setFormData({ ...formData, assignTo: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                  aria-describedby="edit-description-help"
                />
                <p id="edit-description-help" className="text-xs text-muted-foreground">Optional: Provide additional details about the maintenance task</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-targetType">Target Type *</Label>
                  <Select value={formData.targetType.toString()} onValueChange={(value) => {
                    setFormData({ ...formData, targetType: parseInt(value) as MaintenanceTarget, targetId: 0 });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value.toString()}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-targetId">Target *</Label>
                  <Select value={formData.targetId.toString()} onValueChange={(value) => setFormData({ ...formData, targetId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTargetOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
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
                        {startDate ? format(startDate, "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
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
                        {endDate ? format(endDate, "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date();
                          const minDate = startDate || today;
                          return date < minDate;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Maintenance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Maintenance Details</DialogTitle>
              <DialogDescription>
                View maintenance task information.
              </DialogDescription>
            </DialogHeader>
            {selectedMaintenance && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Task Name</Label>
                    <p className="text-sm font-medium">{selectedMaintenance.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedMaintenance.status)} className="mt-1">
                      {selectedMaintenance.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedMaintenance.description || "No description provided"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Target</Label>
                    <p className="text-sm font-medium">
                      {TARGET_TYPES.find(t => t.value === selectedMaintenance.targetType)?.label} - {getTargetName(selectedMaintenance)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                    <p className="text-sm font-medium">{selectedMaintenance.assignedToUser?.name || `User #${selectedMaintenance.assignTo}`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium">{format(new Date(selectedMaintenance.startTask), "PPP")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium">{format(new Date(selectedMaintenance.endTask), "PPP")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                    <p className="text-sm">{selectedMaintenance.createdByUser?.name || `User #${selectedMaintenance.createdBy}`}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{format(new Date(selectedMaintenance.createdAt), "PPP")}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}