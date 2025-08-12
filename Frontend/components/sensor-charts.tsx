"use client";

import { useMemo } from "react";
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
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceSensorData } from "@/lib/api-service";

interface SensorChartsProps {
  data: DeviceSensorData[];
  title?: string;
}

interface ChartData {
  timestamp: string;
  temperature: number;
  humidity: number;
  deviceName: string;
  rackName: string;
  hour: string;
  date: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function SensorCharts({ data, title = "Sensor Data Visualization" }: SensorChartsProps) {
  // Process data for charts
  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data
      .filter(d => d.temperature !== null && d.humidity !== null)
      .map((d, index) => {
        const date = new Date(d.timestamp);
        return {
          timestamp: date.toLocaleString(),
          temperature: parseFloat(d.temperature?.toString() || '0'),
          humidity: parseFloat(d.humidity?.toString() || '0'),
          deviceName: d.device?.name || `Device ${d.deviceId}`,
          rackName: d.rack?.name || `Rack ${d.rackId}`,
          hour: date.getHours().toString().padStart(2, '0') + ':00',
          date: date.toLocaleDateString(),
          index
        };
      })
      .reverse(); // Show oldest to newest
  }, [data]);

  // Aggregate data by hour for trend analysis
  const hourlyData = useMemo(() => {
    const hourlyMap = new Map<string, { temps: number[], hums: number[], count: number }>();
    
    chartData.forEach(d => {
      const key = d.hour;
      if (!hourlyMap.has(key)) {
        hourlyMap.set(key, { temps: [], hums: [], count: 0 });
      }
      const existing = hourlyMap.get(key)!;
      existing.temps.push(d.temperature);
      existing.hums.push(d.humidity);
      existing.count++;
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        avgTemperature: parseFloat((data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1)),
        avgHumidity: parseFloat((data.hums.reduce((a, b) => a + b, 0) / data.hums.length).toFixed(1)),
        minTemperature: Math.min(...data.temps),
        maxTemperature: Math.max(...data.temps),
        minHumidity: Math.min(...data.hums),
        maxHumidity: Math.max(...data.hums),
        dataPoints: data.count
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [chartData]);

  // Device distribution data
  const deviceData = useMemo(() => {
    const deviceMap = new Map<string, { temps: number[], hums: number[], count: number }>();
    
    chartData.forEach(d => {
      const key = d.deviceName;
      if (!deviceMap.has(key)) {
        deviceMap.set(key, { temps: [], hums: [], count: 0 });
      }
      const existing = deviceMap.get(key)!;
      existing.temps.push(d.temperature);
      existing.hums.push(d.humidity);
      existing.count++;
    });

    return Array.from(deviceMap.entries()).map(([name, data]) => ({
      name,
      avgTemperature: parseFloat((data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1)),
      avgHumidity: parseFloat((data.hums.reduce((a, b) => a + b, 0) / data.hums.length).toFixed(1)),
      dataPoints: data.count,
      tempRange: Math.max(...data.temps) - Math.min(...data.temps),
      humRange: Math.max(...data.hums) - Math.min(...data.hums)
    }));
  }, [chartData]);

  // Temperature distribution for pie chart
  const tempDistribution = useMemo(() => {
    const ranges = [
      { name: 'Cold (<20°C)', range: [0, 20], color: '#0088FE' },
      { name: 'Cool (20-25°C)', range: [20, 25], color: '#00C49F' },
      { name: 'Normal (25-30°C)', range: [25, 30], color: '#FFBB28' },
      { name: 'Warm (30-35°C)', range: [30, 35], color: '#FF8042' },
      { name: 'Hot (>35°C)', range: [35, 100], color: '#FF6B6B' }
    ];

    const distribution = ranges.map(range => ({
      name: range.name,
      value: chartData.filter(d => d.temperature >= range.range[0] && d.temperature < range.range[1]).length,
      color: range.color
    }));

    return distribution.filter(d => d.value > 0);
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'temperature' ? 'Temperature' : entry.dataKey === 'humidity' ? 'Humidity' : entry.dataKey}: {entry.value}{entry.dataKey === 'temperature' ? '°C' : entry.dataKey === 'humidity' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!chartData.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-lg font-medium">No data available for charts</p>
        <p className="text-sm">Please ensure sensors are connected and sending data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Badge variant="outline">
          {chartData.length} data points from {deviceData.length} devices
        </Badge>
      </div>

      {/* Time Series Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature & Humidity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.slice(-50)}> {/* Show last 50 points to avoid crowding */}
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#FF6B6B" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Temperature (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#4ECDC4" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Humidity (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Average Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="avgTemperature" fill="#FF6B6B" name="Avg Temp (°C)" />
                <Bar dataKey="avgHumidity" fill="#4ECDC4" name="Avg Humidity (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Temperature Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tempDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tempDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Device Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="avgTemperature" fill="#FF6B6B" name="Avg Temperature (°C)" />
              <Bar dataKey="avgHumidity" fill="#4ECDC4" name="Avg Humidity (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Correlation Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature vs Humidity Correlation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="temperature" 
                domain={['dataMin - 2', 'dataMax + 2']}
                name="Temperature"
                unit="°C"
              />
              <YAxis 
                type="number" 
                dataKey="humidity" 
                domain={['dataMin - 5', 'dataMax + 5']}
                name="Humidity"
                unit="%"
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium">{data.deviceName}</p>
                        <p className="text-sm" style={{ color: '#FF6B6B' }}>
                          Temperature: {data.temperature}°C
                        </p>
                        <p className="text-sm" style={{ color: '#4ECDC4' }}>
                          Humidity: {data.humidity}%
                        </p>
                        <p className="text-xs text-gray-500">{data.timestamp}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Data Points" dataKey="humidity" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Area Chart for Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.slice(-30)}> {/* Last 30 readings for trend */}
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="temperature" 
                stroke="#FF6B6B" 
                fill="#FF6B6B"
                fillOpacity={0.3}
                name="Temperature (°C)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}