"use client";

import { useEffect, useState, useMemo } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Thermometer, Activity, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  deviceSensorDataApi,
  DeviceSensorData,
  SensorStatistics,
  SensorHistoryPoint,
} from "@/lib/api-service";
import { toast } from "sonner";
import { useSearchFilter } from "@/hooks/use-search-filter";

const ITEMS_PER_PAGE = 10;

export default function SensorDataPage() {
  const [sensorData, setSensorData] = useState<DeviceSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [statistics, setStatistics] = useState<SensorStatistics | null>(null);
  const [temperatureHistory, setTemperatureHistory] = useState<
    SensorHistoryPoint[]
  >([]);
  const [humidityHistory, setHumidityHistory] = useState<SensorHistoryPoint[]>(
    []
  );
  const [historyLoading, setHistoryLoading] = useState(false);

  // Menggunakan useSearchFilter dengan nilai default array kosong
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sensorData,
    ["topic"]
  );

  // Pagination logic: Langsung gunakan filteredData
  const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
  const totalPages = Math.ceil(safeFilteredData.length / ITEMS_PER_PAGE);
  const paginatedData = safeFilteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  // ... (kode lainnya)

  const loadSensorData = async () => {
    setLoading(true);
    try {
      const result = await deviceSensorDataApi.getLatestSensorData(100);

      // ✅ PERBAIKAN UTAMA DI SINI
      // Memastikan result.data ada dan merupakan array
      if (result.success && Array.isArray(result.data)) {
        setSensorData(result.data);
      } else {
        // Jika data tidak valid, atur state ke array kosong
        setSensorData([]);
        toast.error(result.message || "Failed to load sensor data.");
      }
    } catch (error: any) {
      setSensorData([]); // Pastikan state tetap array jika ada error
      toast.error(error.message || "Error loading sensor data.");
    } finally {
      setLoading(false);
    }
  };

  // ... (kode lainnya)

  const loadSensorHistory = async (deviceId: number) => {
    setHistoryLoading(true);
    setStatistics(null);
    setTemperatureHistory([]);
    setHumidityHistory([]);

    try {
      const statsResult = await deviceSensorDataApi.getSensorStatistics(
        deviceId
      );
      if (statsResult.success && statsResult.data) {
        setStatistics(statsResult.data);
      }

      const tempResult = await deviceSensorDataApi.getTemperatureHistory(
        deviceId,
        24
      );
      if (tempResult.success && tempResult.data) {
        setTemperatureHistory(tempResult.data);
      }

      const humidityResult = await deviceSensorDataApi.getHumidityHistory(
        deviceId,
        24
      );
      if (humidityResult.success && humidityResult.data) {
        setHumidityHistory(humidityResult.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading sensor history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadSensorData();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadSensorHistory(selectedDevice);
    }
  }, [selectedDevice]);

  const activeTopics = useMemo(() => {
    const topics = new Set<string>();
    sensorData.forEach((item) => topics.add(item.topic));
    return Array.from(topics);
  }, [sensorData]);

  const handleDeviceChange = (value: string) => {
    const newDeviceId = value ? parseInt(value) : null;
    setSelectedDevice(newDeviceId);
    setCurrentPage(1);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Thermometer className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Sensor Data Monitoring</h1>
        </div>
      </header>

      {/* Konten Komponen lainnya */}
      <div className="p-4 grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sensor Statistics
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statistics && !historyLoading ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Temperature</h3>
                  <p className="text-2xl font-bold">
                    Min: {statistics.temperature.min?.toFixed(2) ?? "-"}°C
                  </p>
                  <p className="text-2xl font-bold">
                    Max: {statistics.temperature.max?.toFixed(2) ?? "-"}°C
                  </p>
                  <p className="text-2xl font-bold">
                    Avg: {statistics.temperature.avg?.toFixed(2) ?? "-"}°C
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Humidity</h3>
                  <p className="text-2xl font-bold">
                    Min: {statistics.humidity.min?.toFixed(2) ?? "-"}%
                  </p>
                  <p className="text-2xl font-bold">
                    Max: {statistics.humidity.max?.toFixed(2) ?? "-"}%
                  </p>
                  <p className="text-2xl font-bold">
                    Avg: {statistics.humidity.avg?.toFixed(2) ?? "-"}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Select a device to view statistics.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Temperature History (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : temperatureHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={temperatureHistory}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) =>
                      new Date(timestamp).toLocaleTimeString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value?.toFixed(2)}°C`}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
                <p>No temperature data available for the selected device.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Humidity History (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : humidityHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={humidityHistory}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) =>
                      new Date(timestamp).toLocaleTimeString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value?.toFixed(2)}%`}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
                <p>No humidity data available for the selected device.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sensor Data History</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-48">
                  <Select
                    onValueChange={handleDeviceChange}
                    value={selectedDevice?.toString() ?? ""}
                    disabled={activeTopics.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTopics.map((topic) => {
                        const item = sensorData.find(
                          (item) => item.topic === topic
                        );
                        return (
                          <SelectItem
                            key={topic}
                            value={item?.deviceId.toString() ?? topic}
                          >
                            {topic}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Containment ID</TableHead>
                      <TableHead>Temperature (°C)</TableHead>
                      <TableHead>Humidity (%)</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Received At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((data) => (
                        <TableRow key={data.id}>
                          <TableCell className="font-medium">
                            {data.topic}
                          </TableCell>
                          <TableCell>{data.deviceId}</TableCell>
                          <TableCell>{data.containmentId}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                data.temperature && data.temperature > 30
                                  ? "bg-red-500 hover:bg-red-500"
                                  : "bg-green-500 hover:bg-green-500"
                              }
                            >
                              {data.temperature?.toFixed(2) ?? "-"}°C
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{data.humidity?.toFixed(2) ?? "-"}%</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(data.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(data.receivedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {searchQuery
                            ? "No sensor data found matching your search."
                            : "No sensor data available."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(p - 1, 1))
                            }
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={currentPage === i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className="cursor-pointer"
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(p + 1, totalPages))
                            }
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
