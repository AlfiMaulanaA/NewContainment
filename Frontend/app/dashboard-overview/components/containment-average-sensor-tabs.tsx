"use client";

import {
  Droplet,
  Thermometer,
  Wind,
  Waves,
  Filter,
  Gauge,
  Activity,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { devicesApi, deviceSensorDataApi, Device } from "@/lib/api-service";
import { mqttClient } from "@/lib/mqtt";

// Data key mapping interface
interface DataKeyMapping {
  displayName: string;
  unit: string;
  icon: any;
  color: string;
  bgColor: string;
  thresholds: {
    warning?: number;
    critical?: number;
    lowWarning?: number;
    warningHigh?: number;
    warningLow?: number;
    reverse?: boolean;
  };
}

interface SensorDataMappings {
  [sensorType: string]: {
    [dataKey: string]: DataKeyMapping;
  };
}

// Data key mappings for each sensor type
const SENSOR_DATA_MAPPINGS: SensorDataMappings = {
  Temperature: {
    temp: {
      displayName: "Temperature",
      unit: "°C",
      icon: Thermometer,
      color: "text-rose-500",
      bgColor: "bg-rose-100 dark:bg-rose-900",
      thresholds: { warning: 30, critical: 35 },
    },
    hum: {
      displayName: "Humidity",
      unit: "%",
      icon: Droplet,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900",
      thresholds: { warning: 80, critical: 90, lowWarning: 20 },
    },
  },
  "Air Flow": {
    air_flow_lpm: {
      displayName: "Air Flow",
      unit: "L/min",
      icon: Wind,
      color: "text-sky-500",
      bgColor: "bg-sky-100 dark:bg-sky-900",
      thresholds: { warning: 10, critical: 5, reverse: true }, // lower is worse
    },
    air_pressure_hpa: {
      displayName: "Pressure",
      unit: "hPa",
      icon: Gauge,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900",
      thresholds: { warningHigh: 1020, warningLow: 980 },
    },
  },
  Dust: {
    dust_level_ug_m3: {
      displayName: "Dust Level",
      unit: "µg/m³",
      icon: Filter,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900",
      thresholds: { warning: 25, critical: 50 },
    },
  },
  "Dust Sensor": {
    dust_level_ug_m3: {
      displayName: "Dust Level",
      unit: "µg/m³",
      icon: Filter,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900",
      thresholds: { warning: 25, critical: 50 },
    },
  },
  Vibration: {
    vibration_magnitude: {
      displayName: "Vibration",
      unit: "m/s²",
      icon: Waves,
      color: "text-violet-500",
      bgColor: "bg-violet-100 dark:bg-violet-900",
      thresholds: { warning: 1.5, critical: 2.0 },
    },
  },
};

interface DeviceData {
  deviceId: number;
  deviceName: string;
  sensorType: string;
  topic: string;
  currentValue: any;
  timestamp: Date;
  status: "normal" | "warning" | "critical" | "offline";
}

interface ParsedSensorData {
  dataKey: string; // "temp", "hum", "air_flow_lpm", etc.
  displayName: string; // "Temperature", "Humidity", etc.
  unit: string;
  value: number;
  deviceId: number;
  timestamp: Date;
  status: "normal" | "warning" | "critical" | "offline";
}

interface SensorAverageData {
  dataKey: string;
  displayName: string;
  unit: string;
  averageValue: number;
  deviceCount: number;
  activeDeviceCount: number;
  status: "normal" | "warning" | "critical" | "offline";
  lastUpdated: Date;
  icon: any;
  color: string;
  bgColor: string;
}

export default function SensorAverageComponent() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceDataMap, setDeviceDataMap] = useState<Map<number, DeviceData>>(
    new Map()
  );
  const [parsedSensorDataList, setParsedSensorDataList] = useState<
    ParsedSensorData[]
  >([]);
  const [sensorAverages, setSensorAverages] = useState<
    Map<string, SensorAverageData>
  >(new Map());
  const [mqttConnected, setMqttConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup MQTT connection
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

  // Load devices data
  useEffect(() => {
    loadDevices();
  }, []);

  // Subscribe to MQTT topics when devices are loaded and MQTT is connected
  useEffect(() => {
    if (!mqttConnected || devices.length === 0) return;

    // Filter devices: Sensor or PDU
    const mqttDevices = devices.filter(
      (device) =>
        (device.type === "Sensor" || device.type === "PDU") && device.topic
    );

    const subscriptions = new Map<string, () => void>();

    mqttDevices.forEach((device) => {
      if (device.topic) {
        const callback = (topic: string, message: string) => {
          try {
            const parsedData = JSON.parse(message);
            updateDeviceData(device, parsedData);
          } catch (error) {
            console.error(
              `Failed to parse MQTT data for device ${device.id}:`,
              error
            );
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
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [mqttConnected, devices]);

  // Parse sensor data when device data changes
  useEffect(() => {
    parseSensorData();
  }, [deviceDataMap]);

  // Calculate averages when parsed data changes
  useEffect(() => {
    calculateSensorAverages();
  }, [parsedSensorDataList]);

  const loadDevices = async () => {
    setLoading(true);

    try {
      const result = await devicesApi.getDevices();

      if (result.success && result.data) {
        // Filter hanya Sensor dan PDU
        const filteredDevices = result.data.filter(
          (device) => device.type === "Sensor" || device.type === "PDU"
        );
        setDevices(filteredDevices);

        // Initialize device data map
        const initialDataMap = new Map<number, DeviceData>();
        filteredDevices.forEach((device) => {
          if (device.sensorType) {
            initialDataMap.set(device.id, {
              deviceId: device.id,
              deviceName: device.name,
              sensorType: device.sensorType,
              topic: device.topic || "",
              currentValue: null,
              timestamp: new Date(),
              status: "offline",
            });
          }
        });
        setDeviceDataMap(initialDataMap);
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeviceData = (device: Device, mqttData: any) => {
    setDeviceDataMap((prev) => {
      const updated = new Map(prev);
      const deviceData = updated.get(device.id);

      if (deviceData) {
        // Update device data
        deviceData.currentValue = mqttData;
        deviceData.timestamp = new Date();
        deviceData.status = "normal"; // Will be calculated in parsing

        updated.set(device.id, deviceData);
      }

      return updated;
    });
  };

  const parseSensorData = () => {
    const parsedData: ParsedSensorData[] = [];

    deviceDataMap.forEach((deviceData) => {
      if (!deviceData.currentValue || !deviceData.sensorType) return;

      const sensorMapping = SENSOR_DATA_MAPPINGS[deviceData.sensorType];
      if (!sensorMapping) {
        return;
      }

      const mqttData = deviceData.currentValue;

      // Parse each data key for this sensor type
      Object.keys(sensorMapping).forEach((dataKey) => {
        const mapping: DataKeyMapping = sensorMapping[dataKey];
        if (!mapping) return;

        let value = 0;

        // Extract value based on data key
        if (dataKey === "vibration_magnitude") {
          // Special case: calculate magnitude from x,y,z components
          if (
            mqttData.vibration_x !== undefined &&
            mqttData.vibration_y !== undefined &&
            mqttData.vibration_z !== undefined
          ) {
            value = Math.sqrt(
              Math.pow(mqttData.vibration_x, 2) +
                Math.pow(mqttData.vibration_y, 2) +
                Math.pow(mqttData.vibration_z, 2)
            );
          }
        } else {
          // Regular data extraction
          value = mqttData[dataKey] || 0;
        }

        // Allow 0 values for dust sensors, but filter negative values and NaN
        if (value >= 0 && !isNaN(value)) {
          // Calculate status based on thresholds
          const status = calculateDataKeyStatus(
            dataKey,
            value,
            mapping.thresholds
          );

          parsedData.push({
            dataKey: `${deviceData.sensorType}-${dataKey}`,
            displayName: mapping.displayName,
            unit: mapping.unit,
            value,
            deviceId: deviceData.deviceId,
            timestamp: deviceData.timestamp,
            status,
          });
        } else if (value < 0 || isNaN(value)) {
          console.log(`❌ Value is negative or invalid for ${dataKey}:`, value);
        }
      });
    });

    setParsedSensorDataList(parsedData);
  };

  const calculateDataKeyStatus = (
    dataKey: string,
    value: number,
    thresholds: DataKeyMapping["thresholds"]
  ): "normal" | "warning" | "critical" | "offline" => {
    if (value === 0) return "offline";

    // Handle different threshold types
    if (thresholds.reverse) {
      // Lower values are worse (e.g., air flow)
      return value <= (thresholds.critical || 0)
        ? "critical"
        : value <= (thresholds.warning || 0)
        ? "warning"
        : "normal";
    } else if (thresholds.warningHigh && thresholds.warningLow) {
      // Range-based (e.g., pressure)
      return value > thresholds.warningHigh || value < thresholds.warningLow
        ? "warning"
        : "normal";
    } else if (thresholds.lowWarning) {
      // Two-way threshold (e.g., humidity)
      return value > (thresholds.critical || 999)
        ? "critical"
        : value > (thresholds.warning || 999) || value < thresholds.lowWarning
        ? "warning"
        : "normal";
    } else {
      // Standard higher-is-worse (e.g., temperature, dust)
      return value > (thresholds.critical || 999)
        ? "critical"
        : value > (thresholds.warning || 999)
        ? "warning"
        : "normal";
    }
  };

  const calculateSensorAverages = () => {
    const averagesMap = new Map<string, SensorAverageData>();

    // Group parsed data by data key (e.g., "Temperature-temp", "Temperature-hum")
    const dataByKey = new Map<string, ParsedSensorData[]>();

    parsedSensorDataList.forEach((parsedData) => {
      if (!dataByKey.has(parsedData.dataKey)) {
        dataByKey.set(parsedData.dataKey, []);
      }
      dataByKey.get(parsedData.dataKey)!.push(parsedData);
    });

    // Calculate average for each unique data key
    dataByKey.forEach((dataList, dataKey) => {
      const activeData = dataList.filter(
        (d) => d.status !== "offline" && d.value > 0
      );

      if (activeData.length > 0) {
        let totalValue = 0;
        let criticalCount = 0;
        let warningCount = 0;

        activeData.forEach((data) => {
          totalValue += data.value;

          if (data.status === "critical") criticalCount++;
          else if (data.status === "warning") warningCount++;
        });

        const averageValue = totalValue / activeData.length;
        const status: "normal" | "warning" | "critical" | "offline" =
          criticalCount > 0
            ? "critical"
            : warningCount > 0
            ? "warning"
            : "normal";

        // Get visual info from first data item
        const firstData = dataList[0];
        const [sensorType, rawDataKey] = dataKey.split("-");
        const sensorMapping = SENSOR_DATA_MAPPINGS[sensorType];
        const dataMapping: DataKeyMapping | undefined =
          sensorMapping?.[rawDataKey];

        if (dataMapping) {
          averagesMap.set(dataKey, {
            dataKey,
            displayName: firstData.displayName,
            unit: firstData.unit,
            averageValue,
            deviceCount: dataList.length,
            activeDeviceCount: activeData.length,
            status,
            lastUpdated: new Date(),
            icon: dataMapping.icon,
            color: dataMapping.color,
            bgColor: dataMapping.bgColor,
          });
        }
      } else {
        // No active data
        const firstData = dataList[0];
        const [sensorType, rawDataKey] = dataKey.split("-");
        const sensorMapping = SENSOR_DATA_MAPPINGS[sensorType];
        const dataMapping: DataKeyMapping | undefined =
          sensorMapping?.[rawDataKey];

        if (dataMapping) {
          averagesMap.set(dataKey, {
            dataKey,
            displayName: firstData.displayName,
            unit: firstData.unit,
            averageValue: 0,
            deviceCount: dataList.length,
            activeDeviceCount: 0,
            status: "offline",
            lastUpdated: new Date(),
            icon: dataMapping.icon,
            color: dataMapping.color,
            bgColor: dataMapping.bgColor,
          });
        }
      }
    });

    setSensorAverages(averagesMap);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "normal":
        return {
          border: "border-emerald-500/30",
          topBorder: "border-t-emerald-500",
          bg: "bg-emerald-500/5",
          text: "text-emerald-600 dark:text-emerald-400",
        };
      case "warning":
        return {
          border: "border-amber-500/30",
          topBorder: "border-t-amber-500",
          bg: "bg-amber-500/5",
          text: "text-amber-600 dark:text-amber-400",
        };
      case "critical":
        return {
          border: "border-red-500/30",
          topBorder: "border-t-red-500",
          bg: "bg-red-500/5",
          text: "text-red-600 dark:text-red-400",
        };
      case "offline":
        return {
          border: "border-gray-500/30",
          topBorder: "border-t-gray-500",
          bg: "bg-gray-500/5",
          text: "text-gray-600 dark:text-gray-400",
        };
      default:
        return {
          border: "border-blue-500/30",
          topBorder: "border-t-blue-500",
          bg: "bg-blue-500/5",
          text: "text-blue-600 dark:text-blue-400",
        };
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <Card className="rounded-lg mx-auto">
          <CardHeader className="mb-2">
            <CardTitle className="flex items-center gap-1 md:gap-2 text-xl md:text-2xl font-bold text-foreground">
              <Activity className="h-4 w-5 md:h-8 md:w-6 text-green-500 dark:text-green-400" />
              Sensor Average Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading devices...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageCards = Array.from(sensorAverages.values()).map((average) => {
    return {
      title: average.displayName,
      averageValue: average.averageValue,
      unit: average.unit,
      value:
        average.averageValue > 0
          ? `${average.averageValue.toFixed(1)}${average.unit}`
          : "-- --",
      icon: <average.icon className={`h-8 w-8 ${average.color}`} />,
      color: average.bgColor,
      status: average.status,
      deviceCount: average.deviceCount,
      activeDeviceCount: average.activeDeviceCount,
    };
  });

  return (
    <div className="w-full">
      <Card className="rounded-lg">
        <CardHeader className="mb-1 sm:mb-2 pb-3 sm:pb-4">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-4">
            <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-xl lg:text-2xl font-bold text-foreground">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-500 dark:text-green-400 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Sensor Average Data</span>
                <span className="sm:hidden">Sensors</span>
              </span>
            </CardTitle>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge
                variant={mqttConnected ? "default" : "destructive"}
                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1"
              >
                {mqttConnected ? (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden xs:inline">Live</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden xs:inline">Offline</span>
                  </span>
                )}
              </Badge>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden md:block">
                <span className="hidden lg:inline">
                  Devices: {devices.length} | Active:{" "}
                  {
                    Array.from(deviceDataMap.values()).filter(
                      (d) => d.status !== "offline"
                    ).length
                  }
                </span>
                <span className="lg:hidden">
                  {devices.length}/{
                    Array.from(deviceDataMap.values()).filter(
                      (d) => d.status !== "offline"
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {averageCards.length > 0 ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {averageCards.map((card, index) => {
                const statusStyles = getStatusStyles(card.status);

                return (
                  <Card
                    key={`${card.title}-${index}`}
                    className={`min-w-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-2 ${statusStyles.border} hover:bg-accent/30 border-t-4 ${statusStyles.topBorder} ${statusStyles.bg}`}
                  >
                    <CardContent className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 relative min-h-[100px] sm:min-h-[120px] lg:min-h-[140px]">
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                        <div
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            card.status === "normal"
                              ? "bg-emerald-500"
                              : card.status === "warning"
                              ? "bg-amber-500"
                              : card.status === "critical"
                              ? "bg-red-500"
                              : "bg-gray-400"
                          }`}
                        />
                      </div>

                      <div
                        className={`p-1.5 sm:p-2 lg:p-3 rounded-full ${card.color} flex-shrink-0`}
                      >
                        <div className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8">
                          {card.icon}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <div className="text-xs sm:text-sm lg:text-base font-medium text-muted-foreground truncate">
                            {card.title}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 mb-0.5 sm:mb-1">
                          {card.averageValue > 0 ? (
                            <>
                              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-foreground">
                                {card.averageValue.toFixed(1)}
                              </div>
                              <div className="text-xs sm:text-sm lg:text-lg text-muted-foreground font-medium">
                                {card.unit}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm sm:text-xl lg:text-2xl font-bold text-muted-foreground">
                              -- --
                            </div>
                          )}
                        </div>
                        <div
                          className={`text-[10px] sm:text-xs font-medium capitalize ${statusStyles.text}`}
                        >
                          <span className="hidden sm:inline">
                            {card.status} • {card.activeDeviceCount}/{card.deviceCount} devices
                          </span>
                          <span className="sm:hidden">
                            {card.status} • {card.activeDeviceCount}/{card.deviceCount}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <div className="text-muted-foreground">
                No sensor data available
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            Real-time data from {devices.length} devices (Sensor & PDU)
            {mqttConnected && " • Live MQTT connection active"}
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-[10px] px-2 py-0.5 ${
                  process.env.NODE_ENV === 'development' 
                    ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300"
                }`}
              >
                {process.env.NODE_ENV === 'development' ? "DEV Mode (1min)" : "PROD Mode (1hr)"}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">
                Data saved at exact {process.env.NODE_ENV === 'development' ? 'minute' : 'hour'} intervals
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
