"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Filter,
  Waves,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  Maximize,
  BarChart3,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  deviceSensorDataApi,
  devicesApi,
  Device,
  DeviceSensorData,
  containmentsApi,
  Containment,
  cameraConfigApi,
  CameraConfig,
} from "@/lib/api-service";
import { mqttClient } from "@/lib/mqtt";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Enhanced sensor type visuals with modern design
const SENSOR_TYPE_VISUALS = {
  Temperature: {
    icon: Thermometer,
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    gradientFrom: "from-rose-500",
    gradientTo: "to-orange-500",
    name: "Temperature",
    shortName: "TEMP",
    unit: "°C",
  },
  "Air Flow": {
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    borderColor: "border-sky-200 dark:border-sky-800",
    gradientFrom: "from-sky-500",
    gradientTo: "to-cyan-500",
    name: "Air Flow",
    shortName: "FLOW",
    unit: "L/min",
  },
  Vibration: {
    icon: Waves,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderColor: "border-violet-200 dark:border-violet-800",
    gradientFrom: "from-violet-500",
    gradientTo: "to-purple-500",
    name: "Vibration",
    shortName: "VIB",
    unit: "m/s²",
  },
  "Dust Sensor": {
    icon: Filter,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    gradientFrom: "from-amber-500",
    gradientTo: "to-yellow-500",
    name: "Dust Level",
    shortName: "DUST",
    unit: "µg/m³",
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    gradientFrom: "from-blue-500",
    gradientTo: "to-indigo-500",
    name: "Humidity",
    shortName: "HUM",
    unit: "%",
  },
  Pressure: {
    icon: Gauge,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-green-500",
    name: "Pressure",
    shortName: "PRESS",
    unit: "hPa",
  },
};

interface SensorRealtimeData {
  deviceId: number;
  currentValue: any;
  timestamp: Date;
  status: "normal" | "warning" | "critical" | "offline";
  history: { timestamp: Date; value: any }[];
}

interface KeyAverage {
  key: string;
  value: number;
  unit: string;
  count: number;
  status: "normal" | "warning" | "critical" | "offline";
}

interface SensorGroup {
  sensorType: string;
  devices: Device[];
  realtimeData: Record<number, SensorRealtimeData>;
  average: {
    value: number;
    status: "normal" | "warning" | "critical" | "offline";
    lastUpdated: Date;
  };
  keyAverages: KeyAverage[];
}

