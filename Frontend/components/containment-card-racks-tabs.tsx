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
  Sparkles,
  TrendingUp,
  Shield,
  Cpu,
  CircleCheck,
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

// Enhanced sensor type visuals with modern design and better colors
const SENSOR_TYPE_VISUALS = {
  Temperature: {
    icon: Thermometer,
    color: "text-rose-700",
    bgColor: "bg-gradient-to-br from-rose-100 to-red-50",
    borderColor: "border-rose-200/70",
    glowColor: "shadow-rose-100/50",
    name: "Temperature",
    shortName: "TEMP",
    unit: "°C",
    gradient: "from-rose-500 to-red-600",
  },
  "Air Flow": {
    icon: Wind,
    color: "text-sky-700",
    bgColor: "bg-gradient-to-br from-sky-100 to-cyan-50",
    borderColor: "border-sky-200/70",
    glowColor: "shadow-sky-100/50",
    name: "Air Flow",
    shortName: "FLOW",
    unit: "L/min",
    gradient: "from-sky-500 to-cyan-600",
  },
  Vibration: {
    icon: Waves,
    color: "text-violet-700",
    bgColor: "bg-gradient-to-br from-violet-100 to-purple-50",
    borderColor: "border-violet-200/70",
    glowColor: "shadow-violet-100/50",
    name: "Vibration",
    shortName: "VIB",
    unit: "m/s²",
    gradient: "from-violet-500 to-purple-600",
  },
  "Dust Sensor": {
    icon: Filter,
    color: "text-amber-700",
    bgColor: "bg-gradient-to-br from-amber-100 to-orange-50",
    borderColor: "border-amber-200/70",
    glowColor: "shadow-amber-100/50",
    name: "Dust Level",
    shortName: "DUST",
    unit: "µg/m³",
    gradient: "from-amber-500 to-orange-600",
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-700",
    bgColor: "bg-gradient-to-br from-blue-100 to-indigo-50",
    borderColor: "border-blue-200/70",
    glowColor: "shadow-blue-100/50",
    name: "Humidity",
    shortName: "HUM",
    unit: "%",
    gradient: "from-blue-500 to-indigo-600",
  },
  Pressure: {
    icon: Gauge,
    color: "text-emerald-700",
    bgColor: "bg-gradient-to-br from-emerald-100 to-teal-50",
    borderColor: "border-emerald-200/70",
    glowColor: "shadow-emerald-100/50",
    name: "Pressure",
    shortName: "PRESS",
    unit: "hPa",
    gradient: "from-emerald-500 to-teal-600",
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

  // Enhanced status styling with modern glassmorphism and better colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-emerald-800 bg-gradient-to-br from-emerald-50/90 to-green-100/60 border-emerald-300/50 shadow-lg shadow-emerald-100/30 backdrop-blur-sm";
      case "warning":
        return "text-amber-800 bg-gradient-to-br from-amber-50/90 to-orange-100/60 border-amber-300/50 shadow-lg shadow-amber-100/30 backdrop-blur-sm";
      case "critical":
        return "text-red-800 bg-gradient-to-br from-red-50/90 to-rose-100/60 border-red-300/50 shadow-lg shadow-red-100/30 backdrop-blur-sm";
      case "offline":
        return "text-slate-600 bg-gradient-to-br from-slate-100/90 to-gray-100/60 border-slate-300/50 shadow-lg shadow-slate-100/30 backdrop-blur-sm";
      default:
        return "text-slate-700 bg-gradient-to-br from-slate-50/90 to-gray-100/60 border-slate-300/50 shadow-lg shadow-slate-100/30 backdrop-blur-sm";
    }
  };

  // Modern status icons with better visual hierarchy
  const getStatusIcon = (status: string, size: "sm" | "md" | "lg" = "sm") => {
    const iconSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };
    const iconClass = iconSizes[size];

    switch (status) {
      case "normal":
        return (
          <CheckCircle
            className={`${iconClass} text-emerald-600 drop-shadow-sm`}
          />
        );
      case "warning":
        return (
          <AlertTriangle
            className={`${iconClass} text-amber-600 drop-shadow-sm`}
          />
        );
      case "critical":
        return (
          <AlertTriangle
            className={`${iconClass} text-red-600 drop-shadow-sm animate-pulse`}
          />
        );
      case "offline":
        return (
          <WifiOff className={`${iconClass} text-slate-500 drop-shadow-sm`} />
        );
      default:
        return (
          <Clock className={`${iconClass} text-slate-400 drop-shadow-sm`} />
        );
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
                      className="group flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/30 border-2 border-slate-200/50 hover:border-blue-300/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 backdrop-blur-sm"
                    >
                      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50/80 to-gray-50/40 rounded-t-lg border-b border-slate-100/50">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/30">
                              <Server className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-bold text-gray-900">
                              {rack.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={rack.isActive ? "default" : "secondary"}
                              className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                rack.isActive
                                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-400"
                                  : "bg-gradient-to-r from-gray-400 to-slate-500 text-white"
                              }`}
                            >
                              {rack.isActive ? (
                                <>
                                  <CircleCheck className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </div>
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
                                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 ${getStatusColor(
                                        formattedData.status
                                      )} ${visual?.glowColor || ""}`}
                                    >
                                      {/* Modern gradient background overlay */}
                                      <div
                                        className={`absolute inset-0 opacity-5 bg-gradient-to-br ${
                                          visual?.gradient ||
                                          "from-gray-500 to-gray-600"
                                        }`}
                                      />

                                      {/* Status indicator pulse */}
                                      {formattedData.status === "critical" && (
                                        <div className="absolute top-2 right-2">
                                          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                                        </div>
                                      )}

                                      <div className="relative p-3">
                                        {/* Enhanced header with modern typography */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            {IconComponent && (
                                              <div
                                                className={`relative p-2 rounded-xl shadow-lg ${
                                                  visual?.bgColor
                                                } ${
                                                  visual?.borderColor || ""
                                                } border`}
                                              >
                                                <IconComponent
                                                  className={`h-4 w-4 ${visual?.color} drop-shadow-sm`}
                                                />
                                              </div>
                                            )}
                                            <div className="flex flex-col">
                                              <span className="font-bold text-xs tracking-wide text-gray-900 uppercase">
                                                {visual?.shortName ||
                                                  visual?.name ||
                                                  device.name}
                                              </span>
                                              <span className="text-[10px] text-gray-600 font-medium">
                                                {device.name.length > 15
                                                  ? device.name.substring(
                                                      0,
                                                      15
                                                    ) + "..."
                                                  : device.name}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {formattedData.timestamp &&
                                              formattedData.timestamp !==
                                                "N/A" && (
                                                <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 bg-white/40 rounded-full px-3 py-1 backdrop-blur-sm border border-white/30">
                                                  <Clock className="h-2.5 w-2.5 text-gray-500" />
                                                  <span className="font-medium">
                                                    {formattedData.timestamp}
                                                  </span>
                                                </div>
                                              )}
                                            {getStatusIcon(
                                              formattedData.status,
                                              "md"
                                            )}
                                          </div>
                                        </div>
                                        {/*                                         
                                        <div className="text-center mb-3">
                                          <div className="text-2xl font-black text-gray-900 leading-none tracking-tight mb-1">
                                            {formattedData.display}
                                          </div>
                                          <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto opacity-30"></div>
                                        </div> */}
                                        {/* Enhanced metrics grid with glassmorphism */}
                                        {formattedData.values.length > 1 && (
                                          <div className="grid grid-cols-2 gap-1.5 mb-3">
                                            {formattedData.values
                                              .slice(0, 4)
                                              .map((value, idx) => (
                                                <div
                                                  key={idx}
                                                  className={`relative overflow-hidden rounded-lg px-2 py-1.5 text-center backdrop-blur-sm border shadow-sm ${getStatusColor(
                                                    value.status
                                                  )} transition-all duration-300 hover:shadow-md`}
                                                >
                                                  <div className="text-xs font-bold text-gray-900">
                                                    {value.value}
                                                  </div>
                                                  <div className="text-[9px] text-gray-700 font-medium uppercase tracking-wider opacity-80">
                                                    {value.label}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                        {/* Elegant timestamp with better spacing */}
                                      </div>
                                    </div>
                                  );
                                })}
                              {rackDevices[rack.id].filter(
                                (device) => device.type === "Sensor"
                              ).length === 0 && (
                                <div className="text-center py-4 text-gray-500 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300/50 backdrop-blur-sm">
                                  <div className="relative">
                                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400 opacity-60" />
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-pulse"></div>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-600">
                                    No Sensors Available
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Install sensors to monitor
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-500 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300/50 backdrop-blur-sm">
                              <div className="relative">
                                <HardDrive className="h-10 w-10 mx-auto mb-3 text-gray-400 opacity-60" />
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-400 rounded-full animate-ping"></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-600">
                                No Devices Connected
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                Add devices to get started
                              </p>
                            </div>
                          )}

                          {/* Enhanced footer with gradient and better styling */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gradient-to-r from-transparent via-gray-200 to-transparent">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRackDevices(rack)}
                              className="group flex-1 mr-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-700 hover:text-blue-900 border border-blue-200/50 hover:border-blue-300 px-3 py-2 h-auto text-xs font-semibold rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                              title="View all devices in this rack"
                            >
                              <HardDrive className="h-3.5 w-3.5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                              <span>{deviceCounts[rack.id] || 0} Devices</span>
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
                                className="group bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-700 hover:text-emerald-900 border border-emerald-200/50 hover:border-emerald-300 p-2.5 h-auto rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                                title="Manage devices"
                              >
                                <Server className="h-3.5 w-3.5 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
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
                                {/* Enhanced main display with visual improvements */}
                                <div
                                  className={`relative inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-md transition-all duration-300 hover:shadow-lg ${getStatusColor(
                                    formattedData.status
                                  )}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(formattedData.status, "md")}
                                    <span className="font-black text-base tracking-tight">
                                      {formattedData.display}
                                    </span>
                                  </div>
                                  {formattedData.status === "critical" && (
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                                  )}
                                </div>

                                {/* Enhanced detailed values grid */}
                                {formattedData.values.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {formattedData.values.map((value, idx) => (
                                      <div
                                        key={idx}
                                        className={`relative overflow-hidden px-3 py-2 rounded-lg text-sm border shadow-sm transition-all duration-300 hover:shadow-md ${getStatusColor(
                                          value.status
                                        )}`}
                                      >
                                        <div className="font-bold text-gray-900">
                                          {value.value}
                                        </div>
                                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide opacity-80">
                                          {value.label}
                                        </div>
                                        {value.status === "warning" && (
                                          <div className="absolute top-1 right-1 h-2 w-2 bg-amber-400 rounded-full"></div>
                                        )}
                                        {value.status === "critical" && (
                                          <div className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Enhanced timestamp display */}
                                {formattedData.timestamp &&
                                  formattedData.timestamp !== "N/A" && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600 bg-gradient-to-r from-gray-100/50 to-slate-100/50 rounded-full px-4 py-2 border border-gray-200/50 backdrop-blur-sm">
                                      <Clock className="h-3 w-3 text-gray-500" />
                                      <span className="font-medium">
                                        Last updated: {formattedData.timestamp}
                                      </span>
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
