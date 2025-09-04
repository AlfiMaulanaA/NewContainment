"use client";

import { Droplet, Thermometer, Bolt, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  devicesApi,
  deviceSensorDataApi,
  Device,
} from "@/lib/api-service";
import { mqttClient } from "@/lib/mqtt";

interface SensorRealtimeData {
  deviceId: number;
  currentValue: any;
  timestamp: Date;
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
}

interface AverageData {
  humidity: number;
  temperature: number;
  power: number;
  humidityStatus: "normal" | "warning" | "critical" | "offline";
  temperatureStatus: "normal" | "warning" | "critical" | "offline";
  lastUpdated: Date;
}

export default function SensorDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorGroups, setSensorGroups] = useState<Record<string, SensorGroup>>({});
  const [averageData, setAverageData] = useState<AverageData>({
    humidity: 0,
    temperature: 0,
    power: (Math.random() * (150 - 100) + 100), // Keep power as dummy
    humidityStatus: "offline",
    temperatureStatus: "offline",
    lastUpdated: new Date()
  });
  const [mqttConnected, setMqttConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup MQTT connection monitoring
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

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Subscribe to MQTT topics for sensor devices
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

  // Update power dummy data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAverageData(prev => ({
        ...prev,
        power: (Math.random() * (150 - 100) + 100)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const devicesResult = await devicesApi.getDevices();
      
      if (devicesResult.success && devicesResult.data) {
        const sensorDevices = devicesResult.data.filter(device => device.type === "Sensor");
        setDevices(sensorDevices);
        initializeSensorGroups(sensorDevices);

        // Load historical data for initial averages
        loadHistoricalData().catch(error => {
          console.warn("Historical data loading failed:", error);
        });
      }
    } catch (error: any) {
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
              status: "offline",
              lastUpdated: new Date()
            }
          };
        }
        groups[device.sensorType].devices.push(device);
        
        // Initialize realtime data
        groups[device.sensorType].realtimeData[device.id] = {
          deviceId: device.id,
          currentValue: null,
          timestamp: new Date(),
          status: "offline"
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
        
        // Update current value
        realtimeData.currentValue = data;
        realtimeData.timestamp = timestamp;
        realtimeData.status = calculateStatus(sensorType, data);
        
        // Recalculate group average
        updatedGroups[sensorType].average = calculateGroupAverage(updatedGroups[sensorType]);
        
        // Update the main average data
        updateMainAverages(updatedGroups);
      }
      
      return updatedGroups;
    });
  };

  const updateMainAverages = (groups: Record<string, SensorGroup>) => {
    let humidity = 0;
    let temperature = 0;
    let humidityStatus: "normal" | "warning" | "critical" | "offline" = "offline";
    let temperatureStatus: "normal" | "warning" | "critical" | "offline" = "offline";

    // Calculate both temperature and humidity from Temperature sensors
    // Since Temperature sensors contain both temp and hum data
    if (groups["Temperature"]) {
      const tempGroup = groups["Temperature"];
      const activeData = Object.values(tempGroup.realtimeData).filter(
        data => data.status !== "offline" && data.currentValue
      );

      if (activeData.length > 0) {
        let totalTemp = 0;
        let totalHum = 0;
        let tempCriticalCount = 0;
        let tempWarningCount = 0;
        let humCriticalCount = 0;
        let humWarningCount = 0;

        activeData.forEach(data => {
          const tempValue = extractNumericValue("Temperature", data.currentValue);
          const humValue = extractNumericValue("Humidity", data.currentValue);
          
          totalTemp += tempValue;
          totalHum += humValue;
          
          // Calculate status for temperature
          const tempStatus = calculateStatus("Temperature", data.currentValue);
          if (tempStatus === "critical") tempCriticalCount++;
          else if (tempStatus === "warning") tempWarningCount++;
          
          // Calculate status for humidity
          const humStatus = calculateStatus("Humidity", data.currentValue);
          if (humStatus === "critical") humCriticalCount++;
          else if (humStatus === "warning") humWarningCount++;
        });

        temperature = totalTemp / activeData.length;
        humidity = totalHum / activeData.length;
        
        temperatureStatus = tempCriticalCount > 0 ? "critical" : tempWarningCount > 0 ? "warning" : "normal";
        humidityStatus = humCriticalCount > 0 ? "critical" : humWarningCount > 0 ? "warning" : "normal";
      }
    }

    setAverageData(prev => ({
      ...prev,
      humidity,
      temperature,
      humidityStatus,
      temperatureStatus,
      lastUpdated: new Date()
    }));
  };

  const calculateStatus = (sensorType: string, data: any): "normal" | "warning" | "critical" | "offline" => {
    if (!data || typeof data !== "object") return "offline";

    switch (sensorType) {
      case "Temperature":
        const temp = data.temp || data.temperature;
        return temp > 35 ? "critical" : temp > 30 ? "warning" : "normal";
      
      case "Humidity":
        const hum = data.hum || data.humidity;
        return hum > 80 ? "warning" : hum < 20 ? "warning" : "normal";
      
      default:
        return "normal";
    }
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
      case "Humidity":
        return data.hum || data.humidity || 0;
      default:
        return 0;
    }
  };

  const loadHistoricalData = async () => {
    try {
      const result = await deviceSensorDataApi.getLatestSensorData(50);
      
      if (result.success && result.data && Array.isArray(result.data)) {
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
              // Skip invalid payloads
            }
          }
        });
      }
    } catch (error) {
      console.error("Error loading historical data:", error);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "normal":
        return {
          border: "border-emerald-500/30",
          topBorder: "border-t-emerald-500",
          bg: "bg-emerald-500/5",
          text: "text-emerald-600 dark:text-emerald-400"
        };
      case "warning":
        return {
          border: "border-amber-500/30",
          topBorder: "border-t-amber-500",
          bg: "bg-amber-500/5",
          text: "text-amber-600 dark:text-amber-400"
        };
      case "critical":
        return {
          border: "border-red-500/30",
          topBorder: "border-t-red-500",
          bg: "bg-red-500/5",
          text: "text-red-600 dark:text-red-400"
        };
      case "offline":
        return {
          border: "border-gray-500/30",
          topBorder: "border-t-gray-500",
          bg: "bg-gray-500/5",
          text: "text-gray-600 dark:text-gray-400"
        };
      default:
        return {
          border: "border-blue-500/30",
          topBorder: "border-t-blue-500",
          bg: "bg-blue-500/5",
          text: "text-blue-600 dark:text-blue-400"
        };
    }
  };

  const cardData = [
    {
      title: "Humidity",
      value: averageData.humidity > 0 ? `${averageData.humidity.toFixed(1)}%` : "-- --",
      icon: <Droplet className="h-8 w-8 text-blue-500 dark:text-blue-400" />,
      color: "bg-blue-500/10 dark:bg-blue-400/10",
      status: averageData.humidityStatus,
      isReal: true
    },
    {
      title: "Temperature",
      value: averageData.temperature > 0 ? `${averageData.temperature.toFixed(1)}°C` : "-- --",
      icon: <Thermometer className="h-8 w-8 text-red-500 dark:text-red-400" />,
      color: "bg-red-500/10 dark:bg-red-400/10", 
      status: averageData.temperatureStatus,
      isReal: true
    },
    {
      title: "Power",
      value: `${averageData.power.toFixed(1)} W`,
      icon: <Bolt className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />,
      color: "bg-yellow-500/10 dark:bg-yellow-400/10",
      status: "normal" as const,
      isReal: false
    },
  ];

  if (loading) {
    return (
      <div className="">
        <Card className="w-full rounded-lg mx-auto">
          <CardHeader className="mb-2">
            <CardTitle className="flex items-center gap-1 md:gap-2 text-xl md:text-2xl font-bold text-foreground">
              <Activity className="h-4 w-5 md:h-8 md:w-6 text-green-500 dark:text-green-400" />
              Average Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="">
      <Card className="w-full rounded-lg">
        <CardHeader className="mb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1 md:gap-2 text-xl md:text-2xl font-bold text-foreground">
              <Activity className="h-4 w-5 md:h-8 md:w-6 text-green-500 dark:text-green-400" />
              Average Data
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={mqttConnected ? "default" : "destructive"}
                className="text-xs"
              >
                {mqttConnected ? "🟢 Live" : "🔴 Offline"}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {averageData.lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2">
            {cardData.map((card, index) => {
              const statusStyles = getStatusStyles(card.status);
              
              return (
                <Card
                  key={index}
                  className={`flex-1 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-2 ${statusStyles.border} hover:bg-accent/30 border-t-4 ${statusStyles.topBorder} ${statusStyles.bg}`}
                >
                  <CardContent className="flex items-center gap-4 p-4 relative">
                    {/* Status indicator */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-2 h-2 rounded-full ${
                        card.status === "normal" ? "bg-emerald-500" :
                        card.status === "warning" ? "bg-amber-500" :
                        card.status === "critical" ? "bg-red-500" :
                        "bg-gray-400"
                      }`} />
                    </div>
                    
                    <div className={`p-3 rounded-full ${card.color} flex-shrink-0`}>
                      {card.icon}
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-base font-medium text-muted-foreground">
                          {card.title}
                        </div>
                        {!card.isReal && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Demo
                          </Badge>
                        )}
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1">
                        {card.value}
                      </div>
                      <div className={`text-xs font-medium capitalize ${statusStyles.text}`}>
                        {card.status}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Footer info */}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Real-time data from {devices.filter(d => d.type === "Sensor").length} sensor devices
            {mqttConnected && " • Live MQTT connection active"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}