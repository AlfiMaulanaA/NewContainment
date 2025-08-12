"use client";

import { useEffect, useState, useCallback } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Eye,
  EyeOff,
  Search,
  TestTube,
  WifiOff,
  Activity,
  Wifi,
  Power,
  Terminal,
  RotateCw,
  Settings,
  Thermometer,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Moon,
  Sun,
  BatteryCharging,
  Grid,
  List,
  Play,
  Pause,
  Monitor,
  Save,
  Loader2,
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
import { toast } from "sonner";
import {
  CctvCamera,
  CreateUpdateCctvCameraRequest,
  cctvApi,
  containmentsApi,
  systemInfoApi,
  type SystemInfo,
} from "@/lib/api-service";

// Import API service
import { useSortableTable } from "@/hooks/use-sort-table";

const ITEMS_PER_PAGE = 10;

export default function CctvManagementPage() {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [containments, setContainments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CctvCamera | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);
  const [systemInfoError, setSystemInfoError] = useState<string | null>(null);

  const [ipIndex, setIpIndex] = useState(0);

  // Function to fetch system info
  const fetchSystemInfo = useCallback(async () => {
    setIsLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const response = await systemInfoApi.getSystemInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
      } else {
        setSystemInfoError(response.message || "Failed to fetch system info");
        toast.error(response.message || "Failed to fetch system info");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSystemInfoError(errorMessage);
      toast.error("Error fetching system info: " + errorMessage);
    } finally {
      setIsLoadingSystemInfo(false);
    }
  }, []);

  // Function to refresh system info
  const refreshSystemInfo = useCallback(async () => {
    setIsLoadingSystemInfo(true);
    setSystemInfoError(null);
    try {
      const response = await systemInfoApi.refreshSystemInfo();
      if (response.success && response.data) {
        setSystemInfo(response.data);
        toast.success("System info refreshed successfully");
      } else {
        setSystemInfoError(response.message || "Failed to refresh system info");
        toast.error(response.message || "Failed to refresh system info");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSystemInfoError(errorMessage);
      toast.error("Error refreshing system info: " + errorMessage);
    } finally {
      setIsLoadingSystemInfo(false);
    }
  }, []);

  useEffect(() => {
    // Fetch system info on component mount
    fetchSystemInfo();

    // Only handles IP address rotation
    const ipInterval = setInterval(() => setIpIndex((i) => (i + 1) % 2), 3000);

    // Auto-refresh system info every 30 seconds
    const systemInfoInterval = setInterval(fetchSystemInfo, 30000);

    return () => {
      clearInterval(ipInterval);
      clearInterval(systemInfoInterval);
    };
  }, [fetchSystemInfo]);

  const ipType = ipIndex === 0 ? "eth0" : "wlan0";
  const ipAddress = systemInfo
    ? ipIndex === 0
      ? systemInfo.eth0_ip_address
      : systemInfo.wlan0_ip_address
    : "N/A";

  // Form state
  const [formData, setFormData] = useState<CreateUpdateCctvCameraRequest>({
    name: "",
    ip: "",
    port: 554,
    username: "",
    password: "",
    apiKeys: "",
    streamUrl: "",
    containmentId: undefined,
  });

  // Sorting functionality
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(cameras);

  // Search and filter
  const filteredCameras = sorted.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.streamUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (camera.containmentName &&
        camera.containmentName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredCameras.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCameras = filteredCameras.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Statistics
  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter((camera) => {
    // We'll use a simple check based on recent updates for now
    // In real implementation, you would track online status
    return true; // Placeholder
  }).length;
  const offlineCameras = totalCameras - onlineCameras;

  const protocolBreakdown = cameras.reduce((acc, camera) => {
    const protocol = camera.streamUrl.startsWith("rtsp://")
      ? "RTSP"
      : camera.streamUrl.startsWith("https://")
      ? "HTTPS"
      : camera.streamUrl.startsWith("http://")
      ? "HTTP"
      : "Other";
    acc[protocol] = (acc[protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    loadCameras();
    loadContainments();
  }, []);

  const loadCameras = async () => {
    setLoading(true);
    try {
      const result = await cctvApi.getCameras();
      if (result.success && result.data) {
        setCameras(result.data);
      } else {
        toast.error(result.message || "Failed to load CCTV cameras");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading CCTV cameras");
    } finally {
      setLoading(false);
    }
  };

  const loadContainments = async () => {
    try {
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        setContainments(result.data);
      }
    } catch (error) {
      console.error("Failed to load containments:", error);
    }
  };

  const handleCreateCamera = async () => {
    setActionLoading(true);
    try {
      const result = await cctvApi.createCamera(formData);
      if (result.success) {
        toast.success("CCTV camera created successfully");
        setShowCreateDialog(false);
        resetForm();
        loadCameras();
      } else {
        toast.error(result.message || "Failed to create CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating CCTV camera");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCamera = async () => {
    if (!editingCamera) return;

    setActionLoading(true);
    try {
      const result = await cctvApi.updateCamera(editingCamera.id, formData);
      if (result.success) {
        toast.success("CCTV camera updated successfully");
        setShowEditDialog(false);
        setEditingCamera(null);
        resetForm();
        loadCameras();
      } else {
        toast.error(result.message || "Failed to update CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating CCTV camera");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCamera = async (camera: CctvCamera) => {
    try {
      const result = await cctvApi.deleteCamera(camera.id);
      if (result.success) {
        toast.success("CCTV camera deleted successfully");
        loadCameras();
      } else {
        toast.error(result.message || "Failed to delete CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting CCTV camera");
    }
  };

  const handleTestConnection = async (camera: CctvCamera) => {
    setTestingConnectionId(camera.id);
    try {
      const result = await cctvApi.testConnection(camera.id);
      if (result.success && result.data) {
        const { isConnected } = result.data;
        if (isConnected) {
          toast.success(`Camera "${camera.name}" is online and responding`);
        } else {
          toast.error(`Camera "${camera.name}" is offline or not responding`);
        }
      } else {
        toast.error(result.message || "Failed to test camera connection");
      }
    } catch (error: any) {
      toast.error(error.message || "Error testing camera connection");
    } finally {
      setTestingConnectionId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      ip: "",
      port: 554,
      username: "",
      password: "",
      apiKeys: "",
      streamUrl: "",
      containmentId: undefined,
    });
  };

  const openEditDialog = (camera: CctvCamera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      ip: camera.ip,
      port: camera.port,
      username: camera.username || "",
      password: camera.password || "",
      apiKeys: camera.apiKeys || "",
      streamUrl: camera.streamUrl,
      containmentId: camera.containmentId || undefined,
    });
    setShowEditDialog(true);
  };

  const generateStreamUrl = () => {
    if (
      formData.ip &&
      formData.port &&
      formData.username &&
      formData.password
    ) {
      const protocol =
        formData.port === 80 || formData.port === 8080 ? "http" : "rtsp";
      const url = `${protocol}://${formData.username}:${formData.password}@${formData.ip}:${formData.port}/stream1`;
      setFormData((prev) => ({ ...prev, streamUrl: url }));
    }
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Camera className="h-5 w-5" />
            <h1 className="text-lg font-semibold">CCTV Camera Management</h1>
          </div>
        </header>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading CCTV cameras...</span>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Camera className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Camera Management</h1>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New CCTV Camera</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Camera Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Camera Pintu Masuk"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    value={formData.ip}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ip: e.target.value }))
                    }
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        port: parseInt(e.target.value) || 554,
                      }))
                    }
                    placeholder="554"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="admin"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="password"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="streamUrl">Stream URL</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateStreamUrl}
                  >
                    Auto Generate
                  </Button>
                </div>
                <Input
                  id="streamUrl"
                  value={formData.streamUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      streamUrl: e.target.value,
                    }))
                  }
                  placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="apiKeys">Api Keys</Label>
                  <span className="p-2 bg-gray-200 rounded-full text-xs text-muted-foreground">
                    For Motion Detection
                  </span>
                </div>
                <Input
                  id="apiKeys"
                  value={formData.apiKeys}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      apiKeys: e.target.value,
                    }))
                  }
                  placeholder="Api Keys Shinobi CCTV"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="containment">Containment (Optional)</Label>
                <Select
                  value={formData.containmentId?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      containmentId:
                        value === "none" ? undefined : parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select containment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Containment</SelectItem>
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
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCamera} disabled={actionLoading}>
                {actionLoading ? "Creating..." : "Create Camera"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cameras</CardTitle>

            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCameras}</div>
            <p className="text-xs text-muted-foreground">
              +
              {
                cameras.filter((c) => {
                  const createdAt = new Date(c.createdAt);
                  const now = new Date();
                  const diffTime = Math.abs(
                    now.getTime() - createdAt.getTime()
                  );
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 30;
                }).length
              }{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Online Cameras
            </CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onlineCameras}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCameras > 0
                ? Math.round((onlineCameras / totalCameras) * 100)
                : 0}
              % of total cameras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Offline Cameras
            </CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {offlineCameras}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCameras > 0
                ? Math.round((offlineCameras / totalCameras) * 100)
                : 0}
              % of total cameras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTSP Cameras</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {protocolBreakdown.RTSP || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              HTTP: {protocolBreakdown.HTTP || 0}, HTTPS:{" "}
              {protocolBreakdown.HTTPS || 0}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="m-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Manage CCTV for Motion Detection
            </CardTitle>
            {isLoadingSystemInfo && !systemInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-6 w-6 bg-gray-300 rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : systemInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h6 className="font-medium">IP Address</h6>
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={`http://${ipAddress}:8080`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <strong>{ipType}:</strong> {ipAddress}
                    </a>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>
      {/* Main Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>CCTV Cameras ({filteredCameras.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cameras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("name")}
                >
                  Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("ip")}
                >
                  IP Address <ArrowUpDown className="inline ml-1 h-4 w-4" />
                </TableHead>
                <TableHead>Api Keys</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCameras.map((camera, index) => (
                <TableRow key={camera.id}>
                  <TableCell className="font-medium">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{camera.name}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {camera.streamUrl}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`http://${camera.ip}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {camera.ip}
                    </a>
                  </TableCell>
                  <TableCell className="w-[80px]">
                    <span className="block w-full truncate">
                      {camera.apiKeys || "Not set"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        camera.streamUrl.startsWith("rtsp://")
                          ? "default"
                          : "secondary"
                      }
                    >
                      {camera.streamUrl.startsWith("rtsp://")
                        ? "RTSP"
                        : camera.streamUrl.startsWith("https://")
                        ? "HTTPS"
                        : camera.streamUrl.startsWith("http://")
                        ? "HTTP"
                        : "Other"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="flex items-center w-fit gap-1"
                    >
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      Unknown
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(camera)}
                        disabled={testingConnectionId === camera.id}
                      >
                        {testingConnectionId === camera.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(camera)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete CCTV Camera
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete camera "
                              {camera.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCamera(camera)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit CCTV Camera</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Camera Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Camera Pintu Masuk"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-ip">IP Address</Label>
                <Input
                  id="edit-ip"
                  value={formData.ip}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ip: e.target.value }))
                  }
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      port: parseInt(e.target.value) || 554,
                    }))
                  }
                  placeholder="554"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="admin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="password"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-streamUrl">Stream URL</Label>
                <Button variant="outline" size="sm" onClick={generateStreamUrl}>
                  Auto Generate
                </Button>
              </div>
              <Input
                id="edit-streamUrl"
                value={formData.streamUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    streamUrl: e.target.value,
                  }))
                }
                placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="apiKeys">Api Keys</Label>
                <span className="p-2 bg-gray-200 rounded-full text-xs text-muted-foreground">
                  For Motion Detection
                </span>
              </div>
              <Input
                id="apiKeys"
                value={formData.apiKeys}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    apiKeys: e.target.value,
                  }))
                }
                placeholder="Api Keys Shinobi CCTV"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-containment">Containment (Optional)</Label>
              <Select
                value={formData.containmentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    containmentId:
                      value === "none" ? undefined : parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select containment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Containment</SelectItem>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCamera} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Camera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
