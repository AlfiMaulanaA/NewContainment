"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  BarChart3,
  Table2,
  TrendingUp,
  Thermometer,
  Droplets,
  Calendar,
  Filter,
  RefreshCw,
  Activity,
  Server,
  Database,
  Gauge,
  LineChart,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SensorCharts } from "@/components/sensor-charts";

import {
  deviceSensorDataApi,
  racksApi,
  devicesApi,
  DeviceSensorData,
  Rack,
  Device,
} from "@/lib/api-service";
import { toast } from "sonner";

interface SensorDataStatistics {
  totalRecords: number;
  deviceCount: number;
  dateRange: {
    from: string;
    to: string;
  };
  avgTemperature: number;
  avgHumidity: number;
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
}

export default function SensorDataReportPage() {
  const router = useRouter();
  const [sensorData, setSensorData] = useState<DeviceSensorData[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [statistics, setStatistics] = useState<SensorDataStatistics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedRackId, setSelectedRackId] = useState<string>("all");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [limit, setLimit] = useState<string>("100");

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [racksResult, devicesResult] = await Promise.all([
        racksApi.getRacks(),
        devicesApi.getDevices(),
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
      }

      if (devicesResult.success && devicesResult.data) {
        // Filter only sensor devices
        const sensorDevices = devicesResult.data.filter(
          (d) => d.type?.toLowerCase() === "sensor"
        );
        setDevices(sensorDevices);
      }

      await fetchSensorData();
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch sensor data based on filters
  const fetchSensorData = async () => {
    try {
      let sensorDataResult;
      const limitNum = parseInt(limit) || 100;

      if (selectedDeviceId !== "all") {
        sensorDataResult = await deviceSensorDataApi.getSensorDataByDevice(
          parseInt(selectedDeviceId),
          limitNum
        );
      } else if (selectedRackId !== "all") {
        sensorDataResult = await deviceSensorDataApi.getSensorDataByRack(
          parseInt(selectedRackId),
          limitNum
        );
      } else {
        sensorDataResult = await deviceSensorDataApi.getLatestSensorData(
          limitNum
        );
      }

      if (
        sensorDataResult &&
        sensorDataResult.success &&
        sensorDataResult.data
      ) {
        // Handle nested data structure from backend
        const actualData =
          (sensorDataResult.data as any).data || sensorDataResult.data;
        setSensorData(actualData || []);
        calculateStatistics(actualData || []);
      } else {
        setSensorData([]);
        setStatistics(null);
        toast.error(sensorDataResult?.message || "Failed to fetch sensor data");
      }
    } catch (error: any) {
      console.error("Error fetching sensor data:", error);
      toast.error("Failed to fetch sensor data: " + error.message);
    }
  };

  // Calculate statistics from sensor data
  const calculateStatistics = (data: DeviceSensorData[]) => {
    if (!data.length) {
      setStatistics(null);
      return;
    }

    const validTempData = data.filter(
      (d) => d.temperature !== null && d.temperature !== undefined
    );
    const validHumData = data.filter(
      (d) => d.humidity !== null && d.humidity !== undefined
    );

    const temperatures = validTempData.map((d) =>
      parseFloat(d.temperature?.toString() || "0")
    );
    const humidities = validHumData.map((d) =>
      parseFloat(d.humidity?.toString() || "0")
    );

    const stats: SensorDataStatistics = {
      totalRecords: data.length,
      deviceCount: new Set(data.map((d) => d.deviceId)).size,
      dateRange: {
        from: data[data.length - 1]?.timestamp || "",
        to: data[0]?.timestamp || "",
      },
      avgTemperature:
        temperatures.length > 0
          ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
          : 0,
      avgHumidity:
        humidities.length > 0
          ? humidities.reduce((a, b) => a + b, 0) / humidities.length
          : 0,
      minTemperature: temperatures.length > 0 ? Math.min(...temperatures) : 0,
      maxTemperature: temperatures.length > 0 ? Math.max(...temperatures) : 0,
      minHumidity: humidities.length > 0 ? Math.min(...humidities) : 0,
      maxHumidity: humidities.length > 0 ? Math.max(...humidities) : 0,
    };

    setStatistics(stats);
  };

  // Filter devices by selected rack
  const getFilteredDevices = () => {
    if (selectedRackId === "all") return devices;
    return devices.filter((d) => d.rackId === parseInt(selectedRackId));
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!sensorData.length) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Device ID",
      "Device Name",
      "Rack",
      "Temperature (°C)",
      "Humidity (%)",
      "Timestamp",
      "Received At",
    ];
    const rows = sensorData.map((d) => [
      d.deviceId,
      d.device?.name || "Unknown",
      d.rack?.name || "Unknown",
      d.temperature?.toString() || "",
      d.humidity?.toString() || "",
      new Date(d.timestamp).toLocaleString(),
      new Date(d.receivedAt).toLocaleString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensor_data_report_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get temperature color
  const getTemperatureColor = (temp: number) => {
    if (temp < 20) return "text-blue-600";
    if (temp < 25) return "text-green-600";
    if (temp < 30) return "text-yellow-600";
    if (temp < 35) return "text-orange-600";
    return "text-red-600";
  };

  // Get humidity color
  const getHumidityColor = (hum: number) => {
    if (hum < 30) return "text-red-600";
    if (hum < 40) return "text-orange-600";
    if (hum < 60) return "text-green-600";
    if (hum < 70) return "text-yellow-600";
    return "text-blue-600";
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (racks.length > 0 || devices.length > 0) {
      fetchSensorData();
    }
  }, [selectedRackId, selectedDeviceId, limit]);

  // Reset device filter when rack filter changes
  useEffect(() => {
    setSelectedDeviceId("all");
  }, [selectedRackId]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Sensor Data Analytics</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {statistics && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                {statistics.totalRecords} records
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {statistics.deviceCount} sensors
              </span>
            </div>
          )}
          <Button
            onClick={() => fetchData()}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={exportToCSV} disabled={!sensorData.length} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Data Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Rack Selection
                </label>
                <Select
                  value={selectedRackId}
                  onValueChange={setSelectedRackId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Rack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Racks ({racks.length})
                    </SelectItem>
                    {racks.map((rack) => (
                      <SelectItem key={rack.id} value={rack.id.toString()}>
                        {rack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sensor Device
                </label>
                <Select
                  value={selectedDeviceId}
                  onValueChange={setSelectedDeviceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Devices ({getFilteredDevices().length})
                    </SelectItem>
                    {getFilteredDevices().map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Record Limit
                </label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 records</SelectItem>
                    <SelectItem value="100">100 records</SelectItem>
                    <SelectItem value="500">500 records</SelectItem>
                    <SelectItem value="1000">1000 records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Records
                </CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalRecords.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  data points collected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Temperature
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Thermometer className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.avgTemperature.toFixed(1)}°C
                </div>
                <p className="text-xs text-muted-foreground">
                  environmental monitoring
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Humidity
                </CardTitle>
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Droplets className="h-4 w-4 text-cyan-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">
                  {statistics.avgHumidity.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  moisture control
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sensors
                </CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.deviceCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  monitoring devices
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Summary */}
        {statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Temperature Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Minimum:</span>
                      <span
                        className={getTemperatureColor(
                          statistics.minTemperature
                        )}
                      >
                        {statistics.minTemperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maximum:</span>
                      <span
                        className={getTemperatureColor(
                          statistics.maxTemperature
                        )}
                      >
                        {statistics.maxTemperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average:</span>
                      <span
                        className={getTemperatureColor(
                          statistics.avgTemperature
                        )}
                      >
                        {statistics.avgTemperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Range:</span>
                      <span>
                        {(
                          statistics.maxTemperature - statistics.minTemperature
                        ).toFixed(1)}
                        °C
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Humidity Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Minimum:</span>
                      <span
                        className={getHumidityColor(statistics.minHumidity)}
                      >
                        {statistics.minHumidity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maximum:</span>
                      <span
                        className={getHumidityColor(statistics.maxHumidity)}
                      >
                        {statistics.maxHumidity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average:</span>
                      <span
                        className={getHumidityColor(statistics.avgHumidity)}
                      >
                        {statistics.avgHumidity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Range:</span>
                      <span>
                        {(
                          statistics.maxHumidity - statistics.minHumidity
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Card>
          <Tabs defaultValue="table" className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  Data Table
                </TabsTrigger>
                <TabsTrigger value="charts" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Charts
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Analysis
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="table" className="mt-0">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="h-5 w-5" />
                    Sensor Data Records
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{sensorData.length} records</Badge>
                    <Button
                      onClick={exportToCSV}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      disabled={!sensorData.length}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading sensor data...
                    </p>
                  </div>
                ) : sensorData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <UITable className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Rack Location</TableHead>
                          <TableHead>Temperature</TableHead>
                          <TableHead>Humidity</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sensorData.map((data, index) => (
                          <TableRow
                            key={`${data.deviceId}-${data.timestamp}-${index}`}
                          >
                            <TableCell>
                              <div className="font-medium">
                                {data.device?.name || `Device ${data.deviceId}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {data.deviceId}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {data.rack?.name || `Rack ${data.rackId}`}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`font-medium ${getTemperatureColor(
                                  parseFloat(
                                    data.temperature?.toString() || "0"
                                  )
                                )}`}
                              >
                                {data.temperature?.toFixed(1) || "N/A"}°C
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`font-medium ${getHumidityColor(
                                  parseFloat(data.humidity?.toString() || "0")
                                )}`}
                              >
                                {data.humidity?.toFixed(1) || "N/A"}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {new Date(
                                    data.timestamp
                                  ).toLocaleDateString()}
                                </div>
                                <div className="text-muted-foreground">
                                  {new Date(
                                    data.timestamp
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-700"
                              >
                                Active
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </UITable>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Sensor Data Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedRackId !== "all" || selectedDeviceId !== "all"
                        ? "Try adjusting your filters or check if devices are generating data."
                        : "No sensor data available. Check if sensors are connected and sending data."}
                    </p>
                    <Button onClick={() => fetchData()} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="charts">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <SensorCharts
                  data={sensorData}
                  title="Sensor Data Visualization"
                />
              )}
            </TabsContent>

            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Advanced Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : sensorData.length > 0 ? (
                    <div className="space-y-6">
                      {/* Data Quality Analysis */}
                      <div>
                        <h4 className="font-semibold mb-4">
                          Data Quality Assessment
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">
                                  {(
                                    (sensorData.filter(
                                      (d) =>
                                        d.temperature !== null &&
                                        d.humidity !== null
                                    ).length /
                                      sensorData.length) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Data Completeness
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">
                                  {
                                    new Set(sensorData.map((d) => d.deviceId))
                                      .size
                                  }
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Active Sensors
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">
                                  {statistics
                                    ? Math.round(
                                        (new Date(
                                          statistics.dateRange.to
                                        ).getTime() -
                                          new Date(
                                            statistics.dateRange.from
                                          ).getTime()) /
                                          (1000 * 60 * 60)
                                      )
                                    : 0}
                                  h
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Monitoring Duration
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Environmental Conditions Assessment */}
                      <div>
                        <h4 className="font-semibold mb-4">
                          Environmental Conditions Assessment
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium mb-2">
                              Temperature Status
                            </h5>
                            {statistics && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span>Overall Status:</span>
                                  <Badge
                                    variant={
                                      statistics.avgTemperature >= 20 &&
                                      statistics.avgTemperature <= 25
                                        ? "default"
                                        : statistics.avgTemperature <= 30
                                        ? "secondary"
                                        : "destructive"
                                    }
                                  >
                                    {statistics.avgTemperature >= 20 &&
                                    statistics.avgTemperature <= 25
                                      ? "Optimal"
                                      : statistics.avgTemperature <= 30
                                      ? "Acceptable"
                                      : "Concerning"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Recommended range: 20-25°C for optimal
                                  equipment performance
                                </div>
                                {statistics.maxTemperature > 35 && (
                                  <div className="text-sm text-red-600">
                                    High temperature detected (
                                    {statistics.maxTemperature.toFixed(1)}°C) -
                                    Consider cooling
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <h5 className="font-medium mb-2">
                              Humidity Status
                            </h5>
                            {statistics && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span>Overall Status:</span>
                                  <Badge
                                    variant={
                                      statistics.avgHumidity >= 45 &&
                                      statistics.avgHumidity <= 55
                                        ? "default"
                                        : statistics.avgHumidity <= 65
                                        ? "secondary"
                                        : "destructive"
                                    }
                                  >
                                    {statistics.avgHumidity >= 45 &&
                                    statistics.avgHumidity <= 55
                                      ? "Optimal"
                                      : statistics.avgHumidity <= 65
                                      ? "Acceptable"
                                      : "Concerning"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Recommended range: 45-55% for data center
                                  environments
                                </div>
                                {(statistics.maxHumidity > 70 ||
                                  statistics.minHumidity < 30) && (
                                  <div className="text-sm text-red-600">
                                    Humidity out of range - Risk of equipment
                                    damage
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h4 className="font-semibold mb-4">Recommendations</h4>
                        <div className="space-y-3">
                          {statistics && statistics.avgTemperature > 30 && (
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-start space-x-3">
                                  <Thermometer className="h-5 w-5 text-red-500 mt-0.5" />
                                  <div>
                                    <p className="font-medium">
                                      High Temperature Alert
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Average temperature is{" "}
                                      {statistics.avgTemperature.toFixed(1)}°C.
                                      Consider improving cooling systems or
                                      airflow.
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {statistics &&
                            (statistics.avgHumidity > 65 ||
                              statistics.avgHumidity < 40) && (
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex items-start space-x-3">
                                    <Droplets className="h-5 w-5 text-blue-500 mt-0.5" />
                                    <div>
                                      <p className="font-medium">
                                        Humidity Warning
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Humidity level is{" "}
                                        {statistics.avgHumidity.toFixed(1)}%.{" "}
                                        {statistics.avgHumidity > 65
                                          ? "Consider dehumidification"
                                          : "Consider humidification"}{" "}
                                        to prevent equipment issues.
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <Calendar className="h-5 w-5 text-green-500 mt-0.5" />
                                <div>
                                  <p className="font-medium">
                                    Monitoring Status
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    System is actively monitoring{" "}
                                    {
                                      new Set(sensorData.map((d) => d.deviceId))
                                        .size
                                    }{" "}
                                    sensors across{" "}
                                    {
                                      new Set(sensorData.map((d) => d.rackId))
                                        .size
                                    }{" "}
                                    racks. Last reading:{" "}
                                    {sensorData[0]
                                      ? new Date(
                                          sensorData[0].timestamp
                                        ).toLocaleString()
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-xl font-medium">
                        No Data for Analysis
                      </p>
                      <p className="text-sm">
                        Please ensure sensors are connected and sending data
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </SidebarInset>
  );
}