export default function SensorMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [sensorGroups, setSensorGroups] = useState<Record<string, SensorGroup>>({});
  const [selectedContainment, setSelectedContainment] = useState<string>("all");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("all");
  const [mqttConnected, setMqttConnected] = useState(false);
  const [selectedCameraForDialog, setSelectedCameraForDialog] = useState<CameraConfig | null>(null);
  const [cctvDialogOpen, setCctvDialogOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    
    // Demo: Add some sample data for testing key averages
    // setTimeout(() => {
    //   addSampleData();
    // }, 2000);
  }, []);

  // Demo function to add sample sensor data
  const addSampleData = () => {
    // Sample Temperature sensor data
    const tempSample1 = {
      temp: 25.5,
      humidity: 65,
      air_pressure_hpa: 1013.2,
      voltage: 3.3
    };
    
    const tempSample2 = {
      temp: 27.2,
      humidity: 58,
      air_pressure_hpa: 1015.1,
      voltage: 3.1
    };
    
    // Sample Air Flow sensor data
    const flowSample1 = {
      air_flow_lpm: 45.2,
      air_pressure_hpa: 1012.8,
      temp: 23.1
    };
    
    const flowSample2 = {
      air_flow_lpm: 52.7,
      air_pressure_hpa: 1014.3,
      temp: 24.8
    };

    // Find some sensor devices to add data to
    const tempSensors = devices.filter(d => d.sensorType === 'Temperature');
    const flowSensors = devices.filter(d => d.sensorType === 'Air Flow');
    
    if (tempSensors.length >= 2) {
      updateRealtimeData(tempSensors[0].id, 'Temperature', tempSample1);
      updateRealtimeData(tempSensors[1].id, 'Temperature', tempSample2);
    }
    
    if (flowSensors.length >= 2) {
      updateRealtimeData(flowSensors[0].id, 'Air Flow', flowSample1);
      updateRealtimeData(flowSensors[1].id, 'Air Flow', flowSample2);
    }
    
    console.log('Added sample data for key averages testing');
  };

  // Setup MQTT connection and monitoring
  useEffect(() => {
    const connectionListener = (connected: boolean) => {
      setMqttConnected(connected);
    };

    mqttClient.addConnectionListener(connectionListener);
    mqttClient.connect();

    return () => {
      mqttClient.removeConnectionListener(connectionListener);
    };
  }, []);

  // Subscribe to MQTT topics for all sensor devices
  useEffect(() => {
    if (!mqttConnected || devices.length === 0) return;

    const sensorDevices = devices.filter(device => device.type === "Sensor" && device.topic);
    const subscriptions = new Map<string, () => void>();

    sensorDevices.forEach(device => {
      if (device.topic) {
        const callback = (topic: string, message: string) => {
          try {
            const parsedData = JSON.parse(message);
            updateRealtimeData(device.id, device.sensorType!, parsedData);
          } catch (error) {
            console.error(`Failed to parse MQTT data for device ${device.id}:`, error);
            updateRealtimeData(device.id, device.sensorType!, message);
          }
        };

        mqttClient.subscribe(device.topic, callback);
        subscriptions.set(device.topic, () => {
          if (device.topic) {
            mqttClient.unsubscribe(device.topic, callback);
          }
        });
      }
    });

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [mqttConnected, devices]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [devicesResult, containmentsResult, camerasResult] = await Promise.all([
        devicesApi.getDevices(),
        containmentsApi.getContainments(),
        cameraConfigApi.getCameraConfigs().catch(() => ({ success: false, data: [] }))
      ]);

      if (devicesResult.success && devicesResult.data) {
        const sensorDevices = devicesResult.data.filter(device => device.type === "Sensor");
        setDevices(sensorDevices);
        initializeSensorGroups(sensorDevices);
        
        if (sensorDevices.length === 0) {
          console.warn("No sensor devices found in the system");
        }
      } else {
        console.warn("Failed to load devices:", devicesResult.message);
        setDevices([]);
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      }

      if (camerasResult.success && camerasResult.data) {
        setCameras(camerasResult.data);
      }

      // Load historical data for initial averages (optional, non-blocking)
      loadHistoricalData().catch(error => {
        console.warn("Historical data loading failed, continuing without it:", error);
      });
    } catch (error: any) {
      toast.error("Failed to load initial data");
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSensorGroups = (devices: Device[]) => {
    const groups: Record<string, SensorGroup> = {};

    devices.forEach(device => {
      if (device.sensorType && device.type === "Sensor") {
        if (!groups[device.sensorType]) {
          groups[device.sensorType] = {
            sensorType: device.sensorType,
            devices: [],
            realtimeData: {},
            average: {
              value: 0,
              status: "normal",
              lastUpdated: new Date()
            },
            keyAverages: []
          };
        }
        groups[device.sensorType].devices.push(device);
        
        // Initialize realtime data
        groups[device.sensorType].realtimeData[device.id] = {
          deviceId: device.id,
          currentValue: null,
          timestamp: new Date(),
          status: "offline",
          history: []
        };
      }
    });

    setSensorGroups(groups);
  };

  const updateRealtimeData = (deviceId: number, sensorType: string, data: any) => {
    setSensorGroups(prevGroups => {
      const updatedGroups = { ...prevGroups };
      
      if (updatedGroups[sensorType] && updatedGroups[sensorType].realtimeData[deviceId]) {
        const timestamp = new Date();
        const realtimeData = updatedGroups[sensorType].realtimeData[deviceId];
        
        // Update current value and add to history
        realtimeData.currentValue = data;
        realtimeData.timestamp = timestamp;
        realtimeData.status = calculateStatus(sensorType, data);
        
        // Keep last 50 history entries
        realtimeData.history.push({ timestamp, value: data });
        if (realtimeData.history.length > 50) {
          realtimeData.history = realtimeData.history.slice(-50);
        }
        
        // Recalculate group average and key averages
        updatedGroups[sensorType] = {
          ...updatedGroups[sensorType],
          average: calculateGroupAverage(updatedGroups[sensorType]),
          keyAverages: calculateKeyAverages(updatedGroups[sensorType])
        };
      }
      
      return updatedGroups;
    });
  };

  const calculateStatus = (sensorType: string, data: any): "normal" | "warning" | "critical" | "offline" => {
    if (!data || typeof data !== "object") return "offline";

    switch (sensorType) {
      case "Temperature":
        const temp = data.temp || data.temperature;
        return temp > 35 ? "critical" : temp > 30 ? "warning" : "normal";
      
      case "Air Flow":
        const flow = data.air_flow_lpm || data.flow;
        return flow < 10 ? "critical" : flow < 20 ? "warning" : "normal";
      
      case "Dust Sensor":
        const dust = data.dust_level_ug_m3 || data.dust || data.pm25;
        return dust > 100 ? "critical" : dust > 50 ? "warning" : "normal";
      
      case "Vibration":
        const x = data.vibration_x || data.x || 0;
        const y = data.vibration_y || data.y || 0;
        const z = data.vibration_z || data.z || 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        return magnitude > 3 ? "critical" : magnitude > 1.5 ? "warning" : "normal";
      
      default:
        return "normal";
    }
  };

  const calculateKeyAverages = (group: SensorGroup): KeyAverage[] => {
    const activeData = Object.values(group.realtimeData).filter(
      data => data.status !== "offline" && data.currentValue && typeof data.currentValue === 'object'
    );

    if (activeData.length === 0) {
      return [];
    }

    console.log(`Calculating key averages for ${group.sensorType}:`, {
      activeData: activeData.length,
      sampleData: activeData[0]?.currentValue
    });

    // Kumpulkan semua keys dari semua sensor yang aktif
    const allKeys = new Set<string>();
    activeData.forEach(data => {
      if (data.currentValue && typeof data.currentValue === 'object') {
        Object.keys(data.currentValue).forEach(key => allKeys.add(key));
      }
    });

    // Hitung rata-rata untuk setiap key
    const keyAverages: KeyAverage[] = [];
    
    allKeys.forEach(key => {
      const valuesForKey: number[] = [];
      let criticalCount = 0;
      let warningCount = 0;

      activeData.forEach(data => {
        if (data.currentValue && typeof data.currentValue === 'object' && key in data.currentValue) {
          const value = data.currentValue[key];
          if (typeof value === 'number') {
            valuesForKey.push(value);
            
            // Hitung status berdasarkan key dan sensor type
            const keyStatus = calculateKeyStatus(group.sensorType, key, value);
            if (keyStatus === "critical") criticalCount++;
            else if (keyStatus === "warning") warningCount++;
          }
        }
      });

      if (valuesForKey.length > 0) {
        const average = valuesForKey.reduce((sum, val) => sum + val, 0) / valuesForKey.length;
        const status: "normal" | "warning" | "critical" | "offline" = 
          criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "normal";
        
        keyAverages.push({
          key: formatKeyName(key),
          value: average,
          unit: getUnitForKey(group.sensorType, key),
          count: valuesForKey.length,
          status
        });
      }
    });

    return keyAverages.sort((a, b) => a.key.localeCompare(b.key));
  };

  const calculateKeyStatus = (sensorType: string, key: string, value: number): "normal" | "warning" | "critical" => {
    switch (sensorType) {
      case "Temperature":
        if (key.toLowerCase().includes('temp')) {
          return value > 35 ? "critical" : value > 30 ? "warning" : "normal";
        } else if (key.toLowerCase().includes('hum')) {
          return value > 80 ? "warning" : value < 20 ? "warning" : "normal";
        }
        break;
      
      case "Air Flow":
        if (key.toLowerCase().includes('flow') || key.toLowerCase().includes('lpm')) {
          return value < 10 ? "critical" : value < 20 ? "warning" : "normal";
        } else if (key.toLowerCase().includes('pressure')) {
          return value < 990 ? "warning" : value > 1030 ? "warning" : "normal";
        }
        break;
      
      case "Dust Sensor":
        if (key.toLowerCase().includes('dust') || key.toLowerCase().includes('pm')) {
          return value > 100 ? "critical" : value > 50 ? "warning" : "normal";
        }
        break;
      
      case "Vibration":
        if (key.toLowerCase().includes('vibration') || ['x', 'y', 'z'].includes(key.toLowerCase())) {
          return Math.abs(value) > 3 ? "critical" : Math.abs(value) > 1.5 ? "warning" : "normal";
        }
        break;
      
      case "Humidity":
        return value > 80 ? "warning" : value < 20 ? "warning" : "normal";
      
      case "Pressure":
        return value < 990 ? "warning" : value > 1030 ? "warning" : "normal";
    }
    
    return "normal";
  };

  const formatKeyName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  const getUnitForKey = (sensorType: string, key: string): string => {
    const keyLower = key.toLowerCase();
    
    // Mapping berdasarkan key name
    if (keyLower.includes('temp')) return '°C';
    if (keyLower.includes('hum')) return '%';
    if (keyLower.includes('pressure') || keyLower.includes('hpa')) return 'hPa';
    if (keyLower.includes('flow') || keyLower.includes('lpm')) return 'L/min';
    if (keyLower.includes('dust') || keyLower.includes('pm') || keyLower.includes('ug')) return 'µg/m³';
    if (keyLower.includes('vibration') || ['x', 'y', 'z'].includes(keyLower)) return 'm/s²';
    if (keyLower.includes('voltage')) return 'V';
    if (keyLower.includes('current')) return 'A';
    if (keyLower.includes('power')) return 'W';
    
    // Default berdasarkan sensor type
    const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
    return visual?.unit || '';
  };

  const calculateGroupAverage = (group: SensorGroup) => {
    const activeData = Object.values(group.realtimeData).filter(
      data => data.status !== "offline" && data.currentValue
    );

    if (activeData.length === 0) {
      return { value: 0, status: "offline" as const, lastUpdated: new Date() };
    }

    let totalValue = 0;
    let criticalCount = 0;
    let warningCount = 0;

    activeData.forEach(data => {
      const value = extractNumericValue(group.sensorType, data.currentValue);
      totalValue += value;
      
      if (data.status === "critical") criticalCount++;
      else if (data.status === "warning") warningCount++;
    });

    const averageValue = totalValue / activeData.length;
    const status: "normal" | "warning" | "critical" | "offline" = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "normal";

    return {
      value: averageValue,
      status,
      lastUpdated: new Date()
    };
  };

  const extractNumericValue = (sensorType: string, data: any): number => {
    if (!data || typeof data !== "object") return 0;

    switch (sensorType) {
      case "Temperature":
        return data.temp || data.temperature || 0;
      case "Air Flow":
        return data.air_flow_lpm || data.flow || 0;
      case "Dust Sensor":
        return data.dust_level_ug_m3 || data.dust || data.pm25 || 0;
      case "Humidity":
        return data.hum || data.humidity || 0;
      case "Pressure":
        return data.pressure || data.air_pressure_hpa || 0;
      case "Vibration":
        const x = data.vibration_x || data.x || 0;
        const y = data.vibration_y || data.y || 0;
        const z = data.vibration_z || data.z || 0;
        return Math.sqrt(x * x + y * y + z * z);
      default:
        return 0;
    }
  };

  const loadHistoricalData = async () => {
    try {
      const result = await deviceSensorDataApi.getLatestSensorData(200);
      
      // Debug: Log the full result
      console.log("Historical data API result:", result);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length > 0) {
          // Process historical data to initialize averages
          console.log(`Processing ${result.data.length} historical sensor records`);
          result.data.forEach(sensorData => {
            if (sensorData.device?.sensorType) {
              try {
                const parsedPayload = JSON.parse(sensorData.rawPayload);
                updateRealtimeData(
                  sensorData.deviceId,
                  sensorData.device.sensorType,
                  parsedPayload
                );
              } catch (parseError) {
                console.warn(`Failed to parse payload for device ${sensorData.deviceId}:`, parseError);
                // Try with raw payload as fallback
                updateRealtimeData(
                  sensorData.deviceId,
                  sensorData.device.sensorType,
                  sensorData.rawPayload
                );
              }
            }
          });
        } else {
          console.info("No historical sensor data found - starting with empty data");
        }
      } else {
        // More detailed error logging
        console.warn("Historical data API failed:", {
          success: result.success,
          message: result.message,
          dataType: typeof result.data,
          isArray: Array.isArray(result.data)
        });
      }
    } catch (error) {
      console.error("Error calling historical data API:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
      case "warning":
        return "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20";
      case "critical":
        return "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/20";
      case "offline":
        return "text-gray-700 dark:text-gray-300 bg-gray-500/10 border-gray-500/20";
      default:
        return "text-gray-700 dark:text-gray-300 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "normal":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatValue = (sensorType: string, value: number): string => {
    const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
    if (!visual) return value.toFixed(2);
    
    switch (sensorType) {
      case "Temperature":
      case "Air Flow":
      case "Dust Sensor":
      case "Humidity":
      case "Pressure":
        return `${value.toFixed(1)} ${visual.unit}`;
      case "Vibration":
        return `${value.toFixed(2)} ${visual.unit}`;
      default:
        return value.toFixed(2);
    }
  };

  const filteredSensorGroups = Object.entries(sensorGroups).filter(([sensorType, group]) => {
    if (selectedSensorType !== "all" && sensorType !== selectedSensorType) return false;
    
    if (selectedContainment !== "all") {
      return group.devices.some(device => 
        device.rack?.containmentId === parseInt(selectedContainment)
      );
    }
    
    return true;
  });

  const openCCTVDialog = (camera: CameraConfig) => {
    setSelectedCameraForDialog(camera);
    setCctvDialogOpen(true);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                Monitoring
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Real-time Sensors</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Summary Stats Cards */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sensors</p>
                  <p className="text-2xl font-bold">{devices.length}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sensor Types</p>
                  <p className="text-2xl font-bold">{Object.keys(sensorGroups).length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online Devices</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.values(sensorGroups).reduce((count, group) => 
                      count + Object.values(group.realtimeData).filter(data => data.status !== "offline").length, 0
                    )}
                  </p>
                </div>
                <Wifi className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Key Parameters</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Object.values(sensorGroups).reduce((total, group) => 
                      total + (group.keyAverages?.length || 0), 0
                    )}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header and Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Real-time Sensor Monitoring</CardTitle>
                </div>
                <Badge variant={mqttConnected ? "default" : "destructive"}>
                  {mqttConnected ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      MQTT Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      MQTT Disconnected
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Select value={selectedContainment} onValueChange={setSelectedContainment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Containment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Containments</SelectItem>
                    {containments.map(containment => (
                      <SelectItem key={containment.id} value={containment.id.toString()}>
                        {containment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSensorType} onValueChange={setSelectedSensorType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sensor Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sensors</SelectItem>
                    {Object.keys(SENSOR_TYPE_VISUALS).map(sensorType => (
                      <SelectItem key={sensorType} value={sensorType}>
                        {SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="realtime" className="w-full">
            <Card>
              <CardHeader>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
                  <TabsTrigger value="averages">Key Averages</TabsTrigger>
                </TabsList>
              </CardHeader>
            </Card>

            <TabsContent value="realtime" className="space-y-6">
              {filteredSensorGroups.map(([sensorType, group]) => {
              const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
              const IconComponent = visual?.icon || Activity;

              return (
                <Card key={sensorType} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${visual?.bgColor || 'bg-gray-100'} ${visual?.borderColor || 'border-gray-200'} border-2`}>
                          <IconComponent className={`h-6 w-6 ${visual?.color || 'text-gray-500'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {visual?.name || sensorType} Monitoring
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {group.devices.length} devices • Overall Average: {formatValue(sensorType, group.average.value)}
                          </p>
                          
                          {/* Key Averages Display */}
                          {group.keyAverages.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.keyAverages.map(keyAvg => (
                                <div 
                                  key={keyAvg.key}
                                  className={`px-2 py-1 rounded-md text-xs border ${getStatusColor(keyAvg.status)}`}
                                  title={`Average from ${keyAvg.count} sensors`}
                                >
                                  <span className="font-medium">{keyAvg.key}:</span>
                                  <span className="ml-1">
                                    {keyAvg.value.toFixed(1)}{keyAvg.unit}
                                  </span>
                                  {keyAvg.count > 1 && (
                                    <span className="ml-1 opacity-75">({keyAvg.count})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full border ${getStatusColor(group.average.status)}`}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(group.average.status)}
                            <span className="font-medium text-sm capitalize">
                              {group.average.status}
                            </span>
                          </div>
                        </div>
                        
                        {cameras.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cameras[0] && openCCTVDialog(cameras[0])}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            View CCTV
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.devices.map(device => {
                        const realtimeData = group.realtimeData[device.id];
                        const currentValue = realtimeData?.currentValue;
                        const numericValue = extractNumericValue(sensorType, currentValue);

                        return (
                          <Card key={device.id} className={`transition-all duration-300 hover:shadow-lg border-2 ${getStatusColor(realtimeData?.status || "offline")}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-lg ${visual?.bgColor || 'bg-gray-100'}`}>
                                    <IconComponent className={`h-4 w-4 ${visual?.color || 'text-gray-500'}`} />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{device.name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {device.rack?.name || 'Unknown Rack'}
                                    </p>
                                  </div>
                                </div>
                                {getStatusIcon(realtimeData?.status || "offline")}
                              </div>

                              <div className="space-y-2">
                                <div className="text-2xl font-bold">
                                  {numericValue ? formatValue(sensorType, numericValue) : "-- --"}
                                </div>
                                
                                {realtimeData?.timestamp && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {realtimeData.timestamp.toLocaleTimeString()}
                                  </div>
                                )}

                                {currentValue && typeof currentValue === 'object' && (
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    {Object.entries(currentValue).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                                        <br />
                                        <span className="font-medium">
                                          {typeof value === 'number' ? value.toFixed(1) : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredSensorGroups.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sensor Data Available</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No sensor devices found matching the current filters. Try adjusting your selection or ensure sensor devices are properly configured.
                  </p>
                </CardContent>
              </Card>
            )}
            </TabsContent>

            <TabsContent value="averages" className="space-y-6">
              {/* Key Averages Summary */}
              {filteredSensorGroups.map(([sensorType, group]) => {
                const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
                const IconComponent = visual?.icon || Activity;

                if (group.keyAverages.length === 0) return null;

                return (
                  <Card key={`${sensorType}-averages`} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${visual?.bgColor || 'bg-gray-100'} ${visual?.borderColor || 'border-gray-200'} border-2`}>
                          <IconComponent className={`h-6 w-6 ${visual?.color || 'text-gray-500'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {visual?.name || sensorType} - Key Averages
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Calculated from {group.devices.length} active sensor{group.devices.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.keyAverages.map(keyAvg => (
                          <Card key={keyAvg.key} className={`transition-all duration-300 hover:shadow-lg border-2 ${getStatusColor(keyAvg.status)}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm">{keyAvg.key}</h4>
                                {getStatusIcon(keyAvg.status)}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-2xl font-bold">
                                  {keyAvg.value.toFixed(2)} {keyAvg.unit}
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>From {keyAvg.count} sensor{keyAvg.count !== 1 ? 's' : ''}</span>
                                  <div className={`px-2 py-1 rounded-full border ${getStatusColor(keyAvg.status)}`}>
                                    <span className="font-medium capitalize">{keyAvg.status}</span>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  Average of {keyAvg.key.toLowerCase()} values across all {sensorType.toLowerCase()} sensors
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredSensorGroups.every(([, group]) => group.keyAverages.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Average Data Available</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      No key averages calculated yet. Ensure sensors are online and sending detailed data with multiple parameters.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* CCTV Dialog */}
        <Dialog open={cctvDialogOpen} onOpenChange={setCctvDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                CCTV Monitor - {selectedCameraForDialog?.name}
              </DialogTitle>
              <DialogDescription>
                Live video stream from camera {selectedCameraForDialog?.name || "Unknown"} 
                {selectedCameraForDialog && ` at ${selectedCameraForDialog.ipAddress}:${selectedCameraForDialog.port}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {selectedCameraForDialog ? (
                <iframe
                  src={`http://${selectedCameraForDialog.ipAddress}:${selectedCameraForDialog.port}/stream`}
                  className="w-full h-full"
                  title={`CCTV ${selectedCameraForDialog.name}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No camera selected</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}