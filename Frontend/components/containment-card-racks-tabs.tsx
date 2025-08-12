"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  HardDriveUpload,
  HardDrive,
  Server,
  ArrowLeft,
  X,
  Thermometer,
  Droplets,
} from "lucide-react"; // Added X for dialog close
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  racksApi,
  containmentsApi,
  devicesApi,
  Rack,
  Containment,
  Device,
  getContainmentTypeString,
} from "@/lib/api-service";
import { toast } from "sonner";

// Interface for sensor data display
interface SensorData {
  temperature: number;
  humidity: number;
}

export default function RackManagementPage({
  containmentId: propContainmentId,
}: { containmentId?: number } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get containmentId from URL params or props
  const urlContainmentId = searchParams.get("containmentId");
  const containmentName = searchParams.get("containmentName") || "";
  const containmentId =
    propContainmentId ||
    (urlContainmentId ? parseInt(urlContainmentId) : undefined);

  const [racks, setRacks] = useState<Rack[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [selectedRackForDevices, setSelectedRackForDevices] = useState<{
    rack: Rack;
    devices: Device[];
  } | null>(null);
  const [sensorData, setSensorData] = useState<Record<number, SensorData>>({});
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Generate dummy sensor data for display
  const generateSensorData = (rackId: number): SensorData => {
    // Use rack ID as seed for consistent but different data per rack
    const seed = rackId * 1000 + Math.floor(Date.now() / 30000); // Changes every 30 seconds
    const random1 = (Math.sin(seed) + 1) / 2;
    const random2 = (Math.sin(seed + 1) + 1) / 2;
    
    return {
      temperature: Math.round((28 + random1 * 5) * 10) / 10, // 28-33°C
      humidity: Math.round(45 + random2 * 20), // 45-65%
    };
  };

  // Get temperature color based on value
  const getTemperatureColor = (
    temp: number
  ): { bg: string; text: string; icon: string } => {
    if (temp <= 29)
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: "text-blue-600",
      };
    if (temp <= 30)
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: "text-green-600",
      };
    if (temp <= 31)
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: "text-yellow-600",
      };
    if (temp <= 32)
      return {
        bg: "bg-orange-100",
        text: "text-orange-800",
        icon: "text-orange-600",
      };
    return { bg: "bg-red-100", text: "text-red-800", icon: "text-red-600" };
  };

  // Get humidity color based on value
  const getHumidityColor = (
    humidity: number
  ): { bg: string; text: string; icon: string } => {
    if (humidity <= 50)
      return {
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        icon: "text-cyan-600",
      };
    if (humidity <= 55)
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: "text-blue-600",
      };
    if (humidity <= 60)
      return {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        icon: "text-indigo-600",
      };
    return {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: "text-purple-600",
    };
  };

  // Initialize sensor data for racks
  const initializeSensorData = (racks: Rack[]) => {
    const newSensorData: Record<number, SensorData> = {};
    
    for (const rack of racks) {
      newSensorData[rack.id] = generateSensorData(rack.id);
    }
    
    setSensorData(newSensorData);
  };

  // Update sensor data periodically
  useEffect(() => {
    if (racks.length > 0) {
      initializeSensorData(racks);

      // Update sensor data every 30 seconds with new dummy values
      const interval = setInterval(() => {
        const updatedSensorData: Record<number, SensorData> = {};
        
        for (const rack of racks) {
          updatedSensorData[rack.id] = generateSensorData(rack.id);
        }
        
        setSensorData(updatedSensorData);
      }, 30000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [racks]);

  // Load device counts for racks
  const loadDeviceCounts = async (racks: Rack[]) => {
    try {
      const deviceCountPromises = racks.map(async (rack) => {
        const result = await devicesApi.getDevicesByRack(rack.id);
        return {
          rackId: rack.id,
          count: result.success && result.data ? result.data.length : 0,
        };
      });

      const counts = await Promise.all(deviceCountPromises);
      const deviceCountMap: Record<number, number> = {};
      counts.forEach(({ rackId, count }) => {
        deviceCountMap[rackId] = count;
      });

      setDeviceCounts(deviceCountMap);
    } catch (error: any) {
      console.error("Failed to load device counts:", error);
      toast.error("Failed to load device counts for some racks.");
    }
  };

  // Load racks by containment ID
  const loadRacksByContainment = async (containmentId: number) => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacksByContainment(containmentId),
        containmentsApi.getContainments(),
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
        setRacks([]); // Clear racks on error
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
      setRacks([]); // Clear racks on error
      setContainments([]); // Clear containments on error
    } finally {
      setLoading(false);
    }
  };

  // Load all racks and containments
  const loadRacks = async () => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacks(),
        containmentsApi.getContainments(),
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
        setRacks([]);
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
      setRacks([]);
      setContainments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on containmentId presence
  useEffect(() => {
    if (containmentId) {
      loadRacksByContainment(containmentId);
    } else {
      loadRacks();
    }
  }, [containmentId]); // Re-run when containmentId changes

  // Get containment name by ID
  const getContainmentName = (
    containmentId: number | null | undefined
  ): string => {
    if (!containmentId || containmentId <= 0 || !containments.length)
      return "Unknown Containment";
    const containment = containments.find((c) => c.id === containmentId);
    return containment ? containment.name : "Unknown Containment";
  };

  // Get containment by ID
  const getContainment = (
    containmentId: number | null | undefined
  ): Containment | undefined => {
    if (!containmentId || containmentId <= 0 || !containments.length)
      return undefined;
    return containments.find((c) => c.id === containmentId);
  };

  // Show devices dialog for a specific rack
  const handleShowRackDevices = async (rack: Rack) => {
    setSelectedRackForDevices({ rack, devices: [] });
    setIsDeviceDialogOpen(true);
    setLoadingDevices(true);

    try {
      const result = await devicesApi.getDevicesByRack(rack.id);
      if (result.success && result.data) {
        setSelectedRackForDevices({ rack, devices: result.data });
      } else {
        toast.error(result.message || "Failed to load devices");
        setSelectedRackForDevices({ rack, devices: [] });
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading devices");
      setSelectedRackForDevices({ rack, devices: [] });
    } finally {
      setLoadingDevices(false);
    }
  };

  // Close device dialog
  const handleCloseDeviceDialog = () => {
    setIsDeviceDialogOpen(false);
    setSelectedRackForDevices(null);
    setLoadingDevices(false);
  };

  // Get status badge color for devices (retained for device dialog)
  const getDeviceStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
      case "offline":
        return "text-gray-600 bg-gray-100";
      case "error":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "maintenance":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <>
      {/* Rack List Grid of Cards */}
      <Card className="">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <div className="flex gap-2">
                <Server />{" "}
                {containmentId
                  ? `Racks in ${
                      containmentName || getContainmentName(containmentId)
                    }`
                  : "Total Racks"}{" "}
                {racks.length}
              </div>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {racks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {racks.map((rack) => {
                    const containment = getContainment(rack.containmentId);
                    return (
                      <Card
                        key={rack.id}
                        className="group flex flex-col justify-between"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{rack.name}</span>
                            <Badge
                              variant={rack.isActive ? "default" : "secondary"}
                              className="text-xs ml-2"
                            >
                              {rack.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {sensorData[rack.id] 
                              ? "Sensor monitoring active" 
                              : "Loading sensors..."}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Sensor Data Display */}
                          <div className="space-y-2 mb-4">
                            {sensorData[rack.id] ? (
                              <>
                                {/* Temperature */}
                                <div
                                  className={`flex items-center justify-between p-2 rounded-lg ${
                                    getTemperatureColor(
                                      sensorData[rack.id].temperature
                                    ).bg
                                  } transition-colors`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Thermometer
                                      className={`h-4 w-4 ${
                                        getTemperatureColor(
                                          sensorData[rack.id].temperature
                                        ).icon
                                      }`}
                                    />
                                    <span
                                      className={`text-xs font-medium ${
                                        getTemperatureColor(
                                          sensorData[rack.id].temperature
                                        ).text
                                      }`}
                                    >
                                      Temperature
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-bold ${
                                      getTemperatureColor(
                                        sensorData[rack.id].temperature
                                      ).text
                                    }`}
                                  >
                                    {sensorData[rack.id].temperature.toFixed(1)}
                                    °C
                                  </span>
                                </div>

                                {/* Humidity */}
                                <div
                                  className={`flex items-center justify-between p-2 rounded-lg ${
                                    getHumidityColor(
                                      sensorData[rack.id].humidity
                                    ).bg
                                  } transition-colors`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Droplets
                                      className={`h-4 w-4 ${
                                        getHumidityColor(
                                          sensorData[rack.id].humidity
                                        ).icon
                                      }`}
                                    />
                                    <span
                                      className={`text-xs font-medium ${
                                        getHumidityColor(
                                          sensorData[rack.id].humidity
                                        ).text
                                      }`}
                                    >
                                      Humidity
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-bold ${
                                      getHumidityColor(
                                        sensorData[rack.id].humidity
                                      ).text
                                    }`}
                                  >
                                    {sensorData[rack.id].humidity}%
                                  </span>
                                </div>

                                {/* Last Updated */}
                                <div className="text-xs text-muted-foreground text-center pt-1">
                                  Last update: {new Date().toLocaleTimeString()}
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-2"></div>
                                  <span className="text-sm text-muted-foreground">
                                    Loading sensors...
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRackDevices(rack)}
                              className="text-blue-600 hover:text-blue-800 p-1 h-auto font-medium"
                              title="View devices in this rack"
                            >
                              <HardDrive className="h-4 w-4 mr-1" />{" "}
                              {deviceCounts[rack.id] || 0} devices
                            </Button>
                            {/* Removed Edit and Delete Buttons */}
                            {(deviceCounts[rack.id] || 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/management/devices/rack?rackId=${
                                      rack.id
                                    }&rackName=${encodeURIComponent(rack.name)}`
                                  )
                                }
                                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
                                title="Manage devices"
                              >
                                <Server className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HardDriveUpload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium">No Racks Found</p>
                  <p className="text-sm">
                    {containmentId
                      ? `There are no racks in ${
                          containmentName || getContainmentName(containmentId)
                        }.`
                      : "No racks have been added yet."}
                  </p>
                  {/* Removed Add New Rack Button from empty state */}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Device Dialog */}
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Devices in {selectedRackForDevices?.rack.name || "Rack"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-grow overflow-auto">
            {loadingDevices ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading devices...
                  </p>
                </div>
              </div>
            ) : selectedRackForDevices?.devices.length &&
              selectedRackForDevices.devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MQTT Topic</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRackForDevices.devices.map((device, index) => (
                    <TableRow key={device.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {device.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{device.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.serialNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getDeviceStatusBadgeColor(device.status)}
                        >
                          {device.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.topic || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {device.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No devices found</p>
                <p className="text-sm">
                  This rack doesn't have any devices installed.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
