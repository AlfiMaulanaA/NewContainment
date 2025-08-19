"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  HardDrive,
  HardDriveUpload,
  Server,
  X,
  Thermometer,
  Wind,
  Activity,
  Filter,
  Gauge,
  Droplets,
  Zap,
  Waves,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  deviceSensorDataApi,
  Rack,
  Containment,
  Device,
} from "@/lib/api-service";
import { toast } from "sonner";
import { mqttClient } from "@/lib/mqtt";

// Enhanced sensor type visuals with better colors and icons
const SENSOR_TYPE_VISUALS = {
  Temperature: {
    icon: Thermometer,
    color: "text-red-600",
    bgColor: "bg-red-50",
    name: "Temp",
    unit: "°C",
  },
  "Air Flow": {
    icon: Wind,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    name: "Airflow",
    unit: "L/min",
  },
  Vibration: {
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    name: "Vibration",
    unit: "m/s²",
  },
  "Dust Sensor": {
    icon: Filter,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    name: "Dust",
    unit: "µg/m³",
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    name: "Humidity",
    unit: "%",
  },
  Pressure: {
    icon: Gauge,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    name: "Pressure",
    unit: "hPa",
  },
};

export default function RackManagementPage({
  containmentId: propContainmentId,
}: { containmentId?: number } = {}) {
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
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [rackDevices, setRackDevices] = useState<Record<number, Device[]>>({});
  const [selectedRackForDevices, setSelectedRackForDevices] = useState<{
    rack: Rack;
    devices: Device[];
  } | null>(null);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // State to store real-time sensor data (in object format)
  const [sensorData, setSensorData] = useState<Record<string, any>>({});

  const loadDeviceCounts = async (racks: Rack[]) => {
    try {
      // Optimizing: Load devices and sensor data in parallel for all racks
      const rackPromises = racks.map(async (rack) => {
        const [deviceResult, sensorResult] = await Promise.all([
          devicesApi.getDevicesByRack(rack.id),
          deviceSensorDataApi
            .getSensorDataByRack(rack.id, 10)
            .catch(() => ({ success: false, data: [] })),
        ]);

        return {
          rackId: rack.id,
          count:
            deviceResult.success && deviceResult.data
              ? deviceResult.data.length
              : 0,
          devices:
            deviceResult.success && deviceResult.data ? deviceResult.data : [],
          sensorData:
            sensorResult.success && sensorResult.data ? sensorResult.data : [],
        };
      });

      const results = await Promise.all(rackPromises);
      const deviceCountMap: Record<number, number> = {};
      const rackDevicesMap: Record<number, Device[]> = {};

      results.forEach(({ rackId, count, devices }) => {
        deviceCountMap[rackId] = count;
        rackDevicesMap[rackId] = devices;
      });

      setDeviceCounts(deviceCountMap);
      setRackDevices(rackDevicesMap);
    } catch (error: any) {
      console.error("Failed to load device counts:", error);
      toast.error("Failed to load device counts for some racks.");
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
      toast.error(error.message || "Error loading data");
      setRacks([]);
      setContainments([]);
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

  useEffect(() => {
    if (containmentId) {
      loadRacksByContainment(containmentId);
    } else {
      loadRacks();
    }
  }, [containmentId]);

  // useEffect function to manage MQTT subscriptions
  useEffect(() => {
    const allDevices = Object.values(rackDevices).flat();
    const sensorDevices = allDevices.filter(
      (device) => device.type === "Sensor"
    );

    // Map to store unsubscribe callbacks
    const subscriptions = new Map<string, () => void>();

    if (sensorDevices.length > 0) {
      // Subscribe to each sensor device
      sensorDevices.forEach((device) => {
        // Fix type error by ensuring topic is a valid string
        if (device.topic && typeof device.topic === "string") {
          const callback = (topic: string, message: string) => {
            // Log received data to the console for debugging
            // console.log(
            //   `MQTT: Received data for device '${device.id}' on topic '${topic}':`,
            //   message
            // );

            // Update state with new sensor data
            try {
              const parsedData = JSON.parse(message);
              setSensorData((prevData) => ({
                ...prevData,
                [device.id]: parsedData,
              }));
            } catch (e) {
              console.error(`Failed to parse JSON for device ${device.id}:`, e);
              setSensorData((prevData) => ({
                ...prevData,
                [device.id]: message, // Store the raw message if parsing fails
              }));
            }
          };

          mqttClient.subscribe(device.topic, callback);
          // Store the unsubscribe callback for cleanup
          subscriptions.set(device.topic, () => {
            if (device.topic) {
              mqttClient.unsubscribe(device.topic, callback);
            }
          });
        }
      });
    }

    // Cleanup function to unsubscribe when the component unmounts
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [rackDevices]);

  // Function to format sensor data based on type with enhanced styling
  const formatSensorData = (device: Device, data: any) => {
    if (!data) return { display: "No Data", status: "offline", values: [] };
    if (typeof data !== "object") {
      return { display: data, status: "unknown", values: [] }; // Return raw message if parsing failed
    }

    const timestamp = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString()
      : "N/A";

    switch (device.sensorType) {
      case "Temperature":
        const temp = data.temp || data.temperature;
        const hum = data.hum || data.humidity;
        const tempStatus =
          temp > 30 ? "critical" : temp > 25 ? "warning" : "normal";
        const humStatus = hum > 70 || hum < 30 ? "warning" : "normal";

        return {
          display: `${temp?.toFixed(1) || "--"}°C / ${
            hum?.toFixed(1) || "--"
          }%`,
          status:
            tempStatus === "critical" || humStatus === "warning"
              ? tempStatus
              : "normal",
          values: [
            {
              label: "Temperature",
              value: `${temp?.toFixed(1) || "--"}°C`,
              status: tempStatus,
            },
            {
              label: "Humidity",
              value: `${hum?.toFixed(1) || "--"}%`,
              status: humStatus,
            },
          ],
          timestamp,
        };

      case "Air Flow":
        const flow = data.air_flow_lpm || data.flow;
        const pressure = data.air_pressure_hpa || data.pressure;
        const flowStatus =
          flow < 10 ? "critical" : flow < 20 ? "warning" : "normal";
        const pressureStatus =
          pressure < 900 || pressure > 1100 ? "warning" : "normal";

        return {
          display: `${flow?.toFixed(1) || "--"} L/min`,
          status:
            flowStatus === "critical"
              ? "critical"
              : flowStatus === "warning" || pressureStatus === "warning"
              ? "warning"
              : "normal",
          values: [
            {
              label: "Flow Rate",
              value: `${flow?.toFixed(1) || "--"} L/min`,
              status: flowStatus,
            },
            {
              label: "Pressure",
              value: `${pressure?.toFixed(1) || "--"} hPa`,
              status: pressureStatus,
            },
          ],
          timestamp,
        };

      case "Dust Sensor":
        const dust = data.dust_level_ug_m3 || data.dust || data.pm25;
        const dustStatus =
          dust > 75 ? "critical" : dust > 35 ? "warning" : "normal";

        return {
          display: `${dust?.toFixed(1) || "--"} µg/m³`,
          status: dustStatus,
          values: [
            {
              label: "PM2.5",
              value: `${dust?.toFixed(1) || "--"} µg/m³`,
              status: dustStatus,
            },
          ],
          timestamp,
        };

      case "Vibration":
        const x = data.vibration_x || data.x;
        const y = data.vibration_y || data.y;
        const z = data.vibration_z || data.z;
        const magnitude = Math.sqrt(
          (x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2
        );
        const vibStatus =
          magnitude > 2 ? "critical" : magnitude > 1 ? "warning" : "normal";

        return {
          display: `${magnitude?.toFixed(2) || "--"} m/s²`,
          status: vibStatus,
          values: [
            {
              label: "X-Axis",
              value: `${x?.toFixed(2) || "--"} m/s²`,
              status: "normal",
            },
            {
              label: "Y-Axis",
              value: `${y?.toFixed(2) || "--"} m/s²`,
              status: "normal",
            },
            {
              label: "Z-Axis",
              value: `${z?.toFixed(2) || "--"} m/s²`,
              status: "normal",
            },
            {
              label: "Magnitude",
              value: `${magnitude?.toFixed(2) || "--"} m/s²`,
              status: vibStatus,
            },
          ],
          timestamp,
        };

      default:
        return {
          display: "Unknown Type",
          status: "unknown",
          values: [],
          timestamp,
        };
    }
  };

  // Enhanced status styling with better colors and gradients
  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-emerald-700 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200";
      case "warning":
        return "text-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300";
      case "critical":
        return "text-red-700 bg-gradient-to-br from-red-50 to-rose-50 border-red-300";
      case "offline":
        return "text-slate-500 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300";
      default:
        return "text-slate-600 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200";
    }
  };

  // Modern status icons with Lucide components
  const getStatusIcon = (status: string) => {
    const iconClass = "h-3 w-3";
    switch (status) {
      case "normal":
        return <CheckCircle className={`${iconClass} text-emerald-600`} />;
      case "warning":
        return <AlertTriangle className={`${iconClass} text-amber-600`} />;
      case "critical":
        return <AlertTriangle className={`${iconClass} text-red-600`} />;
      case "offline":
        return <WifiOff className={`${iconClass} text-slate-500`} />;
      default:
        return <Wifi className={`${iconClass} text-slate-400`} />;
    }
  };

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
      <Card className="flex flex-col flex-grow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <div className="flex gap-2 items-center">
                <Server />{" "}
                {containmentId
                  ? `Racks in ${
                      containmentName || getContainmentName(containmentId)
                    }`
                  : "Total Racks"}{" "}
                <Badge className="ml-2 text-sm" variant="outline">
                  {racks.length}
                </Badge>
              </div>
            </CardTitle>
            {containmentId && (
              <Button onClick={() => router.push("/management/containments")}>
                <X className="w-4 h-4 mr-2" />
                Close View
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {racks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {racks.map((rack) => (
                    <Card
                      key={rack.id}
                      className="group flex flex-col justify-between"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{rack.name}</span>
                          <Badge
                            variant={rack.isActive ? "success" : "secondary"}
                            className="text-xs ml-2"
                          >
                            {rack.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Enhanced sensor data display on cards */}
                          {rackDevices[rack.id] &&
                          rackDevices[rack.id].length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {rackDevices[rack.id]
                                .filter((device) => device.type === "Sensor")
                                .map((device) => {
                                  const visual =
                                    SENSOR_TYPE_VISUALS[
                                      device.sensorType as keyof typeof SENSOR_TYPE_VISUALS
                                    ];
                                  const IconComponent = visual?.icon;
                                  const formattedData = formatSensorData(
                                    device,
                                    sensorData[device.id]
                                  );

                                  return (
                                    <div
                                      key={device.id}
                                      className={`relative p-2.5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getStatusColor(
                                        formattedData.status
                                      )}`}
                                    >
                                      {/* Compact header with icon and status */}
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1">
                                          {IconComponent && (
                                            <div
                                              className={`p-1 rounded-md ${visual?.bgColor}`}
                                            >
                                              <IconComponent
                                                className={`h-4 w-4 ${visual?.color}`}
                                              />
                                            </div>
                                          )}
                                          <span className="font-medium text-xs text-gray-800">
                                            {visual?.name || device.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {getStatusIcon(formattedData.status)}
                                        </div>
                                      </div>

                                      <div className="text-center mb-2">
                                        <div className="text-lg font-bold text-gray-900 leading-tight">
                                          {formattedData.display}
                                        </div>
                                      </div>

                                      {/* Compact metrics grid */}
                                      {formattedData.values.length > 1 && (
                                        <div className="grid grid-cols-2 gap-1 mb-2">
                                          {formattedData.values
                                            .slice(0, 4)
                                            .map((value, idx) => (
                                              <div
                                                key={idx}
                                                className="bg-white/60 rounded-md px-1 py-0.5 text-center border"
                                              >
                                                <div className="text-xs font-semibold text-gray-800">
                                                  {value.value}
                                                </div>
                                                <div className="text-[10px] text-gray-600 leading-none">
                                                  {value.label}
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      )}

                                      {/* Timestamp */}
                                      {formattedData.timestamp &&
                                        formattedData.timestamp !== "N/A" && (
                                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                                            <Clock className="h-2.5 w-2.5" />
                                            <span>
                                              {formattedData.timestamp}
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              {rackDevices[rack.id].filter(
                                (device) => device.type === "Sensor"
                              ).length === 0 && (
                                <div className="text-center py-3 text-gray-500 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                                  <Activity className="h-5 w-5 mx-auto mb-1 opacity-40" />
                                  <span className="text-xs font-medium">
                                    No sensors
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                              <HardDrive className="h-6 w-6 mx-auto mb-1 opacity-40" />
                              <span className="text-xs font-medium">
                                No devices
                              </span>
                            </div>
                          )}

                          {/* Compact footer with device count and actions */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRackDevices(rack)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto text-xs font-medium rounded-lg"
                              title="View devices"
                            >
                              <HardDrive className="h-3 w-3 mr-1" />
                              {deviceCounts[rack.id] || 0} Devices
                            </Button>
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
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 p-1.5 h-auto rounded-lg"
                                title="Manage"
                              >
                                <Server className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
            ) : selectedRackForDevices?.devices &&
              selectedRackForDevices.devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sensor Data</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={getDeviceStatusBadgeColor(device.status)}
                          >
                            {device.status || "Unknown"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.type === "Sensor" ? (
                          (() => {
                            const formattedData = formatSensorData(
                              device,
                              sensorData[device.id]
                            );
                            return (
                              <div className="space-y-2">
                                {/* Main display value with status */}
                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${getStatusColor(
                                    formattedData.status
                                  )}`}
                                >
                                  <span className="text-sm">
                                    {getStatusIcon(formattedData.status)}
                                  </span>
                                  <span className="font-bold text-sm">
                                    {formattedData.display}
                                  </span>
                                </div>

                                {/* Detailed values */}
                                {formattedData.values.length > 0 && (
                                  <div className="grid grid-cols-2 gap-1">
                                    {formattedData.values.map((value, idx) => (
                                      <div
                                        key={idx}
                                        className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                                          value.status
                                        )}`}
                                      >
                                        <div className="font-medium">
                                          {value.value}
                                        </div>
                                        <div className="text-xs opacity-75">
                                          {value.label}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Timestamp */}
                                {formattedData.timestamp &&
                                  formattedData.timestamp !== "N/A" && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>🕒</span>
                                      <span>{formattedData.timestamp}</span>
                                    </div>
                                  )}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                            N/A - Not a sensor
                          </span>
                        )}
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
