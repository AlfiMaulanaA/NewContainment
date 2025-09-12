"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Activity, 
  Thermometer, 
  Wind, 
  Droplets, 
  Gauge, 
  Waves,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Calendar,
  Zap
} from "lucide-react";
import { deviceSensorDataApi, type DeviceSensorData } from "@/lib/api-service";
import { format, parseISO, subHours, subDays, subMonths, startOfDay, endOfDay, startOfHour, endOfHour } from "date-fns";

interface SensorDataChartsProps {
  containmentId?: number;
  deviceId?: number;
  className?: string;
}

interface ProcessedSensorData {
  timestamp: string;
  formattedTime: string;
  sensorType: string;
  deviceName: string;
  [key: string]: any; // For dynamic sensor values
}

interface ChartDataByType {
  [sensorType: string]: ProcessedSensorData[];
}

const COLORS = {
  temperature: '#ef4444',
  humidity: '#3b82f6',
  airFlow: '#10b981',
  vibration: '#f59e0b',
  dust: '#8b5cf6',
  pressure: '#06b6d4',
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#f59e0b',
  destructive: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
};

const CHART_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be123c', '#4338ca'];

export function SensorDataCharts({ containmentId, deviceId, className }: SensorDataChartsProps) {
  const [sensorData, setSensorData] = useState<DeviceSensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("1d");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("all");
  const [chartType, setChartType] = useState<string>("line");

  useEffect(() => {
    loadSensorData();
  }, [containmentId, deviceId, timeRange]);

  const loadSensorData = async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (timeRange) {
        case "1h":
          startDate = subHours(endDate, 1);
          break;
        case "6h":
          startDate = subHours(endDate, 6);
          break;
        case "24h":
        case "1d":
          startDate = subDays(endDate, 1);
          break;
        case "7d":
        case "1w":
          startDate = subDays(endDate, 7);
          break;
        case "30d":
        case "1m":
          startDate = subDays(endDate, 30);
          break;
        default:
          startDate = subDays(endDate, 1);
      }

      // Increase page size for longer time ranges  
      let pageSize = 2000;
      if (timeRange === "7d" || timeRange === "1w") {
        pageSize = 5000;
      } else if (timeRange === "30d" || timeRange === "1m") {
        pageSize = 10000;
      }

      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        containmentId,
        deviceId,
        pageSize,
      };

      console.log(`Loading sensor data for ${timeRange}:`, params);
      const response = await deviceSensorDataApi.getSensorData(params);
      if (response.success && response.data) {
        setSensorData(response.data);
        console.log(`Loaded ${response.data.length} sensor records for ${timeRange}`);
      }
    } catch (error) {
      console.error("Failed to load sensor data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregate data points for better trend visualization on longer periods
  const aggregateDataPoints = (data: ProcessedSensorData[], period: string): ProcessedSensorData[] => {
    if (data.length === 0) return data;

    // Determine aggregation interval
    let intervalMinutes: number;
    switch (period) {
      case "1w":
        intervalMinutes = 120; // 2 hours
        break;
      case "1m":
        intervalMinutes = 720; // 12 hours
        break;
      default:
        return data; // No aggregation needed
    }

    const aggregatedData: ProcessedSensorData[] = [];
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Group data into intervals
    const intervals: { [key: number]: ProcessedSensorData[] } = {};
    
    data.forEach(point => {
      const timestamp = new Date(point.timestamp).getTime();
      const intervalKey = Math.floor(timestamp / intervalMs) * intervalMs;
      
      if (!intervals[intervalKey]) {
        intervals[intervalKey] = [];
      }
      intervals[intervalKey].push(point);
    });

    // Calculate average values for each interval
    Object.keys(intervals).forEach(intervalKey => {
      const intervalData = intervals[parseInt(intervalKey)];
      if (intervalData.length === 0) return;

      // Get the first data point as template
      const template = { ...intervalData[0] };
      const intervalDate = new Date(parseInt(intervalKey));
      
      // Update timestamp and formatted time
      template.timestamp = intervalDate.toISOString();
      template.formattedTime = period === "1m" 
        ? format(intervalDate, "MM/dd")
        : format(intervalDate, "MM/dd HH:mm");

      // Calculate averages for numeric fields
      const numericFields = ['temp', 'hum', 'airFlow', 'pressure', 'vibrationX', 'vibrationY', 'vibrationZ', 'vibrationMagnitude', 'dustLevel'];
      
      numericFields.forEach(field => {
        const values = intervalData
          .map(d => d[field])
          .filter(v => typeof v === 'number' && !isNaN(v));
        
        if (values.length > 0) {
          template[field] = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
        }
      });

      aggregatedData.push(template);
    });

    return aggregatedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Process sensor data for charts
  const processedData: ChartDataByType = useMemo(() => {
    const grouped: ChartDataByType = {};

    sensorData.forEach((data) => {
      if (!data.sensorType || !data.rawPayload) return;

      try {
        const payload = JSON.parse(data.rawPayload);
        const timestamp = data.timestamp;
        
        // Format time based on time range
        let formattedTime: string;
        const parsedDate = parseISO(timestamp);
        
        switch (timeRange) {
          case "1h":
          case "6h":
            formattedTime = format(parsedDate, "HH:mm");
            break;
          case "24h":
          case "1d":
            formattedTime = format(parsedDate, "HH:mm");
            break;
          case "7d":
          case "1w":
            formattedTime = format(parsedDate, "MM/dd HH:mm");
            break;
          case "30d":
          case "1m":
            formattedTime = format(parsedDate, "MM/dd");
            break;
          default:
            formattedTime = format(parsedDate, "HH:mm");
        }
        
        const processed: ProcessedSensorData = {
          timestamp,
          formattedTime,
          sensorType: data.sensorType,
          deviceName: data.device?.name || `Device ${data.deviceId}`,
        };

        // Extract sensor-specific values from payload
        switch (data.sensorType.toLowerCase()) {
          case "temperature":
            processed.temp = payload.temp || payload.temperature;
            processed.hum = payload.hum || payload.humidity;
            break;
          case "air flow":
            processed.airFlow = payload.air_flow_lpm;
            processed.pressure = payload.air_pressure_hpa;
            break;
          case "vibration":
            processed.vibrationX = payload.vibration_x;
            processed.vibrationY = payload.vibration_y;
            processed.vibrationZ = payload.vibration_z;
            processed.vibrationMagnitude = Math.sqrt(
              Math.pow(payload.vibration_x || 0, 2) +
              Math.pow(payload.vibration_y || 0, 2) +
              Math.pow(payload.vibration_z || 0, 2)
            ).toFixed(3);
            break;
          case "dust sensor":
            processed.dustLevel = payload.dust_level_ug_m3;
            processed.temp = payload.temperature;
            processed.hum = payload.humidity;
            break;
          case "humidity":
            processed.hum = payload.hum;
            processed.temp = payload.temp;
            break;
          case "pressure":
            processed.pressure = payload.air_pressure_hpa;
            break;
        }

        if (!grouped[data.sensorType]) {
          grouped[data.sensorType] = [];
        }
        grouped[data.sensorType].push(processed);
      } catch (error) {
        console.error("Error parsing sensor payload:", error);
      }
    });

    // Sort each group by timestamp
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Apply data aggregation for longer time periods to show trends more clearly
      if (timeRange === "1w" || timeRange === "1m") {
        grouped[type] = aggregateDataPoints(grouped[type], timeRange);
      }
    });

    return grouped;
  }, [sensorData]);

  const availableSensorTypes = Object.keys(processedData);

  const getChartIcon = (sensorType: string) => {
    switch (sensorType.toLowerCase()) {
      case "temperature":
        return <Thermometer className="h-4 w-4" />;
      case "air flow":
        return <Wind className="h-4 w-4" />;
      case "vibration":
        return <Activity className="h-4 w-4" />;
      case "dust sensor":
        return <Waves className="h-4 w-4" />;
      case "humidity":
        return <Droplets className="h-4 w-4" />;
      case "pressure":
        return <Gauge className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getChartColor = (sensorType: string) => {
    switch (sensorType.toLowerCase()) {
      case "temperature":
        return COLORS.temperature;
      case "humidity":
        return COLORS.humidity;
      case "air flow":
        return COLORS.airFlow;
      case "vibration":
        return COLORS.vibration;
      case "dust sensor":
        return COLORS.dust;
      case "pressure":
        return COLORS.pressure;
      default:
        return COLORS.primary;
    }
  };

  const renderTemperatureChart = (data: ProcessedSensorData[], type: string) => {
    const isLongPeriod = timeRange === "1w" || timeRange === "1m";
    const curveType = isLongPeriod ? "monotone" : "linear";
    const showDots = !isLongPeriod;
    const strokeWidth = isLongPeriod ? 3 : 2;

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fontSize: 12 }}
              interval={isLongPeriod ? "preserveStartEnd" : 0}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelFormatter={(label) => `Time: ${label}`}
              formatter={(value: any, name: string) => [
                typeof value === 'number' ? value.toFixed(1) : value,
                name === 'temp' ? 'Temperature (°C)' : 'Humidity (%)'
              ]}
            />
            <Legend />
            {data.some(d => d.temp !== undefined) && (
              <Area 
                type={curveType}
                dataKey="temp" 
                stackId="1"
                stroke={COLORS.temperature}
                fill={COLORS.temperature}
                fillOpacity={isLongPeriod ? 0.3 : 0.6}
                strokeWidth={strokeWidth}
                name="Temperature"
              />
            )}
            {data.some(d => d.hum !== undefined) && (
              <Area 
                type={curveType}
                dataKey="hum" 
                stackId="1"
                stroke={COLORS.humidity}
                fill={COLORS.humidity}
                fillOpacity={isLongPeriod ? 0.3 : 0.6}
                strokeWidth={strokeWidth}
                name="Humidity"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 12 }}
            interval={isLongPeriod ? "preserveStartEnd" : 0}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(label) => `Time: ${label}`}
            formatter={(value: any, name: string) => [
              typeof value === 'number' ? value.toFixed(1) : value,
              name === 'temp' ? 'Temperature (°C)' : 'Humidity (%)'
            ]}
          />
          <Legend />
          {data.some(d => d.temp !== undefined) && (
            <Line 
              type={curveType}
              dataKey="temp" 
              stroke={COLORS.temperature}
              strokeWidth={strokeWidth}
              dot={showDots ? { fill: COLORS.temperature, strokeWidth: 2, r: 3 } : false}
              name="Temperature"
            />
          )}
          {data.some(d => d.hum !== undefined) && (
            <Line 
              type={curveType}
              dataKey="hum" 
              stroke={COLORS.humidity}
              strokeWidth={strokeWidth}
              dot={showDots ? { fill: COLORS.humidity, strokeWidth: 2, r: 3 } : false}
              name="Humidity"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderVibrationChart = (data: ProcessedSensorData[]) => {
    const isLongPeriod = timeRange === "1w" || timeRange === "1m";
    const curveType = isLongPeriod ? "monotone" : "linear";
    const showDots = !isLongPeriod;
    const strokeWidth = isLongPeriod ? 3 : 2;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 12 }} 
            interval={isLongPeriod ? "preserveStartEnd" : 0}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(label) => `Time: ${label}`}
            formatter={(value: any, name: string) => [
              typeof value === 'number' ? value.toFixed(3) : value,
              `${name.replace('vibration', '').toUpperCase()} (m/s²)`
            ]}
          />
          <Legend />
          <Line 
            type={curveType}
            dataKey="vibrationX" 
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            dot={showDots ? { strokeWidth: 2, r: 3 } : false}
            name="X-axis"
          />
          <Line 
            type={curveType}
            dataKey="vibrationY" 
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            dot={showDots ? { strokeWidth: 2, r: 3 } : false}
            name="Y-axis"
          />
          <Line 
            type={curveType}
            dataKey="vibrationZ" 
            stroke="#10b981"
            strokeWidth={strokeWidth}
            dot={showDots ? { strokeWidth: 2, r: 3 } : false}
            name="Z-axis"
          />
          <Line 
            type={curveType}
            dataKey="vibrationMagnitude" 
            stroke="#f59e0b"
            strokeWidth={strokeWidth + 1}
            strokeDasharray={isLongPeriod ? "none" : "5 5"}
            dot={showDots ? { strokeWidth: 2, r: 4 } : false}
            name="Magnitude"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderGenericChart = (data: ProcessedSensorData[], sensorType: string) => {
    const keys = Object.keys(data[0] || {}).filter(
      key => !['timestamp', 'formattedTime', 'sensorType', 'deviceName'].includes(key)
    );

    const isLongPeriod = timeRange === "1w" || timeRange === "1m";
    const curveType = isLongPeriod ? "monotone" : "linear";
    const showDots = !isLongPeriod;
    const strokeWidth = isLongPeriod ? 3 : 2;

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fontSize: 12 }} 
              interval={isLongPeriod ? "preserveStartEnd" : 0}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {keys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 12 }} 
            interval={isLongPeriod ? "preserveStartEnd" : 0}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {keys.map((key, index) => (
            <Line 
              key={key}
              type={curveType}
              dataKey={key} 
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={strokeWidth}
              dot={showDots ? { strokeWidth: 2, r: 3 } : false}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading sensor data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sensor Data Visualization
          </CardTitle>
          <CardDescription>
            Interactive charts showing sensor data over time with different visualization options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="1d">1 Day (24 Hours)</SelectItem>
                  <SelectItem value="1w">1 Week (7 Days)</SelectItem>
                  <SelectItem value="1m">1 Month (30 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={loadSensorData}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sensorData.length} records
            </Badge>
            <Badge variant="outline" className="text-xs">
              {availableSensorTypes.length} sensor types
            </Badge>
            {(timeRange === "1w" || timeRange === "1m") && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trend View {timeRange === "1w" ? "(2h avg)" : "(12h avg)"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue={availableSensorTypes[0] || "all"} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-8 gap-1 h-auto p-1">
          {availableSensorTypes.map((sensorType) => (
            <TabsTrigger 
              key={sensorType} 
              value={sensorType}
              className="flex items-center gap-1 text-xs px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {getChartIcon(sensorType)}
              <span className="hidden sm:inline">{sensorType}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {availableSensorTypes.map((sensorType) => (
          <TabsContent key={sensorType} value={sensorType}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getChartIcon(sensorType)}
                  {sensorType} Sensor Data
                  <Badge 
                    variant="secondary" 
                    style={{ backgroundColor: `${getChartColor(sensorType)}20`, color: getChartColor(sensorType) }}
                  >
                    {processedData[sensorType]?.length || 0} points
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time visualization of {sensorType.toLowerCase()} sensor readings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processedData[sensorType] && processedData[sensorType].length > 0 ? (
                  <>
                    {sensorType.toLowerCase() === "temperature" && renderTemperatureChart(processedData[sensorType], sensorType)}
                    {sensorType.toLowerCase() === "vibration" && renderVibrationChart(processedData[sensorType])}
                    {!["temperature", "vibration"].includes(sensorType.toLowerCase()) && renderGenericChart(processedData[sensorType], sensorType)}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mr-3" />
                    <div className="text-center">
                      <p className="font-medium">No data available</p>
                      <p className="text-sm">No {sensorType.toLowerCase()} sensor data found for the selected time range</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {availableSensorTypes.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium text-lg mb-2">No sensor data found</p>
              <p className="text-sm">Try adjusting the time range or check if sensors are actively sending data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}