"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Battery,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlignEndVertical,
} from "lucide-react";
import { mqttClient } from "@/lib/mqtt";
import { toast } from "sonner";
import { racksApi, Rack } from "@/lib/api-service";

// Enhanced power metrics visuals with modern design and dynamic colors
const POWER_METRIC_VISUALS = {
  Power: {
    icon: Zap,
    shortName: "POWER",
    unit: "kW",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
    criticalRange: [6, Infinity],
    warningRange: [4, 6],
    normalRange: [0, 4],
  },
  Energy: {
    icon: Battery,
    shortName: "ENERGY",
    unit: "kWh",
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900",
    borderColor: "border-green-200 dark:border-green-800",
  },
  Current: {
    icon: Activity,
    shortName: "CURRENT",
    unit: "A",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900",
    borderColor: "border-orange-200 dark:border-orange-800",
    criticalRange: [25, Infinity],
    warningRange: [20, 25],
    normalRange: [0, 20],
  },
};

// Power data interface matching MQTT payload
interface PowerData {
  power_consumption_kw: number;
  total_power_kwh: number;
  total_ampere: number;
  timestamp: string;
}

// PDU status interface for each power unit
interface PDUStatus {
  id: number;
  topic: string;
  name: string;
  data: PowerData | null;
  connected: boolean;
  lastUpdate: Date | null;
}

// Component props
interface ContainmentPowerManagementTabsProps {
  className?: string;
}

