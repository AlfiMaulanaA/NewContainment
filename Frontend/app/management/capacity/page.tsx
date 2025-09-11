"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Server,
  Activity,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Calculator,
  TrendingUp,
  Zap,
  Weight,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RackCapacity,
  DeviceCapacity,
  CapacitySummary,
  CapacityAlert,
  CapacityPlanningRequest,
  CapacityPlanningResponse,
  Rack,
  Device,
} from "@/lib/api/types";
import { capacityApi } from "@/lib/api-service";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function CapacityManagementPage() {
  const [loading, setLoading] = useState(true);
  const [rackCapacities, setRackCapacities] = useState<RackCapacity[]>([]);
  const [deviceCapacities, setDeviceCapacities] = useState<DeviceCapacity[]>([]);
  const [capacitySummary, setCapacitySummary] = useState<CapacitySummary | null>(null);
  const [capacityAlerts, setCapacityAlerts] = useState<CapacityAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [planningRequest, setPlanningRequest] = useState<CapacityPlanningRequest>({
    deviceType: "",
    uCapacity: 1,
    quantity: 1,
  });
  const [planningResponse, setPlanningResponse] = useState<CapacityPlanningResponse | null>(null);

  // Load capacity data
  const loadCapacityData = async () => {
    setLoading(true);
    try {
      // Load rack capacities
      const rackCapacitiesResult = await capacityApi.getAllRackCapacities();
      if (rackCapacitiesResult.success && rackCapacitiesResult.data) {
        // Ensure data is an array
        const capacityData = Array.isArray(rackCapacitiesResult.data) 
          ? rackCapacitiesResult.data 
          : [];
        setRackCapacities(capacityData);
      } else {
        setRackCapacities([]);
        toast.error(rackCapacitiesResult.message || "Failed to load rack capacities");
      }

      // Load capacity summary
      const summaryResult = await capacityApi.getCapacitySummary();
      if (summaryResult.success && summaryResult.data) {
        setCapacitySummary(summaryResult.data);
      } else {
        toast.error(summaryResult.message || "Failed to load capacity summary");
      }

      // Load capacity alerts
      const alertsResult = await capacityApi.getCapacityAlerts();
      if (alertsResult.success && alertsResult.data) {
        // Ensure data is an array
        const alertsData = Array.isArray(alertsResult.data) 
          ? alertsResult.data 
          : [];
        setCapacityAlerts(alertsData);
      } else {
        setCapacityAlerts([]);
        toast.error(alertsResult.message || "Failed to load capacity alerts");
      }
    } catch (error: any) {
      // Ensure arrays are set to empty on error
      setRackCapacities([]);
      setCapacityAlerts([]);
      toast.error("Error loading capacity data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapacityData();
  }, []);

  // Handle capacity planning
  const handleCapacityPlanning = async () => {
    try {
      const result = await capacityApi.planCapacity(planningRequest);
      if (result.success && result.data) {
        setPlanningResponse(result.data);
      } else {
        toast.error(result.message || "Failed to calculate capacity planning");
      }
    } catch (error: any) {
      toast.error("Error calculating capacity planning: " + error.message);
    }
  };

  // Filter rack capacities based on search and filter
  const filteredRackCapacities = Array.isArray(rackCapacities) 
    ? rackCapacities.filter((rack) => {
        const matchesSearch = searchQuery === "" || 
          rack.rackId.toString().includes(searchQuery.toLowerCase());
        
        const utilization = rack.utilizationPercentage || 0;
        const matchesFilter = filterType === "all" || 
          (filterType === "high" && utilization >= 80) ||
          (filterType === "medium" && utilization >= 60 && utilization < 80) ||
          (filterType === "low" && utilization < 60);

        return matchesSearch && matchesFilter;
      })
    : [];

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 80) return "text-orange-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-green-600";
  };

  const getUtilizationBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 80) return "secondary";
    if (percentage >= 60) return "outline";
    return "default";
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-100";
      case "high": return "text-orange-600 bg-orange-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Capacity Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadCapacityData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showPlanningDialog} onOpenChange={setShowPlanningDialog}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Capacity Planning
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Capacity Planning Calculator</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="deviceType">Device Type</Label>
                  <Input
                    id="deviceType"
                    value={planningRequest.deviceType}
                    onChange={(e) =>
                      setPlanningRequest({ ...planningRequest, deviceType: e.target.value })
                    }
                    placeholder="e.g. Server, Switch, Storage"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="uCapacity">U Capacity</Label>
                    <Input
                      id="uCapacity"
                      type="number"
                      min="1"
                      value={planningRequest.uCapacity}
                      onChange={(e) =>
                        setPlanningRequest({ ...planningRequest, uCapacity: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={planningRequest.quantity}
                      onChange={(e) =>
                        setPlanningRequest({ ...planningRequest, quantity: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
              
              {planningResponse && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Planning Result</h4>
                    <Badge variant={planningResponse.canAccommodate ? "default" : "destructive"}>
                      {planningResponse.canAccommodate ? "Can Accommodate" : "Cannot Accommodate"}
                    </Badge>
                    
                    {planningResponse.suggestedRacks.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium">Suggested Racks:</h5>
                        <ul className="text-sm text-muted-foreground">
                          {planningResponse.suggestedRacks.map((rack) => (
                            <li key={rack.rackId}>
                              {rack.rackName} - Available: {rack.availableCapacityU}U
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {planningResponse.constraints.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-red-600">Constraints:</h5>
                        <ul className="text-sm text-red-600">
                          {planningResponse.constraints.map((constraint, index) => (
                            <li key={index}>• {constraint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowPlanningDialog(false);
                  setPlanningResponse(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCapacityPlanning}>
                  Calculate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Summary Cards */}
          {capacitySummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Racks</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{capacitySummary.totalRacks}</div>
                  <p className="text-xs text-muted-foreground">
                    {capacitySummary.totalDevices} devices total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{capacitySummary.totalCapacityU}U</div>
                  <p className="text-xs text-muted-foreground">
                    {capacitySummary.totalUsedU}U used, {capacitySummary.totalAvailableU}U available
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getUtilizationColor(capacitySummary.averageUtilization || 0)}`}>
                    {(capacitySummary.averageUtilization || 0).toFixed(1)}%
                  </div>
                  <Progress value={capacitySummary.averageUtilization || 0} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {(capacityAlerts || []).filter(a => a.isActive).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="racks">Rack Details</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Capacity Distribution Chart */}
              {capacitySummary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Capacity by Device Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={capacitySummary.capacityByType || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({type, usedCapacityU}) => `${type} (${usedCapacityU}U)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="usedCapacityU"
                          >
                            {(capacitySummary.capacityByType || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Rack Utilization Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Array.isArray(rackCapacities) ? rackCapacities.map(rack => ({
                          name: rack.rackName,
                          utilization: rack.utilizationPercentage || 0,
                        })) : []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar 
                            dataKey="utilization" 
                            fill="#8884d8"
                            name="Utilization %"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="racks" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search racks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by utilization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Racks</SelectItem>
                        <SelectItem value="high">High (80%+)</SelectItem>
                        <SelectItem value="medium">Medium (60-80%)</SelectItem>
                        <SelectItem value="low">Low (&lt;60%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Rack Capacity Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Rack Capacity Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rack Name</TableHead>
                        <TableHead>Capacity Utilization</TableHead>
                        <TableHead>Available Space</TableHead>
                        <TableHead>Devices</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRackCapacities.map((rack) => (
                        <TableRow key={rack.rackId}>
                          <TableCell className="font-medium">
                            {rack.rackName}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{rack.usedCapacityU}U / {rack.totalCapacityU}U</span>
                                <span className={getUtilizationColor(rack.utilizationPercentage || 0)}>
                                  {(rack.utilizationPercentage || 0).toFixed(1)}%
                                </span>
                              </div>
                              <Progress value={rack.utilizationPercentage || 0} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rack.availableCapacityU}U available
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {rack.devices.length} devices
                              {rack.devices.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {rack.devices.map(d => d.deviceType).join(", ")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getUtilizationBadgeVariant(rack.utilizationPercentage || 0)}>
                              {(rack.utilizationPercentage || 0) >= 90 ? "Critical" :
                               (rack.utilizationPercentage || 0) >= 80 ? "High" :
                               (rack.utilizationPercentage || 0) >= 60 ? "Medium" : "Normal"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capacity Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(capacityAlerts || []).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {alert.type}
                              </Badge>
                              <Badge variant="destructive" className="capitalize">
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="font-medium mt-2">{alert.message}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Current: {alert.currentValue}% | Threshold: {alert.threshold}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* Analytics Charts */}
              {capacitySummary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Capacity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={(filteredRackCapacities || []).map(rack => ({
                          name: rack.rackName,
                          used: rack.usedCapacityU,
                          available: rack.availableCapacityU,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="used" stackId="a" fill="#8884d8" name="Used" />
                          <Bar dataKey="available" stackId="a" fill="#82ca9d" name="Available" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={(filteredRackCapacities || []).map(rack => ({
                          name: rack.rackName,
                          devices: rack.devices.length,
                          utilization: rack.utilizationPercentage || 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="devices" fill="#8884d8" name="Device Count" />
                          <Bar dataKey="utilization" fill="#82ca9d" name="Utilization %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </SidebarInset>
  );
}