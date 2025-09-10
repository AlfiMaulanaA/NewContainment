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
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900",
    borderColor: "border-rose-200 dark:border-rose-800",
    name: "Temperature",
    shortName: "TEMP",
    unit: "°C",
  },
  "Air Flow": {
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900",
    borderColor: "border-sky-200 dark:border-sky-800",
    name: "Air Flow",
    shortName: "FLOW",
    unit: "L/min",
  },
  Vibration: {
    icon: Waves,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900",
    borderColor: "border-violet-200 dark:border-violet-800",
    name: "Vibration",
    shortName: "VIB",
    unit: "m/s²",
  },
  "Dust Sensor": {
    icon: Filter,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    borderColor: "border-amber-200 dark:border-amber-800",
    name: "Dust Level",
    shortName: "DUST",
    unit: "µg/m³",
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
    name: "Humidity",
    shortName: "HUM",
    unit: "%",
  },
  Pressure: {
    icon: Gauge,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    name: "Pressure",
    shortName: "PRESS",
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

        // Extract all available dust sensor data
        const dustValues = [];

        // Primary dust measurement
        if (dust !== undefined && dust !== null) {
          dustValues.push({
            label: "PM2.5",
            value: `${dust?.toFixed(1) || "--"} µg/m³`,
            status: dustStatus,
          });
        }

        // Additional dust sensor fields
        if (data.pm10 !== undefined && data.pm10 !== null) {
          const pm10Status =
            data.pm10 > 150
              ? "critical"
              : data.pm10 > 50
              ? "warning"
              : "normal";
          dustValues.push({
            label: "PM10",
            value: `${data.pm10?.toFixed(1) || "--"} µg/m³`,
            status: pm10Status,
          });
        }

        if (data.pm1 !== undefined && data.pm1 !== null) {
          const pm1Status =
            data.pm1 > 35 ? "critical" : data.pm1 > 15 ? "warning" : "normal";
          dustValues.push({
            label: "PM1.0",
            value: `${data.pm1?.toFixed(1) || "--"} µg/m³`,
            status: pm1Status,
          });
        }

        if (data.aqi !== undefined && data.aqi !== null) {
          const aqiStatus =
            data.aqi > 150 ? "critical" : data.aqi > 100 ? "warning" : "normal";
          dustValues.push({
            label: "AQI",
            value: `${data.aqi?.toFixed(0) || "--"}`,
            status: aqiStatus,
          });
        }

        if (data.temperature !== undefined && data.temperature !== null) {
          const tempStatus =
            data.temperature > 35
              ? "critical"
              : data.temperature > 25
              ? "warning"
              : "normal";
          dustValues.push({
            label: "Temp",
            value: `${data.temperature?.toFixed(1) || "--"}°C`,
            status: tempStatus,
          });
        }

        if (data.humidity !== undefined && data.humidity !== null) {
          const humStatus = data.humidity > 70 ? "warning" : "normal";
          dustValues.push({
            label: "Humidity",
            value: `${data.humidity?.toFixed(1) || "--"}%`,
            status: humStatus,
          });
        }

        // If no specific values found, show the raw data
        if (dustValues.length === 0) {
          dustValues.push({
            label: "Dust Level",
            value: `${dust?.toFixed(1) || "--"} µg/m³`,
            status: dustStatus,
          });
        }

        return {
          display: `${dust?.toFixed(1) || "--"} µg/m³`,
          status: dustStatus,
          values: dustValues,
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
        return "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-400/15 border-emerald-500/30 dark:border-emerald-400/30";
      case "warning":
        return "text-amber-700 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/30 dark:border-amber-400/30";
      case "critical":
        return "text-red-700 dark:text-red-300 bg-red-500/15 dark:bg-red-400/15 border-red-500/30 dark:border-red-400/30";
      case "offline":
        return "text-gray-600 dark:text-gray-400 bg-gray-500/15 dark:bg-gray-400/15 border-gray-500/30 dark:border-gray-400/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10 border-gray-500/20 dark:border-gray-400/20";
    }
  };

  // Enhanced value-based color styling for sensor readings
  const getValueBasedColor = (
    value: number,
    sensorType: string,
    status: string
  ) => {
    const baseColors = getStatusColor(status);

    switch (sensorType) {
      case "Temperature":
        if (value >= 35) {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        } else if (value >= 30) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else if (value >= 25) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 20) {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        } else {
          return "text-blue-700 dark:text-blue-300 bg-gradient-to-br from-blue-500/15 to-cyan-500/15 dark:from-blue-400/15 dark:to-cyan-400/15 border-blue-500/30 dark:border-blue-400/30";
        }

      case "Humidity":
        if (value >= 80) {
          return "text-blue-800 dark:text-blue-200 bg-gradient-to-br from-blue-500/20 to-blue-600/20 dark:from-blue-400/20 dark:to-blue-500/20 border-blue-500/40 dark:border-blue-400/40";
        } else if (value >= 70) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 40) {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        } else if (value >= 30) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-orange-500/15 dark:from-amber-400/15 dark:to-orange-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-red-600/15 dark:from-red-400/15 dark:to-red-500/15 border-red-500/30 dark:border-red-400/30";
        }

      case "Air Flow":
        if (value >= 50) {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        } else if (value >= 30) {
          return "text-blue-700 dark:text-blue-300 bg-gradient-to-br from-blue-500/15 to-sky-500/15 dark:from-blue-400/15 dark:to-sky-400/15 border-blue-500/30 dark:border-blue-400/30";
        } else if (value >= 20) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 10) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        }

      case "Dust Sensor":
        if (value >= 100) {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        } else if (value >= 75) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else if (value >= 35) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 15) {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        } else {
          return "text-green-700 dark:text-green-300 bg-gradient-to-br from-green-500/15 to-emerald-500/15 dark:from-green-400/15 dark:to-emerald-400/15 border-green-500/30 dark:border-green-400/30";
        }

      case "Vibration":
        if (value >= 3) {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        } else if (value >= 2) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else if (value >= 1) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 0.5) {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        } else {
          return "text-green-700 dark:text-green-300 bg-gradient-to-br from-green-500/15 to-emerald-500/15 dark:from-green-400/15 dark:to-emerald-400/15 border-green-500/30 dark:border-green-400/30";
        }

      case "Pressure":
        if (value >= 1050 || value <= 950) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-red-600/15 dark:from-red-400/15 dark:to-red-500/15 border-red-500/30 dark:border-red-400/30";
        } else if (
          (value >= 1030 && value < 1050) ||
          (value > 950 && value <= 970)
        ) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        }

      default:
        return baseColors;
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
        return "text-green-700 dark:text-green-300 bg-green-500/10 dark:bg-green-400/10";
      case "inactive":
      case "offline":
        return "text-muted-foreground bg-muted";
      case "error":
        return "text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-400/10";
      case "warning":
        return "text-yellow-700 dark:text-yellow-300 bg-yellow-500/10 dark:bg-yellow-400/10";
      case "maintenance":
        return "text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-400/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <>
      <Card className="flex flex-col flex-grow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <div className="flex gap-2 items-center">
                <Server className="h-4 w-4 text-green-500" />
                {containmentId
                  ? `Racks in ${
                      containmentName || getContainmentName(containmentId)
                    }`
                  : "Total Racks"}
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
                      className="group flex flex-col shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 bg-background text-foreground min-h-[400px] max-h-[600px]"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                              <Server className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-bold">{rack.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={rack.isActive ? "default" : "secondary"}
                              className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                                rack.isActive
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-500 text-white"
                              }`}
                            >
                              {rack.isActive ? (
                                <>
                                  <CircleCheck className="h-4 w-4 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-3 flex-1">
                          {rackDevices[rack.id] &&
                          rackDevices[rack.id].length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {/* Container dengan scroll untuk devices */}
                              <div
                                className={`flex flex-col gap-2 ${
                                  rackDevices[rack.id].filter(
                                    (device) => device.type === "Sensor"
                                  ).length > 3
                                    ? "max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
                                    : ""
                                }`}
                              >
                                {rackDevices[rack.id]
                                  .filter((device) => device.type === "Sensor")
                                  .map((device, deviceIndex) => {
                                    const visual = device.sensorType
                                      ? SENSOR_TYPE_VISUALS[
                                          device.sensorType as keyof typeof SENSOR_TYPE_VISUALS
                                        ]
                                      : undefined;
                                    const IconComponent = visual?.icon;
                                    const formattedData = formatSensorData(
                                      device,
                                      sensorData[device.id]
                                    );

                                    // Extract main value for color determination
                                    const mainValue =
                                      formattedData.values.length > 0
                                        ? parseFloat(
                                            formattedData.values[0].value.replace(
                                              /[^0-9.-]/g,
                                              ""
                                            )
                                          ) || 0
                                        : 0;

                                    return (
                                      <div
                                        key={device.id}
                                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 ${getValueBasedColor(
                                          mainValue,
                                          device.sensorType || "",
                                          formattedData.status
                                        )}`}
                                      >
                                        {/* Hapus gradien overlay */}
                                        {formattedData.status ===
                                          "critical" && (
                                          <div className="absolute top-2 right-2">
                                            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                                          </div>
                                        )}
                                        <div className="relative p-3">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              {IconComponent && (
                                                <div
                                                  className={`relative p-2 rounded-xl shadow-lg bg-primary/10 border border-primary/20`}
                                                >
                                                  <IconComponent
                                                    className={`h-4 w-4 text-primary drop-shadow-sm`}
                                                  />
                                                </div>
                                              )}
                                              <div className="flex flex-col">
                                                <span className="font-bold text-xs tracking-wide uppercase">
                                                  {visual?.shortName ||
                                                    visual?.name ||
                                                    device.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                  {device.name.length > 25
                                                    ? device.name.substring(
                                                        0,
                                                        25
                                                      ) + "..."
                                                    : device.name}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {formattedData.timestamp &&
                                                formattedData.timestamp !==
                                                  "N/A" && (
                                                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground bg-secondary/20 rounded-full px-3 py-1 border border-secondary/20">
                                                    <Clock className="h-2.5 w-2.5" />
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
                                          {formattedData.values.length > 0 && (
                                            <div
                                              className={`grid gap-1.5 mb-1 ${
                                                formattedData.values.length ===
                                                1
                                                  ? "grid-cols-1"
                                                  : "grid-cols-2"
                                              }`}
                                            >
                                              {formattedData.values
                                                .slice(0, 4)
                                                .map((value, idx) => {
                                                  // Extract numeric value for color determination
                                                  const numericValue =
                                                    parseFloat(
                                                      value.value.replace(
                                                        /[^0-9.-]/g,
                                                        ""
                                                      )
                                                    ) || 0;
                                                  const sensorType =
                                                    device.sensorType || "";

                                                  return (
                                                    <div
                                                      key={idx}
                                                      className={`relative overflow-hidden rounded-lg px-2 py-1.5 text-center border shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${getValueBasedColor(
                                                        numericValue,
                                                        sensorType,
                                                        value.status
                                                      )}`}
                                                    >
                                                      <div className="text-xs font-bold">
                                                        {value.value}
                                                      </div>
                                                      <div className="text-[9px] font-medium uppercase tracking-wider opacity-90">
                                                        {value.label}
                                                      </div>
                                                      {/* Status indicator dot */}
                                                      {value.status ===
                                                        "critical" && (
                                                        <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                                                      )}
                                                      {value.status ===
                                                        "warning" && (
                                                        <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-amber-500 rounded-full shadow-lg"></div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>

                              {/* Indikator scroll jika ada lebih dari 3 devices */}
                              {rackDevices[rack.id].filter(
                                (device) => device.type === "Sensor"
                              ).length > 3 && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-secondary/10 rounded-lg py-2 border border-dashed border-border">
                                  <div className="animate-bounce">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                      />
                                    </svg>
                                  </div>
                                  <span className="font-medium">
                                    {
                                      rackDevices[rack.id].filter(
                                        (device) => device.type === "Sensor"
                                      ).length
                                    }{" "}
                                    sensors • Scroll to see more
                                  </span>
                                </div>
                              )}

                              {rackDevices[rack.id].filter(
                                (device) => device.type === "Sensor"
                              ).length === 0 && (
                                <div className="text-center py-4 text-muted-foreground bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                                  <div className="relative">
                                    <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-pulse"></div>
                                  </div>
                                  <span className="text-sm font-semibold">
                                    No Sensors Available
                                  </span>
                                  <p className="text-xs mt-1">
                                    Install sensors to monitor
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                              <div className="relative">
                                <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-60" />
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full animate-ping"></div>
                              </div>
                              <span className="text-sm font-semibold">
                                No Devices Connected
                              </span>
                              <p className="text-xs mt-1">
                                Add devices to get started
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRackDevices(rack)}
                              className="group flex-1 mr-2 text-primary hover:text-primary-foreground border border-primary/20 hover:bg-primary/20 px-3 py-2 h-auto text-xs font-semibold rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
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
                                className="group text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 p-2.5 h-auto rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
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
                    <TableHead>Sensor Type</TableHead>
                    <TableHead>MQTT Topic</TableHead>
                    <TableHead>Status</TableHead>
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
                        {device.sensorType ? (
                          <Badge variant="outline">{device.sensorType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {device.topic ? (
                          <span className="font-mono text-xs">
                            {device.topic.length > 25 ? `${device.topic.substring(0, 25)}...` : device.topic}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                        {device.description || (
                          <span className="text-muted-foreground">No description</span>
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
