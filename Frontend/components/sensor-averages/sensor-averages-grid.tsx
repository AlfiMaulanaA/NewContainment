"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SensorAverageCard } from "./sensor-average-card";
import { 
  Activity, 
  Thermometer, 
  Wind, 
  Droplets, 
  Gauge, 
  Filter, 
  Waves,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { devicesApi, deviceSensorDataApi } from "@/lib/api-service";
import { mqttClient } from "@/lib/mqtt";
import { cn } from "@/lib/utils";

// Sensor type configurations
const SENSOR_TYPE_CONFIG = {
  Temperature: {
    icon: Thermometer,
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    unit: "°C"
  },
  "Air Flow": {
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    unit: "L/min"
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    unit: "%"
  },
  Pressure: {
    icon: Gauge,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    unit: "hPa"
  },
  "Dust Sensor": {
    icon: Filter,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    unit: "µg/m³"
  },
  Vibration: {
    icon: Waves,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    unit: "m/s²"
  }
};

interface KeyAverage {
  key: string;
  value: number;
  unit: string;
  count: number;
  status: "normal" | "warning" | "critical" | "offline";
  sensorType: string;
}

interface SensorAveragesGridProps {
  title?: string;
  variant?: "default" | "compact" | "detailed";
  maxItems?: number;
  showConnectionStatus?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  selectedContainmentId?: number;
}

export function SensorAveragesGrid({
  title = "Sensor Averages",
  variant = "default",
  maxItems = 12,
  showConnectionStatus = true,
  autoRefresh = true,
  refreshInterval = 5000,
  className,
  selectedContainmentId
}: SensorAveragesGridProps) {
  const [keyAverages, setKeyAverages] = useState<KeyAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [devices, setDevices] = useState<any[]>([]);

  // MQTT connection monitoring
  useEffect(() => {
    const connectionListener = (connected: boolean) => {
      setMqttConnected(connected);
    };

    mqttClient.addConnectionListener(connectionListener);
    
    return () => {
      mqttClient.removeConnectionListener(connectionListener);
    };
  }, []);

  // Load and calculate averages
  const loadSensorAverages = async () => {
    try {
      setLoading(true);

      // Load devices
      const devicesResult = await devicesApi.getDevices();
      if (!devicesResult.success) {
        throw new Error("Failed to load devices");
      }

      let sensorDevices = devicesResult.data?.filter(device => device.type === "Sensor") || [];
      
      // Filter by containment if specified
      if (selectedContainmentId && selectedContainmentId > 0) {
        sensorDevices = sensorDevices.filter(device => 
          device.rack?.containmentId === selectedContainmentId
        );
      }

      setDevices(sensorDevices);

      // Load recent sensor data
      const sensorDataResult = await deviceSensorDataApi.getLatestSensorData(100);
      if (!sensorDataResult.success || !Array.isArray(sensorDataResult.data)) {
        console.warn("No sensor data available");
        setKeyAverages([]);
        return;
      }

      // Process and calculate key averages
      const calculatedAverages = calculateKeyAveragesFromData(
        sensorDevices,
        sensorDataResult.data
      );

      setKeyAverages(calculatedAverages.slice(0, maxItems));
      setLastUpdated(new Date());

    } catch (error) {
      console.error("Error loading sensor averages:", error);
      setKeyAverages([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate key averages from sensor data
  const calculateKeyAveragesFromData = (devices: any[], sensorData: any[]): KeyAverage[] => {
    const keyGroups = new Map<string, {
      sensorType: string;
      values: number[];
      statuses: string[];
    }>();

    // Group data by sensor type and key
    sensorData.forEach(data => {
      const device = devices.find(d => d.id === data.deviceId);
      if (!device || !device.sensorType) return;

      try {
        const payload = typeof data.rawPayload === 'string' 
          ? JSON.parse(data.rawPayload) 
          : data.rawPayload;

        if (typeof payload === 'object' && payload) {
          Object.entries(payload).forEach(([key, value]) => {
            if (typeof value === 'number') {
              const groupKey = `${device.sensorType}-${key}`;
              
              if (!keyGroups.has(groupKey)) {
                keyGroups.set(groupKey, {
                  sensorType: device.sensorType,
                  values: [],
                  statuses: []
                });
              }

              const group = keyGroups.get(groupKey)!;
              group.values.push(value);
              group.statuses.push(calculateKeyStatus(device.sensorType, key, value));
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to parse payload for device ${data.deviceId}:`, error);
      }
    });

    // Calculate averages
    const averages: KeyAverage[] = [];
    keyGroups.forEach((group, groupKey) => {
      const [sensorType, key] = groupKey.split('-');
      const average = group.values.reduce((sum, val) => sum + val, 0) / group.values.length;
      
      // Determine overall status
      const criticalCount = group.statuses.filter(s => s === 'critical').length;
      const warningCount = group.statuses.filter(s => s === 'warning').length;
      const status = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'normal';

      averages.push({
        key: formatKeyName(key),
        value: average,
        unit: getUnitForKey(sensorType, key),
        count: group.values.length,
        status: status as "normal" | "warning" | "critical" | "offline",
        sensorType
      });
    });

    return averages.sort((a, b) => b.count - a.count); // Sort by count descending
  };

  // Helper functions
  const calculateKeyStatus = (sensorType: string, key: string, value: number): string => {
    const keyLower = key.toLowerCase();
    
    switch (sensorType) {
      case "Temperature":
        if (keyLower.includes('temp')) {
          return value > 35 ? "critical" : value > 30 ? "warning" : "normal";
        } else if (keyLower.includes('hum')) {
          return value > 80 ? "warning" : value < 20 ? "warning" : "normal";
        }
        break;
      case "Air Flow":
        if (keyLower.includes('flow') || keyLower.includes('lpm')) {
          return value < 10 ? "critical" : value < 20 ? "warning" : "normal";
        }
        break;
      case "Dust Sensor":
        if (keyLower.includes('dust') || keyLower.includes('pm')) {
          return value > 100 ? "critical" : value > 50 ? "warning" : "normal";
        }
        break;
      case "Vibration":
        return Math.abs(value) > 3 ? "critical" : Math.abs(value) > 1.5 ? "warning" : "normal";
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
    
    if (keyLower.includes('temp')) return '°C';
    if (keyLower.includes('hum')) return '%';
    if (keyLower.includes('pressure') || keyLower.includes('hpa')) return ' hPa';
    if (keyLower.includes('flow') || keyLower.includes('lpm')) return ' L/min';
    if (keyLower.includes('dust') || keyLower.includes('pm') || keyLower.includes('ug')) return ' µg/m³';
    if (keyLower.includes('vibration') || ['x', 'y', 'z'].includes(keyLower)) return ' m/s²';
    if (keyLower.includes('voltage')) return ' V';
    if (keyLower.includes('current')) return ' A';
    if (keyLower.includes('power')) return ' W';
    
    const config = SENSOR_TYPE_CONFIG[sensorType as keyof typeof SENSOR_TYPE_CONFIG];
    return config ? ` ${config.unit}` : '';
  };

  const getIconForSensorType = (sensorType: string) => {
    const config = SENSOR_TYPE_CONFIG[sensorType as keyof typeof SENSOR_TYPE_CONFIG];
    return config?.icon || Activity;
  };

  // Auto refresh
  useEffect(() => {
    loadSensorAverages();

    if (autoRefresh) {
      const interval = setInterval(loadSensorAverages, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [selectedContainmentId, autoRefresh, refreshInterval]);

  const isCompact = variant === "compact";
  const isDetailed = variant === "detailed";

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={cn("pb-3", isCompact && "pb-2")}>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("pb-3", isCompact && "pb-2")}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showConnectionStatus && (
              <Badge variant={mqttConnected ? "default" : "destructive"}>
                {mqttConnected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            )}
            
            <div className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        {!isCompact && (
          <p className="text-sm text-muted-foreground">
            Real-time sensor averages from {devices.length} active device{devices.length !== 1 ? 's' : ''}
            {keyAverages.length > 0 && ` across ${keyAverages.length} parameter${keyAverages.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {keyAverages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
            <p className="text-muted-foreground text-center">
              No sensor data found. Ensure sensors are online and sending data.
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-3",
            isCompact && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            variant === "default" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            isDetailed && "grid-cols-1 lg:grid-cols-2"
          )}>
            {keyAverages.map((avg, index) => (
              <SensorAverageCard
                key={`${avg.sensorType}-${avg.key}-${index}`}
                title={avg.key}
                value={avg.value}
                unit={avg.unit}
                icon={getIconForSensorType(avg.sensorType)}
                status={avg.status}
                count={avg.count}
                description={`Average ${avg.key.toLowerCase()} from ${avg.sensorType.toLowerCase()} sensors`}
                variant={variant}
                animate={mqttConnected}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}