function ContainmentPowerManagementTabs({ className }: ContainmentPowerManagementTabsProps) {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [pduStatuses, setPduStatuses] = useState<PDUStatus[]>([]);

  // Load racks data and initialize PDU statuses
  useEffect(() => {
    const loadRacks = async () => {
      try {
        const result = await racksApi.getRacks();
        if (result.success && result.data) {
          setRacks(result.data);

          // Initialize PDU statuses based on actual racks
          const dynamicPduStatuses: PDUStatus[] = [
            {
              id: 1,
              topic: "Containment/PDU/Power_1",
              name: result.data[0] ? `PDU ${result.data[0].name}` : "PDU Server Room A",
              data: null,
              connected: false,
              lastUpdate: null,
            },
            {
              id: 2,
              topic: "Containment/PDU/Power_2",
              name: result.data[1] ? `PDU ${result.data[1].name}` : "PDU Server Room B",
              data: null,
              connected: false,
              lastUpdate: null,
            },
            {
              id: 3,
              topic: "Containment/PDU/Power_3",
              name: result.data[2] ? `PDU ${result.data[2].name}` : "PDU Network Room",
              data: null,
              connected: false,
              lastUpdate: null,
            },
            {
              id: 4,
              topic: "Containment/PDU/Power_4",
              name: result.data[3] ? `PDU ${result.data[3].name}` : "PDU Storage Room",
              data: null,
              connected: false,
              lastUpdate: null,
            },
          ];
          setPduStatuses(dynamicPduStatuses);
        }
      } catch (error) {
        console.error("Failed to load racks:", error);
        // Fallback to default names
        setPduStatuses([
          {
            id: 1,
            topic: "Containment/PDU/Power_1",
            name: "PDU Server Room A",
            data: null,
            connected: false,
            lastUpdate: null,
          },
          {
            id: 2,
            topic: "Containment/PDU/Power_2",
            name: "PDU Server Room B",
            data: null,
            connected: false,
            lastUpdate: null,
          },
          {
            id: 3,
            topic: "Containment/PDU/Power_3",
            name: "PDU Network Room",
            data: null,
            connected: false,
            lastUpdate: null,
          },
          {
            id: 4,
            topic: "Containment/PDU/Power_4",
            name: "PDU Storage Room",
            data: null,
            connected: false,
            lastUpdate: null,
          },
        ]);
      }
    };

    loadRacks();
  }, []);

  // MQTT connection setup
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

  // Subscribe to all PDU topics
  useEffect(() => {
    if (!mqttConnected) return;

    const callbacks: ((topic: string, message: string) => void)[] = [];

    pduStatuses.forEach((pdu) => {
      const callback = (topic: string, message: string) => {
        if (topic === pdu.topic) {
          try {
            const powerData: PowerData = JSON.parse(message);

            setPduStatuses((prev) =>
              prev.map((item) =>
                item.id === pdu.id
                  ? {
                      ...item,
                      data: powerData,
                      connected: true,
                      lastUpdate: new Date(),
                    }
                  : item
              )
            );

            // Check for abnormal power readings
            if (powerData.total_ampere > 20) {
              toast.warning(`High Current Detected: ${pdu.name}`, {
                description: `${powerData.total_ampere.toFixed(2)}A - Monitor power consumption`,
              });
            }

            if (powerData.power_consumption_kw > 5) {
              toast.warning(`High Power Load: ${pdu.name}`, {
                description: `${powerData.power_consumption_kw.toFixed(2)}kW - Check system load`,
              });
            }
          } catch (error) {
            console.error(`Failed to parse MQTT power data for ${topic}:`, error);
            toast.error(`Data parsing error for ${pdu.name}`);
          }
        }
      };

      mqttClient.subscribe(pdu.topic, callback);
      callbacks.push(callback);
    });

    return () => {
      pduStatuses.forEach((pdu, index) => {
        if (mqttClient.unsubscribe && callbacks[index]) {
          try {
            mqttClient.unsubscribe(pdu.topic, callbacks[index]);
          } catch (error) {
            console.error(`Failed to unsubscribe from ${pdu.topic}:`, error);
          }
        }
      });
    };
  }, [mqttConnected, pduStatuses]);

  // Calculate totals and averages
  const calculateTotals = useCallback(() => {
    const connectedPdus = pduStatuses.filter(pdu => pdu.connected && pdu.data);
    if (connectedPdus.length === 0) return null;

    const totalConsumption = connectedPdus.reduce((sum, pdu) => sum + (pdu.data?.power_consumption_kw || 0), 0);
    const totalEnergy = connectedPdus.reduce((sum, pdu) => sum + (pdu.data?.total_power_kwh || 0), 0);
    const totalCurrent = connectedPdus.reduce((sum, pdu) => sum + (pdu.data?.total_ampere || 0), 0);
    const avgConsumption = totalConsumption / connectedPdus.length;

    return {
      totalConsumption: totalConsumption.toFixed(2),
      totalEnergy: totalEnergy.toFixed(2),
      totalCurrent: totalCurrent.toFixed(2),
      avgConsumption: avgConsumption.toFixed(2),
      connectedCount: connectedPdus.length,
    };
  }, [pduStatuses]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset connection status to trigger reconnection
    setPduStatuses(prev => prev.map(pdu => ({ ...pdu, connected: false })));

    setTimeout(() => {
      setRefreshing(false);
      toast.success("Power management status refreshed");
    }, 1000);
  }, []);

  const totals = calculateTotals();

  // Enhanced status styling with modern glassmorphism and better colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-400/15 border-emerald-500/30 dark:border-emerald-400/30";
      case "warning":
        return "text-amber-700 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/30 dark:border-amber-400/30";
      case "critical":
        return "text-red-700 dark:text-red-300 bg-red-500/15 dark:bg-red-400/15 border-red-500/30 dark:border-red-400/30";
      case "offline":
        return "text-gray-600 dark:text-gray-400 bg-gray-500/15 dark:bg-gray-400/15 border-gray-500/30 dark:border-gray-400/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10 border-gray-500/20 dark:border-gray-400/20";
    }
  };

  // Enhanced value-based color styling for power readings
  const getValueBasedColor = (
    value: number,
    metricType: string,
    status: string = "normal"
  ) => {
    const baseColors = getStatusColor(status);

    switch (metricType) {
      case "Power":
        if (value >= 6) {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        } else if (value >= 4) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else if (value >= 3) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 2) {
          return "text-blue-700 dark:text-blue-300 bg-gradient-to-br from-blue-500/15 to-sky-500/15 dark:from-blue-400/15 dark:to-sky-400/15 border-blue-500/30 dark:border-blue-400/30";
        } else {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        }

      case "Current":
        if (value >= 25) {
          return "text-red-800 dark:text-red-200 bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 border-red-500/40 dark:border-red-400/40";
        } else if (value >= 20) {
          return "text-red-700 dark:text-red-300 bg-gradient-to-br from-red-500/15 to-orange-500/15 dark:from-red-400/15 dark:to-orange-400/15 border-red-500/30 dark:border-red-400/30";
        } else if (value >= 18) {
          return "text-amber-700 dark:text-amber-300 bg-gradient-to-br from-amber-500/15 to-yellow-500/15 dark:from-amber-400/15 dark:to-yellow-400/15 border-amber-500/30 dark:border-amber-400/30";
        } else if (value >= 15) {
          return "text-blue-700 dark:text-blue-300 bg-gradient-to-br from-blue-500/15 to-sky-500/15 dark:from-blue-400/15 dark:to-sky-400/15 border-blue-500/30 dark:border-blue-400/30";
        } else {
          return "text-emerald-700 dark:text-emerald-300 bg-gradient-to-br from-emerald-500/15 to-green-500/15 dark:from-emerald-400/15 dark:to-green-400/15 border-emerald-500/30 dark:border-emerald-400/30";
        }

      default:
        return baseColors;
    }
  };

  // Modern status icons with better visual hierarchy
  const getStatusIcon = (status: string, size: "sm" | "md" | "lg" = "sm") => {
    const iconSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };
    const iconClass = iconSizes[size];

    switch (status) {
      case "normal":
        return (
          <CheckCircle2
            className={`${iconClass} text-emerald-600 drop-shadow-sm`}
          />
        );
      case "warning":
        return (
          <AlertTriangle
            className={`${iconClass} text-amber-600 drop-shadow-sm`}
          />
        );
      case "critical":
        return (
          <AlertTriangle
            className={`${iconClass} text-red-600 drop-shadow-sm animate-pulse`}
          />
        );
      case "offline":
        return <WifiOff className={`${iconClass} text-slate-500 drop-shadow-sm`} />;
      default:
        return <Clock className={`${iconClass} text-slate-400 drop-shadow-sm`} />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Power Distribution Unit (PDU) Management
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge
              variant={mqttConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {mqttConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Total Power
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {totals?.totalConsumption || "0.00"} kW
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Battery className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Energy Usage
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {totals?.totalEnergy || "0.00"} kWh
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Total Current
                  </p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {totals?.totalCurrent || "0.00"} A
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Connected PDUs
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {totals?.connectedCount || 0}/4
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDU Status Grid - 4 Column Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pduStatuses.map((pdu) => (
            <Card key={pdu.id} className="border">
              <CardContent className="p-6 flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-semibold truncate">
                      {pdu.name.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  <Badge
                    variant={pdu.connected ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {pdu.connected ? "Online" : "Offline"}
                  </Badge>
                </div>

                {/* Power Data Section */}
                {pdu.data ? (
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Power Consumption */}
                    <div className="flex flex-col items-start p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border relative">
                      <div className="text-base font-bold text-muted-foreground mb-1">Power</div>
                      <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {pdu.data.power_consumption_kw.toFixed(1)}
                        </div>
                        <div className="text-lg text-muted-foreground font-medium">kW</div>
                      </div>
                      <AlignEndVertical className="absolute bottom-2 right-2 h-4 w-4 text-blue-500/60 dark:text-blue-400/60" />
                    </div>

                    {/* Energy Usage */}
                    <div className="flex flex-col items-start p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border relative">
                      <div className="text-base font-bold text-muted-foreground mb-1">Energy</div>
                      <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {pdu.data.total_power_kwh.toFixed(0)}
                        </div>
                        <div className="text-lg text-muted-foreground font-medium">kWh</div>
                      </div>
                      <AlignEndVertical className="absolute bottom-2 right-2 h-4 w-4 text-green-500/60 dark:text-green-400/60" />
                    </div>

                    {/* Current */}
                    <div className="flex flex-col items-start p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border relative">
                      <div className="text-base font-bold text-muted-foreground mb-1">Current</div>
                      <div className="flex items-baseline gap-1">
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {pdu.data.total_ampere.toFixed(1)}
                        </div>
                        <div className="text-lg text-muted-foreground font-medium">A</div>
                      </div>
                      <AlignEndVertical className="absolute bottom-2 right-2 h-4 w-4 text-orange-500/60 dark:text-orange-400/60" />
                    </div>

                    {/* Last Updated */}
                    <div className="flex flex-col items-start mt-auto pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Last Updated
                      </div>
                      <div className="text-xs font-medium text-foreground">
                        {pdu.lastUpdate?.toLocaleTimeString() || 'Never'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <div className="text-sm text-center">No data available</div>
                    <div className="text-xs mt-2 text-center">MQTT: {pdu.topic}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ContainmentPowerManagementTabs);
