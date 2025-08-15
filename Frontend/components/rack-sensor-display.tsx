"use client";

import { Thermometer, Droplets, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useRealtimeSensorData,
  getLatestSensorReading,
  formatSensorValue,
  getSensorStatusColor,
} from "@/hooks/useRealtimeSensorData";
import { Device } from "@/lib/api-service";

interface RackSensorDisplayProps {
  rackId: number;
  devices?: Device[];
  refreshInterval?: number;
}

export function RackSensorDisplay({
  rackId,
  devices = [],
  refreshInterval = 30000,
}: RackSensorDisplayProps) {
  // Filter only sensor devices
  const sensorDevices = devices.filter(
    (device) =>
      device.type?.toLowerCase() === "sensor" &&
      device.sensorType === "Temperature"
  );

  const sensorDeviceIds = sensorDevices.map((device) => device.id);

  const { sensorData, loading, error, lastUpdate } = useRealtimeSensorData({
    rackIds: [rackId],
    refreshInterval,
    enabled: sensorDeviceIds.length > 0,
  });

  if (sensorDeviceIds.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        No sensor devices
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Sensor error
      </div>
    );
  }

  // Get latest readings from all sensor devices in this rack
  const sensorReadings = sensorDeviceIds
    .map((deviceId) => {
      const device = sensorDevices.find((d) => d.id === deviceId);
      const reading = getLatestSensorReading(sensorData, deviceId);
      return { device, reading };
    })
    .filter((item) => item.reading);

  if (sensorReadings.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent"></div>
            Loading...
          </>
        ) : (
          <>
            <AlertTriangle className="h-3 w-3" />
            No sensor data
          </>
        )}
      </div>
    );
  }

  // Calculate average values if multiple sensors
  const avgTemperature =
    sensorReadings.reduce((sum, item) => {
      const temp = item.reading?.temperature;
      return temp !== undefined ? sum + temp : sum;
    }, 0) /
    sensorReadings.filter((item) => item.reading?.temperature !== undefined)
      .length;

  const avgHumidity =
    sensorReadings.reduce((sum, item) => {
      const hum = item.reading?.humidity;
      return hum !== undefined ? sum + hum : sum;
    }, 0) /
    sensorReadings.filter((item) => item.reading?.humidity !== undefined)
      .length;

  const statusColor = getSensorStatusColor(avgTemperature, avgHumidity);
  const latestTimestamp = sensorReadings.reduce((latest, item) => {
    const timestamp = item.reading?.timestamp;
    if (!timestamp) return latest;
    if (!latest) return timestamp;
    return new Date(timestamp) > new Date(latest) ? timestamp : latest;
  }, null as string | null);

  const timeAgo = latestTimestamp ? getTimeAgo(latestTimestamp) : null;

  return (
    <div className="space-y-2">
      {/* Sensor Values */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Temperature */}
        <div className="flex items-center gap-1">
          <Thermometer className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>
            {formatSensorValue(avgTemperature, "°C")}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex items-center gap-1">
          <Droplets className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>
            {formatSensorValue(avgHumidity, "%")}
          </span>
        </div>
      </div>

      {/* Status and Last Update */}
      <div className="flex items-center justify-between text-xs">
        <Badge
          variant="outline"
          className={`text-xs h-5 ${statusColor} border-current`}
        >
          {getStatusText(avgTemperature, avgHumidity)}
        </Badge>

        {timeAgo && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent"></div>
          Updating...
        </div>
      )}

      {/* Multiple sensors indicator */}
      {sensorDevices.length > 1 && (
        <div className="text-xs text-muted-foreground">
          {sensorReadings.length}/{sensorDevices.length} sensors active
        </div>
      )}
    </div>
  );
}

// Helper function to get status text
function getStatusText(temperature?: number, humidity?: number): string {
  if (temperature !== undefined) {
    if (temperature > 35) return "Hot";
    if (temperature < 18) return "Cold";
  }

  if (humidity !== undefined) {
    if (humidity > 80) return "High H";
    if (humidity < 30) return "Low H";
  }

  return "Normal";
}

// Helper function to get time ago string
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return time.toLocaleDateString();
}

// Compact version for smaller displays
export function RackSensorDisplayCompact({
  rackId,
  devices = [],
}: Omit<RackSensorDisplayProps, "refreshInterval">) {
  const sensorDevices = devices.filter(
    (device) =>
      device.type?.toLowerCase() === "sensor" &&
      device.sensorType === "Temperature"
  );

  const { sensorData, loading } = useRealtimeSensorData({
    rackIds: [rackId],
    refreshInterval: 30000,
    enabled: sensorDevices.length > 0,
  });

  if (sensorDevices.length === 0 || loading) {
    return null;
  }

  const sensorReadings = sensorDevices
    .map((device) => {
      const reading = getLatestSensorReading(sensorData, device.id);
      return reading;
    })
    .filter(Boolean);

  if (sensorReadings.length === 0) return null;

  const avgTemp =
    sensorReadings.reduce(
      (sum, reading) => sum + (reading?.temperature || 0),
      0
    ) / sensorReadings.length;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Thermometer className="h-3 w-3" />
      <span>{formatSensorValue(avgTemp, "°C")}</span>
    </div>
  );
}
