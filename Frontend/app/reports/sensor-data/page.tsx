"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  Filter,
  Database,
  Thermometer,
  Wind,
  Vibrate,
  CloudDrizzle,
  Droplets,
  Gauge,
  Activity,
  Settings,
  FileSpreadsheet,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  deviceSensorDataApi,
  devicesApi,
  racksApi,
  containmentsApi,
  DeviceSensorData,
} from "@/lib/api-service";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface SensorDataResponse {
  data: DeviceSensorData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: any;
}

interface SensorDataSummary {
  totalRecords: number;
  activeDevices: number;
  sensorTypes: { sensorType: string; count: number }[];
  devicesSummary: {
    deviceId: number;
    deviceName: string;
    latestTimestamp: string;
    recordCount: number;
  }[];
  dateRange: {
    start?: string;
    end?: string;
  };
  generatedAt: string;
}

// Enhanced sensor type visuals with modern design and proper icons
const SENSOR_TYPE_VISUALS = {
  Temperature: {
    icon: Thermometer,
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900",
    borderColor: "border-rose-200 dark:border-rose-800",
    name: "Temperature",
    unit: "°C",
  },
  "Air Flow": {
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-100 dark:bg-sky-900",
    borderColor: "border-sky-200 dark:border-sky-800",
    name: "Air Flow",
    unit: "L/min",
  },
  Vibration: {
    icon: Vibrate,
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900",
    borderColor: "border-violet-200 dark:border-violet-800",
    name: "Vibration",
    unit: "m/s²",
  },
  "Dust Sensor": {
    icon: CloudDrizzle,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    borderColor: "border-amber-200 dark:border-amber-800",
    name: "Dust Level",
    unit: "µg/m³",
  },
  Humidity: {
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
    name: "Humidity",
    unit: "%",
  },
  Pressure: {
    icon: Gauge,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    name: "Pressure",
    unit: "hPa",
  },
};

