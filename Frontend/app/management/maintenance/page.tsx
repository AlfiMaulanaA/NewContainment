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
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<MaintenanceTarget | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

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

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const statusMatch = !statusFilter || statusFilter === "all" || maintenance.status === statusFilter;
    const targetMatch = !targetFilter || maintenance.targetType === targetFilter;
    const assigneeMatch = !assigneeFilter || assigneeFilter === "all" || maintenance.assignTo.toString() === assigneeFilter;
    
    if (activeTab === "my-tasks") {
      // TODO: Get current user ID from auth context
      return statusMatch && targetMatch;
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

    const request: CreateMaintenanceRequest = {
      ...formData,
      startTask: startDate.toISOString(),
      endTask: endDate.toISOString()
    };

    const response = await maintenanceApi.createMaintenance(request);
    if (response.success) {
      toast.success("Maintenance created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
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
    } else {
      toast.error(response.message || "Failed to update maintenance");
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    const request: UpdateMaintenanceStatusRequest = { status };
    const response = await maintenanceApi.updateMaintenanceStatus(id, request);
    if (response.success) {
      toast.success("Status updated successfully");
      loadData();
    } else {
      toast.error(response.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    const response = await maintenanceApi.deleteMaintenance(id);
    if (response.success) {
      toast.success("Maintenance deleted successfully");
      loadData();
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
    return filteredMaintenances.filter(maintenance => {
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
                  />
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
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
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
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
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
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      <TableHead>Actions</TableHead>
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
                          <Select value={maintenance.status} onValueChange={(value) => handleStatusUpdate(maintenance.id, value)}>
                            <SelectTrigger className="w-32">
                              <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                                {maintenance.status}
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewDialog(maintenance)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(maintenance)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMaintenances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <TableHead>Actions</TableHead>
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
                          <Select value={maintenance.status} onValueChange={(value) => handleStatusUpdate(maintenance.id, value)}>
                            <SelectTrigger className="w-32">
                              <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                                {maintenance.status}
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewDialog(maintenance)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMaintenances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Maintenance Calendar</CardTitle>
                    <CardDescription>
                      View maintenance tasks in calendar format
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
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    const maintenancesForDay = getMaintenancesForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[120px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors",
                          !isCurrentMonth && "text-muted-foreground bg-gray-50/50",
                          isSelected && "bg-blue-50 border-blue-300",
                          isCurrentDay && "bg-yellow-50 border-yellow-300"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          isCurrentDay && "text-yellow-700 font-bold"
                        )}>
                          {format(day, "d")}
                        </div>
                        
                        <div className="space-y-1">
                          {maintenancesForDay.slice(0, 3).map((maintenance) => (
                            <div
                              key={maintenance.id}
                              className={cn(
                                "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80",
                                getStatusColor(maintenance.status)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewDialog(maintenance);
                              }}
                              title={`${maintenance.name} - ${maintenance.status}`}
                            >
                              {maintenance.name}
                            </div>
                          ))}
                          {maintenancesForDay.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{maintenancesForDay.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>On Hold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Cancelled</span>
                  </div>
                </div>

                {/* Selected Date Details */}
                {selectedDate && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3">
                      Maintenance for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </h4>
                    {getMaintenancesForDate(selectedDate).length === 0 ? (
                      <p className="text-muted-foreground">No maintenance tasks scheduled for this date.</p>
                    ) : (
                      <div className="space-y-2">
                        {getMaintenancesForDate(selectedDate).map((maintenance) => (
                          <div
                            key={maintenance.id}
                            className="flex items-center justify-between p-3 bg-white rounded border cursor-pointer hover:border-gray-300"
                            onClick={() => openViewDialog(maintenance)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{maintenance.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {getTargetName(maintenance)} • {maintenance.assignedToUser?.name || `User #${maintenance.assignTo}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(maintenance.startTask), "MMM dd")} - {format(new Date(maintenance.endTask), "MMM dd")}
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                              {maintenance.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                />
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
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
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
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
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