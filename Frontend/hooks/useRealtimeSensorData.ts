import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { deviceSensorDataApi, DeviceSensorData } from "@/lib/api-service";

interface SensorDataMap {
  [deviceId: number]: {
    data: DeviceSensorData;
    parsedData?: any;
  };
}

interface UseRealtimeSensorDataOptions {
  rackIds?: number[];
  deviceIds?: number[];
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseRealtimeSensorDataReturn {
  sensorData: SensorDataMap;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useRealtimeSensorData({
  rackIds = [],
  deviceIds = [],
  refreshInterval = 30000, // 30 seconds default
  enabled = true,
}: UseRealtimeSensorDataOptions = {}): UseRealtimeSensorDataReturn {
  const [sensorData, setSensorData] = useState<SensorDataMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchSensorDataRef = useRef<(() => Promise<void>) | null>(null);
  const mountedRef = useRef(true);

  // Stable references for array dependencies
  const stableRackIds = useMemo(() => rackIds, [JSON.stringify(rackIds)]);
  const stableDeviceIds = useMemo(() => deviceIds, [JSON.stringify(deviceIds)]);

  const parseRawPayload = useCallback((rawPayload: string) => {
    try {
      return JSON.parse(rawPayload);
    } catch {
      return null;
    }
  }, []);

  const fetchSensorData = useCallback(async () => {
    if (!enabled || (!stableRackIds.length && !stableDeviceIds.length)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const promises: Promise<any>[] = [];

      // Fetch data by racks
      if (stableRackIds.length > 0) {
        const rackPromises = stableRackIds.map(rackId =>
          deviceSensorDataApi.getSensorDataByRack(rackId, 50)
        );
        promises.push(...rackPromises);
      }

      // Fetch data by specific devices
      if (stableDeviceIds.length > 0) {
        const devicePromises = stableDeviceIds.map(deviceId =>
          deviceSensorDataApi.getLatestSensorDataByDevice(deviceId)
        );
        promises.push(...devicePromises);
      }

      const results = await Promise.all(promises);
      
      if (!mountedRef.current) return;

      const newSensorData: SensorDataMap = {};

      // Process rack-based results
      if (stableRackIds.length > 0) {
        results.slice(0, stableRackIds.length).forEach((result, index) => {
          if (result.success && result.data) {
            // Ensure result.data is an array
            const dataArray = Array.isArray(result.data) ? result.data : [result.data];
            
            // Get latest data per device
            const deviceLatestData: Record<number, DeviceSensorData> = {};
            
            dataArray.forEach((item: DeviceSensorData) => {
              if (item && typeof item === 'object' && item.deviceId) {
                if (!deviceLatestData[item.deviceId] || 
                    new Date(item.receivedAt) > new Date(deviceLatestData[item.deviceId].receivedAt)) {
                  deviceLatestData[item.deviceId] = item;
                }
              }
            });

            // Add to sensor data map
            Object.values(deviceLatestData).forEach((data) => {
              newSensorData[data.deviceId] = {
                data,
                parsedData: data.rawPayload ? parseRawPayload(data.rawPayload) : null,
              };
            });
          }
        });
      }

      // Process device-specific results
      if (stableDeviceIds.length > 0) {
        results.slice(stableRackIds.length).forEach((result, index) => {
          if (result.success && result.data) {
            const deviceId = stableDeviceIds[index];
            
            // Ensure we have a valid device data object
            if (result.data && typeof result.data === 'object' && result.data.deviceId) {
              newSensorData[deviceId] = {
                data: result.data,
                parsedData: result.data.rawPayload ? parseRawPayload(result.data.rawPayload) : null,
              };
            }
          }
        });
      }

      setSensorData(newSensorData);
      setLastUpdate(new Date());
    } catch (err: any) {
      if (mountedRef.current) {
        console.error("Error fetching sensor data:", err);
        setError(err.message || "Failed to fetch sensor data");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [stableRackIds, stableDeviceIds, enabled, parseRawPayload]);

  // Update ref when fetchSensorData changes
  useEffect(() => {
    fetchSensorDataRef.current = fetchSensorData;
  }, [fetchSensorData]);

  const refresh = useCallback(async () => {
    if (fetchSensorDataRef.current) {
      await fetchSensorDataRef.current();
    }
  }, []);

  // Initial fetch when dependencies change
  useEffect(() => {
    if (!enabled || (!stableRackIds.length && !stableDeviceIds.length)) return;
    fetchSensorData();
  }, [stableRackIds, stableDeviceIds, enabled, fetchSensorData]);

  // Setup interval separately
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      if (fetchSensorDataRef.current && enabled && (stableRackIds.length > 0 || stableDeviceIds.length > 0)) {
        fetchSensorDataRef.current();
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    sensorData,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}

// Helper function to get latest sensor reading for a specific device
export function getLatestSensorReading(
  sensorData: SensorDataMap,
  deviceId: number
): { temperature?: number; humidity?: number; timestamp?: string; parsedData?: any } | null {
  const deviceData = sensorData[deviceId];
  if (!deviceData) return null;

  const { data, parsedData } = deviceData;
  
  return {
    temperature: parsedData?.temp || parsedData?.temperature || data.temperature,
    humidity: parsedData?.hum || parsedData?.humidity || data.humidity,
    timestamp: data.timestamp,
    parsedData,
  };
}

// Helper function to format sensor values
export function formatSensorValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return "N/A";
  return `${value.toFixed(1)}${unit}`;
}

// Helper function to get sensor status color based on thresholds
export function getSensorStatusColor(temperature?: number, humidity?: number): string {
  if (temperature !== undefined) {
    if (temperature > 35) return "text-red-600"; // Hot
    if (temperature < 18) return "text-blue-600"; // Cold
  }
  
  if (humidity !== undefined) {
    if (humidity > 80) return "text-orange-600"; // High humidity
    if (humidity < 30) return "text-yellow-600"; // Low humidity
  }
  
  return "text-green-600"; // Normal
}