export default function SensorDataReportsPage() {
  const [sensorData, setSensorData] = useState<DeviceSensorData[]>([]);
  const [summary, setSummary] = useState<SensorDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    deviceId: "all",
    rackId: "all",
    containmentId: "all",
    sensorType: "all",
    startDate: "",
    endDate: "",
    searchTerm: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [availableSensorTypes, setAvailableSensorTypes] = useState<string[]>(
    []
  );
  const [devices, setDevices] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [containments, setContainments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Export modal states
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    sensorType: "all",
    startDate: "",
    endDate: "",
    includeRawData: true,
    includeStats: true,
  });

  // Pagination and sorting states
  const [tablePagination, setTablePagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'timestamp',
    direction: 'desc',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSensorData();
    }
  }, [filters.page, loading]);

  // Reset pagination when active tab changes
  useEffect(() => {
    setTablePagination(prev => ({ ...prev, currentPage: 1 }));
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [
        sensorTypesRes,
        devicesRes,
        racksRes,
        containmentsRes,
        summaryRes,
      ] = await Promise.all([
        deviceSensorDataApi.getAvailableSensorTypes(),
        devicesApi.getDevices(),
        racksApi.getRacks(),
        containmentsApi.getContainments(),
        deviceSensorDataApi.getSensorDataSummary(),
      ]);

      if (sensorTypesRes?.data && Array.isArray(sensorTypesRes.data))
        setAvailableSensorTypes(sensorTypesRes.data || []);
      if (devicesRes?.data && Array.isArray(devicesRes.data))
        setDevices(devicesRes.data || []);
      if (racksRes?.data && Array.isArray(racksRes.data))
        setRacks(racksRes.data || []);
      if (containmentsRes?.data && Array.isArray(containmentsRes.data))
        setContainments(containmentsRes.data || []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch (error: any) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const loadSensorData = async () => {
    try {
      setLoadingData(true);
      const params: any = {
        page: filters.page,
        pageSize: filters.pageSize,
      };

      if (filters.deviceId && filters.deviceId !== "all")
        params.deviceId = parseInt(filters.deviceId);
      if (filters.rackId && filters.rackId !== "all")
        params.rackId = parseInt(filters.rackId);
      if (filters.containmentId && filters.containmentId !== "all")
        params.containmentId = parseInt(filters.containmentId);
      if (filters.sensorType && filters.sensorType !== "all")
        params.sensorType = filters.sensorType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await deviceSensorDataApi.getSensorData(params);

      if (response?.data && Array.isArray(response.data)) {
        setSensorData(response.data || []);
        // Simple pagination calculation since backend now returns direct data
        setPagination({
          currentPage: filters.page,
          pageSize: filters.pageSize,
          totalRecords: response.data.length,
          totalPages: Math.ceil(response.data.length / filters.pageSize),
          hasNextPage: response.data.length >= filters.pageSize,
          hasPreviousPage: filters.page > 1,
        });
      } else {
        throw new Error("Failed to load sensor data");
      }
    } catch (error: any) {
      console.error("Error loading sensor data:", error);
      toast.error(
        "Failed to load sensor data: " + (error.message || "Unknown error")
      );
    } finally {
      setLoadingData(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const applyFilters = () => {
    loadSensorData();
    loadSummaryData();
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 50,
      deviceId: "all",
      rackId: "all",
      containmentId: "all",
      sensorType: "all",
      startDate: "",
      endDate: "",
      searchTerm: "",
    });
    setTimeout(() => {
      loadSensorData();
      loadSummaryData();
    }, 100);
  };

  const loadSummaryData = async () => {
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await deviceSensorDataApi.getSensorDataSummary(params);

      if (response?.data) {
        setSummary(response.data);
      }
    } catch (error: any) {
      console.error("Error loading summary:", error);
      toast.error(
        "Failed to load summary: " + (error.message || "Unknown error")
      );
    }
  };

  const handleFilterPageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), "PPp");
    } catch {
      return timestamp;
    }
  };

  const parsePayload = (payload: string) => {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  };

  const exportToCSV = () => {
    setExportModalOpen(true);
  };

  const handleAdvancedExport = async () => {
    try {
      let dataToExport: DeviceSensorData[] = [];
      
      // Filter data based on export settings
      if (exportSettings.sensorType === "all") {
        dataToExport = sensorData;
      } else {
        dataToExport = getFilteredDataBySensorType(exportSettings.sensorType);
      }

      // Filter by date range if specified
      if (exportSettings.startDate || exportSettings.endDate) {
        dataToExport = dataToExport.filter(item => {
          const itemDate = new Date(item.timestamp);
          const start = exportSettings.startDate ? new Date(exportSettings.startDate) : null;
          const end = exportSettings.endDate ? new Date(exportSettings.endDate) : null;
          
          if (start && itemDate < start) return false;
          if (end && itemDate > end) return false;
          return true;
        });
      }

      if (dataToExport.length === 0) {
        toast.error("No data to export with current filters");
        return;
      }

      const csvData: any[] = [];

      // Add basic data
      dataToExport.forEach((item) => {
        const row: any = {
          "Device Name": item.device?.name || "N/A",
          "Sensor Type": item.sensorType || item.device?.sensorType || "N/A",
          "Containment": item.containment?.name || "N/A",
          "Rack": item.rack?.name || "N/A",
          "Topic": item.topic || "N/A",
          "Timestamp": formatTimestamp(item.timestamp),
        };

        // Add parsed sensor values dengan field names yang benar
        const sensorType = item.sensorType || item.device?.sensorType || "";
        const parsedData = parseEnhancedPayload(item.rawPayload || '{}', sensorType);
        
        if (typeof parsedData.temp === 'number') row["Temperature (°C)"] = parsedData.temp;
        if (typeof parsedData.hum === 'number') row["Humidity (%)"] = parsedData.hum;
        if (typeof parsedData.air_pressure_hpa === 'number') row["Pressure (hPa)"] = parsedData.air_pressure_hpa;
        if (typeof parsedData.air_flow_lpm === 'number') row["Flow Rate (L/min)"] = parsedData.air_flow_lpm;
        if (typeof parsedData.dust_level_ug_m3 === 'number') row["Dust Level (µg/m³)"] = parsedData.dust_level_ug_m3;
        
        // Vibration magnitude calculation
        if (typeof parsedData.vibration_x === 'number' && 
            typeof parsedData.vibration_y === 'number' && 
            typeof parsedData.vibration_z === 'number') {
          const magnitude = Math.sqrt(
            Math.pow(parsedData.vibration_x, 2) + 
            Math.pow(parsedData.vibration_y, 2) + 
            Math.pow(parsedData.vibration_z, 2)
          );
          row["Vibration Magnitude (m/s²)"] = parseFloat(magnitude.toFixed(2));
          row["Vibration X (m/s²)"] = parsedData.vibration_x;
          row["Vibration Y (m/s²)"] = parsedData.vibration_y;
          row["Vibration Z (m/s²)"] = parsedData.vibration_z;
        }

        if (exportSettings.includeRawData) {
          row["Raw Payload"] = item.rawPayload || "N/A";
        }

        csvData.push(row);
      });

      // Add statistics if requested
      if (exportSettings.includeStats && exportSettings.sensorType !== "all") {
        const analytics = calculateSensorAnalytics(dataToExport, exportSettings.sensorType);
        if (analytics) {
          csvData.push({});
          csvData.push({ "Device Name": "STATISTICS" });
          csvData.push({ "Device Name": "Minimum", "Sensor Type": `${analytics.min} ${analytics.unit}` });
          csvData.push({ "Device Name": "Maximum", "Sensor Type": `${analytics.max} ${analytics.unit}` });
          csvData.push({ "Device Name": "Average", "Sensor Type": `${analytics.average} ${analytics.unit}` });
          csvData.push({ "Device Name": "Data Points", "Sensor Type": analytics.count });
        }
      }

      // Create CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvString = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map(header => {
            const field = row[header] || "";
            return typeof field === "string" && field.includes(",")
              ? `"${field.replace(/"/g, '""')}"`
              : field;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const sensorTypeSuffix = exportSettings.sensorType === "all" ? "all-sensors" : exportSettings.sensorType.toLowerCase().replace(/\s+/g, "-");
      const dateSuffix = exportSettings.startDate ? `_${exportSettings.startDate.split("T")[0]}` : "";
      a.download = `sensor-data-${sensorTypeSuffix}${dateSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${dataToExport.length} records to CSV`);
      setExportModalOpen(false);
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV: " + (error.message || "Unknown error"));
    }
  };

  // Helper function to filter data by sensor type
  const getFilteredDataBySensorType = (sensorType: string) => {
    if (sensorType === "all") {
      return sensorData;
    }
    return sensorData.filter((item) => {
      const itemSensorType = item.sensorType || item.device?.sensorType;
      return itemSensorType === sensorType;
    });
  };

  // Helper function to get sensor type counts
  const getSensorTypeCounts = () => {
    const counts: Record<string, number> = {};
    sensorData.forEach((item) => {
      const sensorType = item.sensorType || item.device?.sensorType || "Unknown";
      counts[sensorType] = (counts[sensorType] || 0) + 1;
    });
    return counts;
  };

  // Sorting functions
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
    // Reset to first page when sorting changes
    setTablePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const sortData = (data: DeviceSensorData[]) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortConfig.key) {
        case 'device':
          aValue = a.device?.name || '';
          bValue = b.device?.name || '';
          break;
        case 'type':
          aValue = a.sensorType || a.device?.sensorType || '';
          bValue = b.sensorType || b.device?.sensorType || '';
          break;
        case 'location':
          aValue = `${a.containment?.name || ''}-${a.rack?.name || ''}`;
          bValue = `${b.containment?.name || ''}-${b.rack?.name || ''}`;
          break;
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'topic':
          aValue = a.topic || '';
          bValue = b.topic || '';
          break;
        default:
          // For sensor-specific values
          const aParsed = parseEnhancedPayload(a.rawPayload || '{}', a.sensorType || a.device?.sensorType || '');
          const bParsed = parseEnhancedPayload(b.rawPayload || '{}', b.sensorType || b.device?.sensorType || '');
          aValue = aParsed[sortConfig.key] || 0;
          bValue = bParsed[sortConfig.key] || 0;
          break;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Pagination functions
  const paginateData = (data: DeviceSensorData[]) => {
    const startIndex = (tablePagination.currentPage - 1) * tablePagination.itemsPerPage;
    const endIndex = startIndex + tablePagination.itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / tablePagination.itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setTablePagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setTablePagination(prev => ({ 
      ...prev, 
      itemsPerPage, 
      currentPage: 1 // Reset to first page
    }));
  };

  // Get sensor statistics for a specific sensor type
  const getSensorTypeStats = (sensorType: string) => {
    const data = getFilteredDataBySensorType(sensorType);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentData = data.filter(item => {
      try {
        const itemTime = new Date(item.timestamp);
        return itemTime >= oneHourAgo;
      } catch {
        return false;
      }
    });
    
    const uniqueDevices = new Set(data.map(item => item.deviceId)).size;
    const uniqueLocations = new Set(data.map(item => `${item.containmentId}-${item.rackId}`)).size;
    
    return {
      totalRecords: data.length,
      recentRecords: recentData.length,
      activeDevices: uniqueDevices,
      locations: uniqueLocations,
      lastUpdate: data.length > 0 ? data[0]?.timestamp : null,
    };
  };

  // Calculate sensor data analytics (min, max, average) based on actual data format
  const calculateSensorAnalytics = (data: DeviceSensorData[], sensorType: string) => {
    if (data.length === 0) return null;

    const values: number[] = [];
    // Mapping berdasarkan format data sebenarnya dari containment-average-sensor-tabs.tsx
    const fieldMapping: { [key: string]: string[] } = {
      'Temperature': ['temp', 'hum'], // temp untuk temperature, hum untuk humidity
      'Air Flow': ['air_flow_lpm', 'air_pressure_hpa'], // air flow dan pressure
      'Vibration': ['vibration_magnitude', 'vibration_x', 'vibration_y', 'vibration_z'],
      'Dust': ['dust_level_ug_m3'],
      'Dust Sensor': ['dust_level_ug_m3'],
      'Humidity': ['hum', 'temp'], // humidity primary, temperature secondary
      'Pressure': ['air_pressure_hpa'],
    };

    const primaryFields = fieldMapping[sensorType] || [];
    
    data.forEach(item => {
      try {
        const parsed = parseEnhancedPayload(item.rawPayload || '{}', sensorType);
        
        // Untuk vibration, kalkulasi magnitude jika ada x,y,z components
        if (sensorType === 'Vibration' && parsed.vibration_x !== undefined && 
            parsed.vibration_y !== undefined && parsed.vibration_z !== undefined) {
          const magnitude = Math.sqrt(
            Math.pow(parsed.vibration_x, 2) + 
            Math.pow(parsed.vibration_y, 2) + 
            Math.pow(parsed.vibration_z, 2)
          );
          if (magnitude > 0) values.push(magnitude);
        } else {
          // Regular field extraction
          primaryFields.forEach(field => {
            if (typeof parsed[field] === 'number' && parsed[field] > 0) {
              values.push(parsed[field]);
            }
          });
        }
      } catch {
        // Skip invalid data
      }
    });

    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];

    return {
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      average: parseFloat(average.toFixed(2)),
      count: values.length,
      unit: visual?.unit || '',
    };
  };

  // Enhanced payload parser with sensor-specific parsing
  const parseEnhancedPayload = (payload: string, sensorType: string) => {
    try {
      const parsed = JSON.parse(payload);
      const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
      
      // If it's a simple value, try to format it with the appropriate unit
      if (typeof parsed === 'number') {
        return {
          value: parsed,
          formattedValue: `${parsed}${visual?.unit ? ' ' + visual.unit : ''}`,
          unit: visual?.unit || '',
          type: 'simple'
        };
      }
      
      // If it's an object, try to extract meaningful sensor data
      if (typeof parsed === 'object' && parsed !== null) {
        const result: any = { ...parsed, type: 'complex' };
        
        // Add formatted values for common sensor data fields
        if (sensorType === 'Temperature' && typeof parsed.temperature === 'number') {
          result.formattedTemperature = `${parsed.temperature}°C`;
        }
        if (sensorType === 'Humidity' && typeof parsed.humidity === 'number') {
          result.formattedHumidity = `${parsed.humidity}%`;
        }
        if (sensorType === 'Pressure' && typeof parsed.pressure === 'number') {
          result.formattedPressure = `${parsed.pressure} hPa`;
        }
        if (sensorType === 'Air Flow' && typeof parsed.flow === 'number') {
          result.formattedFlow = `${parsed.flow} L/min`;
        }
        if (sensorType === 'Vibration' && typeof parsed.vibration === 'number') {
          result.formattedVibration = `${parsed.vibration} m/s²`;
        }
        if (sensorType === 'Dust Sensor' && typeof parsed.dust === 'number') {
          result.formattedDust = `${parsed.dust} µg/m³`;
        }
        
        return result;
      }
      
      return { rawValue: parsed, type: 'raw' };
    } catch {
      return { rawValue: payload, type: 'unparseable' };
    }
  };

  // Get sensor-specific table headers berdasarkan format data sebenarnya
  const getSensorTableHeaders = (sensorType: string) => {
    const baseHeaders = [
      { key: 'device', label: 'Device' },
      { key: 'type', label: 'Type' },
      { key: 'location', label: 'Location' },
      { key: 'timestamp', label: 'Timestamp' },
    ];

    if (sensorType === 'all') {
      return [...baseHeaders, { key: 'topic', label: 'Topic' }, { key: 'data', label: 'Sensor Data' }];
    }

    // Add sensor-specific columns berdasarkan format data aktual
    const sensorColumns: { [key: string]: { key: string; label: string }[] } = {
      'Temperature': [
        { key: 'temp', label: 'Temperature (°C)' }, // menggunakan 'temp' bukan 'temperature'
        { key: 'hum', label: 'Humidity (%)' }, // menggunakan 'hum' bukan 'humidity'
      ],
      'Humidity': [
        { key: 'hum', label: 'Humidity (%)' }, // primary field
        { key: 'temp', label: 'Temperature (°C)' }, // secondary field
      ],
      'Pressure': [
        { key: 'air_pressure_hpa', label: 'Pressure (hPa)' }, // menggunakan 'air_pressure_hpa'
      ],
      'Air Flow': [
        { key: 'air_flow_lpm', label: 'Flow Rate (L/min)' }, // menggunakan 'air_flow_lpm'
        { key: 'air_pressure_hpa', label: 'Pressure (hPa)' }, // pressure juga ada di air flow sensor
      ],
      'Vibration': [
        { key: 'vibration_magnitude', label: 'Magnitude (m/s²)' }, // calculated magnitude
        { key: 'vibration_x', label: 'X-axis (m/s²)' },
        { key: 'vibration_y', label: 'Y-axis (m/s²)' },
        { key: 'vibration_z', label: 'Z-axis (m/s²)' },
      ],
      'Dust': [
        { key: 'dust_level_ug_m3', label: 'Dust Level (µg/m³)' }, // menggunakan 'dust_level_ug_m3'
      ],
      'Dust Sensor': [
        { key: 'dust_level_ug_m3', label: 'Dust Level (µg/m³)' }, // sama dengan Dust
      ],
    };

    const specificColumns = sensorColumns[sensorType] || [];
    return [...baseHeaders, ...specificColumns, { key: 'rawData', label: 'Raw Data' }];
  };

  // Component for rendering sensor type summary
  const SensorTypeSummary = ({ sensorType }: { sensorType: string }) => {
    const stats = getSensorTypeStats(sensorType);
    const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
    const analytics = calculateSensorAnalytics(getFilteredDataBySensorType(sensorType), sensorType);
    
    if (!visual || stats.totalRecords === 0) return null;
    
    const IconComponent = visual.icon;
    
    return (
      <div className="mb-6 space-y-4">
        <Card className={`${visual.borderColor} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${visual.bgColor}`}>
                  <IconComponent className={`h-8 w-8 ${visual.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{visual.name} Overview</h3>
                  <p className="text-sm text-muted-foreground">Real-time sensor monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-2xl font-bold">{stats.totalRecords}</div>
                  <div className="text-xs text-muted-foreground">Total Records</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.recentRecords}</div>
                  <div className="text-xs text-muted-foreground">Last Hour</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.activeDevices}</div>
                  <div className="text-xs text-muted-foreground">Active Devices</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.locations}</div>
                  <div className="text-xs text-muted-foreground">Locations</div>
                </div>
              </div>
            </div>
            {stats.lastUpdate && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Last updated: {formatTimestamp(stats.lastUpdate)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                {visual.name} Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-500">{analytics.min}</div>
                  <div className="text-sm text-muted-foreground">Min {analytics.unit}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{analytics.max}</div>
                  <div className="text-sm text-muted-foreground">Max {analytics.unit}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{analytics.average}</div>
                  <div className="text-sm text-muted-foreground">Avg {analytics.unit}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{analytics.count}</div>
                  <div className="text-sm text-muted-foreground">Data Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  // Component for rendering sensor data table
  const SensorDataTable = ({ data, sensorType }: { data: DeviceSensorData[], sensorType: string }) => {
    const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
    const headers = getSensorTableHeaders(sensorType);
    
    // Apply sorting and pagination
    const sortedData = sortData(data);
    const paginatedData = paginateData(sortedData);
    const totalPages = getTotalPages(sortedData.length);
    
    const renderSensorValue = (item: DeviceSensorData, columnKey: string) => {
      const parsedData = parseEnhancedPayload(item.rawPayload || '{}', item.sensorType || item.device?.sensorType || sensorType);
      
      switch (columnKey) {
        case 'temp':
          if (typeof parsedData.temp === 'number') {
            return <span className="font-mono text-rose-600 dark:text-rose-400">{parsedData.temp}°C</span>;
          }
          break;
        case 'hum':
          if (typeof parsedData.hum === 'number') {
            return <span className="font-mono text-blue-600 dark:text-blue-400">{parsedData.hum}%</span>;
          }
          break;
        case 'air_pressure_hpa':
          if (typeof parsedData.air_pressure_hpa === 'number') {
            return <span className="font-mono text-emerald-600 dark:text-emerald-400">{parsedData.air_pressure_hpa} hPa</span>;
          }
          break;
        case 'air_flow_lpm':
          if (typeof parsedData.air_flow_lpm === 'number') {
            return <span className="font-mono text-sky-600 dark:text-sky-400">{parsedData.air_flow_lpm} L/min</span>;
          }
          break;
        case 'vibration_magnitude':
          // Calculate magnitude from x, y, z components
          if (typeof parsedData.vibration_x === 'number' && 
              typeof parsedData.vibration_y === 'number' && 
              typeof parsedData.vibration_z === 'number') {
            const magnitude = Math.sqrt(
              Math.pow(parsedData.vibration_x, 2) + 
              Math.pow(parsedData.vibration_y, 2) + 
              Math.pow(parsedData.vibration_z, 2)
            );
            return <span className="font-mono text-violet-600 dark:text-violet-400">{magnitude.toFixed(2)} m/s²</span>;
          }
          break;
        case 'vibration_x':
          if (typeof parsedData.vibration_x === 'number') {
            return <span className="font-mono text-violet-600 dark:text-violet-400">{parsedData.vibration_x} m/s²</span>;
          }
          break;
        case 'vibration_y':
          if (typeof parsedData.vibration_y === 'number') {
            return <span className="font-mono text-violet-600 dark:text-violet-400">{parsedData.vibration_y} m/s²</span>;
          }
          break;
        case 'vibration_z':
          if (typeof parsedData.vibration_z === 'number') {
            return <span className="font-mono text-violet-600 dark:text-violet-400">{parsedData.vibration_z} m/s²</span>;
          }
          break;
        case 'dust_level_ug_m3':
          if (typeof parsedData.dust_level_ug_m3 === 'number') {
            return <span className="font-mono text-amber-600 dark:text-amber-400">{parsedData.dust_level_ug_m3} µg/m³</span>;
          }
          break;
        default:
          return <span className="text-muted-foreground text-xs">—</span>;
      }
      return <span className="text-muted-foreground text-xs">—</span>;
    };
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {visual && (
                <visual.icon className={`h-6 w-6 ${visual.color}`} />
              )}
              <span>
                {sensorType === "all" ? "All Sensor Data" : `${visual?.name || sensorType} Data`}
              </span>
              <Badge variant="secondary" className="ml-2">
                {data.length} records
              </Badge>
            </div>
            
            {/* Quick sorting actions */}
            <div className="flex items-center gap-2">
              {sortConfig.key && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Sorted by:</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {headers.find(h => h.key === sortConfig.key)?.label || sortConfig.key}
                    {sortConfig.direction === 'asc' ? 
                      <ChevronUp className="h-3 w-3" /> : 
                      <ChevronDown className="h-3 w-3" />
                    }
                  </Badge>
                </div>
              )}
              
              {/* Quick sort buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('timestamp')}
                  className="h-8 px-2 text-xs"
                  title="Sort by timestamp"
                >
                  <Calendar className="h-3 w-3" />
                  {sortConfig.key === 'timestamp' && sortConfig.direction === 'desc' ? 
                    <ChevronDown className="h-3 w-3 ml-1" /> : 
                    <ChevronUp className="h-3 w-3 ml-1" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('device')}
                  className="h-8 px-2 text-xs"
                  title="Sort by device"
                >
                  Device
                  {sortConfig.key === 'device' && sortConfig.direction === 'desc' ? 
                    <ChevronDown className="h-3 w-3 ml-1" /> : 
                    <ChevronUp className="h-3 w-3 ml-1" />
                  }
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead 
                      key={header.key} 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort(header.key)}
                    >
                      <div className="flex items-center gap-2">
                        {header.label}
                        {renderSortIcon(header.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      {headers.map((header) => (
                        <TableCell key={header.key}>
                          {header.key === 'device' && (
                            <div>
                              <div className="font-medium">
                                {item.device?.name || "Unknown Device"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {item.deviceId}
                              </div>
                            </div>
                          )}
                          {header.key === 'type' && (
                            <Badge variant="secondary" className={visual?.color}>
                              {item.sensorType || item.device?.sensorType || "Unknown"}
                            </Badge>
                          )}
                          {header.key === 'location' && (
                            <div className="text-sm">
                              <div>{item.containment?.name || "Unknown"}</div>
                              <div className="text-muted-foreground">
                                {item.rack?.name || "Unknown"}
                              </div>
                            </div>
                          )}
                          {header.key === 'topic' && (
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-32 truncate block">
                              {item.topic || "N/A"}
                            </code>
                          )}
                          {header.key === 'timestamp' && (
                            <span className="text-sm">
                              {formatTimestamp(item.timestamp)}
                            </span>
                          )}
                          {header.key === 'data' && sensorType === 'all' && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                View Payload
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded max-w-xs overflow-auto whitespace-pre-wrap text-xs">
                                {JSON.stringify(parsePayload(item.rawPayload), null, 2)}
                              </pre>
                            </details>
                          )}
                          {header.key === 'rawData' && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Raw JSON
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded max-w-xs overflow-auto whitespace-pre-wrap text-xs">
                                {JSON.stringify(parsePayload(item.rawPayload), null, 2)}
                              </pre>
                            </details>
                          )}
                          {!['device', 'type', 'location', 'topic', 'timestamp', 'data', 'rawData'].includes(header.key) && 
                            renderSensorValue(item, header.key)
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="text-center py-8 text-muted-foreground">
                      {loadingData ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading sensor data...
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mb-4 flex justify-center">
                            {visual?.icon ? (
                              <visual.icon className={`h-16 w-16 ${visual.color} opacity-50`} />
                            ) : (
                              <Database className="h-16 w-16 text-gray-400 opacity-50" />
                            )}
                          </div>
                          <p className="text-lg font-medium">No {sensorType === "all" ? "sensor" : sensorType.toLowerCase()} data found</p>
                          <p className="text-sm">Try adjusting your filters or date range</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {sortedData.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Items per page:</Label>
                <Select
                  value={tablePagination.itemsPerPage.toString()}
                  onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Showing {((tablePagination.currentPage - 1) * tablePagination.itemsPerPage) + 1} to{' '}
                  {Math.min(tablePagination.currentPage * tablePagination.itemsPerPage, sortedData.length)} of{' '}
                  {sortedData.length} entries
                </span>
              </div>

              {/* Pagination buttons */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(tablePagination.currentPage - 1)}
                        className={tablePagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and adjacent pages
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - tablePagination.currentPage) <= 1;
                      })
                      .map((page, index, filteredPages) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore = index > 0 && page - filteredPages[index - 1] > 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={page === tablePagination.currentPage}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        );
                      })}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(tablePagination.currentPage + 1)}
                        className={tablePagination.currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <Database className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Sensor Data Reports
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={applyFilters}
            variant="outline"
            size="sm"
            disabled={loadingData}
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`}
            />
            <span className="sr-only md:not-sr-only md:ml-2">Refresh</span>
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            disabled={sensorData.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="sr-only md:not-sr-only md:ml-2">Advanced Export</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 p-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              All Data
              <Badge variant="secondary" className="text-xs ml-1">
                {sensorData.length}
              </Badge>
            </TabsTrigger>
            
            {Object.entries(getSensorTypeCounts()).map(([sensorType, count]) => {
              const visual = SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS];
              if (count === 0) return null;
              
              return (
                <TabsTrigger key={sensorType} value={sensorType} className="flex items-center gap-2">
                  {visual?.icon ? (
                    <visual.icon className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  {visual?.name || sensorType}
                  <Badge variant="outline" className="text-xs ml-1">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
            
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts
            </TabsTrigger>
          </TabsList>

          {/* All Data Tab */}
          <TabsContent value="all" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="deviceId">Device</Label>
                    <Select
                      value={filters.deviceId}
                      onValueChange={(value) =>
                        handleFilterChange("deviceId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All devices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All devices</SelectItem>
                        {Array.isArray(devices) &&
                          devices.map((device) => (
                            <SelectItem
                              key={device.id}
                              value={device.id.toString()}
                            >
                              {device.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sensorType">Sensor Type</Label>
                    <Select
                      value={filters.sensorType}
                      onValueChange={(value) =>
                        handleFilterChange("sensorType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {Array.isArray(availableSensorTypes) &&
                          availableSensorTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="containmentId">Containment</Label>
                    <Select
                      value={filters.containmentId}
                      onValueChange={(value) =>
                        handleFilterChange("containmentId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All containments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All containments</SelectItem>
                        {Array.isArray(containments) &&
                          containments.map((containment) => (
                            <SelectItem
                              key={containment.id}
                              value={containment.id.toString()}
                            >
                              {containment.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rackId">Rack</Label>
                    <Select
                      value={filters.rackId}
                      onValueChange={(value) =>
                        handleFilterChange("rackId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All racks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All racks</SelectItem>
                        {Array.isArray(racks) &&
                          racks.map((rack) => (
                            <SelectItem
                              key={rack.id}
                              value={rack.id.toString()}
                            >
                              {rack.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={filters.startDate}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={filters.endDate}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex items-end gap-2 col-span-full md:col-span-1 lg:col-span-2">
                    <Button
                      onClick={applyFilters}
                      className="flex-1"
                      disabled={loadingData}
                    >
                      {loadingData ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Apply Filters
                    </Button>
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="flex-1"
                      disabled={loadingData}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <SensorDataTable data={getFilteredDataBySensorType("all")} sensorType="all" />
          </TabsContent>

          {/* Individual Sensor Type Tabs */}
          {Object.keys(SENSOR_TYPE_VISUALS).map((sensorType) => {
            const data = getFilteredDataBySensorType(sensorType);
            if (data.length === 0) return null;
            
            return (
              <TabsContent key={sensorType} value={sensorType} className="space-y-6">
                <SensorTypeSummary sensorType={sensorType} />
                <SensorDataTable data={data} sensorType={sensorType} />
              </TabsContent>
            );
          })}

          <TabsContent value="summary" className="space-y-6">
            {summary && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.totalRecords?.toLocaleString() ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Total Records</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.activeDevices ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Active Devices</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.sensorTypes?.length ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Sensor Types</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold">
                        {summary?.devicesSummary?.length ?? "0"}
                      </div>
                      <p className="text-muted-foreground">Reporting Devices</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sensor Types Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary?.sensorTypes &&
                        summary.sensorTypes.length > 0 ? (
                          summary.sensorTypes.map((type) => (
                            <div
                              key={type.sensorType}
                              className="flex items-center justify-between"
                            >
                              <Badge variant="outline">
                                {type.sensorType || "Unknown"}
                              </Badge>
                              <span className="font-medium">
                                {type.count?.toLocaleString() || 0}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            No sensor types available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-auto">
                        {summary?.devicesSummary &&
                        summary.devicesSummary.length > 0 ? (
                          summary.devicesSummary.map((device) => (
                            <div
                              key={device.deviceId}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <div className="font-medium">
                                  {device.deviceName || "Unknown Device"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Last:{" "}
                                  {formatTimestamp(device.latestTimestamp)}
                                </div>
                              </div>
                              <Badge>
                                {device.recordCount?.toLocaleString() || 0}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            No device activity data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select a device and date range to view sensor data charts.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Advanced Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Advanced Export Settings
            </DialogTitle>
            <DialogDescription>
              Configure your export preferences for sensor data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sensor Type Selection */}
            <div>
              <Label htmlFor="exportSensorType">Sensor Type</Label>
              <Select
                value={exportSettings.sensorType}
                onValueChange={(value) =>
                  setExportSettings(prev => ({ ...prev, sensorType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sensor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sensor Types</SelectItem>
                  {Object.entries(getSensorTypeCounts()).map(([sensorType, count]) => (
                    <SelectItem key={sensorType} value={sensorType}>
                      {SENSOR_TYPE_VISUALS[sensorType as keyof typeof SENSOR_TYPE_VISUALS]?.name || sensorType} ({count} records)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exportStartDate">Start Date</Label>
                <Input
                  id="exportStartDate"
                  type="datetime-local"
                  value={exportSettings.startDate}
                  onChange={(e) =>
                    setExportSettings(prev => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="exportEndDate">End Date</Label>
                <Input
                  id="exportEndDate"
                  type="datetime-local"
                  value={exportSettings.endDate}
                  onChange={(e) =>
                    setExportSettings(prev => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              <Label>Export Options</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeRawData}
                    onChange={(e) =>
                      setExportSettings(prev => ({ ...prev, includeRawData: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Include raw payload data</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeStats}
                    onChange={(e) =>
                      setExportSettings(prev => ({ ...prev, includeStats: e.target.checked }))
                    }
                    className="rounded border-gray-300"
                    disabled={exportSettings.sensorType === "all"}
                  />
                  <span className="text-sm">
                    Include statistics (min/max/average)
                    {exportSettings.sensorType === "all" && (
                      <span className="text-muted-foreground"> - only for specific sensor types</span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            {/* Preview Info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Export Preview:</strong><br/>
                Sensor: {exportSettings.sensorType === "all" ? "All Types" : 
                  (SENSOR_TYPE_VISUALS[exportSettings.sensorType as keyof typeof SENSOR_TYPE_VISUALS]?.name || exportSettings.sensorType)}<br/>
                {exportSettings.startDate && `From: ${new Date(exportSettings.startDate).toLocaleString()}`}<br/>
                {exportSettings.endDate && `To: ${new Date(exportSettings.endDate).toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdvancedExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
