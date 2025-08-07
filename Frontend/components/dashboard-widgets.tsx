"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Thermometer, 
  Zap, 
  Wifi, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Network
} from "lucide-react";

// System Status Widget
export function SystemStatusWidget() {
  const systemMetrics = [
    { name: "CPU Usage", value: 45, icon: Activity, color: "text-blue-600" },
    { name: "Memory", value: 68, icon: Database, color: "text-green-600" },
    { name: "Temperature", value: 72, icon: Thermometer, color: "text-orange-600" },
    { name: "Network", value: 88, icon: Network, color: "text-purple-600" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Performance
        </CardTitle>
        <CardDescription>Real-time system metrics and performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemMetrics.map((metric) => (
            <div key={metric.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last updated:</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Connectivity Status Widget
export function ConnectivityWidget() {
  const connections = [
    { name: "MQTT Broker", status: "connected", latency: "12ms", icon: Wifi },
    { name: "Database", status: "connected", latency: "5ms", icon: Database },
    { name: "External API", status: "disconnected", latency: "timeout", icon: Network },
    { name: "Security Service", status: "connected", latency: "8ms", icon: Shield }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'disconnected': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Connectivity Status
        </CardTitle>
        <CardDescription>Connection status for all external services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connections.map((connection) => {
            const StatusIcon = getStatusIcon(connection.status);
            return (
              <div key={connection.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <connection.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{connection.name}</div>
                    <div className="text-xs text-muted-foreground">Latency: {connection.latency}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${getStatusColor(connection.status)}`} />
                  <Badge 
                    variant={connection.status === 'connected' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {connection.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Alert Summary Widget
export function AlertSummaryWidget() {
  const alerts = [
    { type: "critical", count: 2, color: "bg-red-500", textColor: "text-red-600" },
    { type: "warning", count: 5, color: "bg-yellow-500", textColor: "text-yellow-600" },
    { type: "info", count: 12, color: "bg-blue-500", textColor: "text-blue-600" }
  ];

  const recentAlerts = [
    { message: "High temperature in Rack A-01", time: "2 min ago", severity: "critical" },
    { message: "MQTT connection unstable", time: "5 min ago", severity: "warning" },
    { message: "Backup completed successfully", time: "15 min ago", severity: "info" },
    { message: "New device detected", time: "23 min ago", severity: "info" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          System Alerts
        </CardTitle>
        <CardDescription>Current alerts and recent system notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {alerts.map((alert) => (
            <div key={alert.type} className="text-center">
              <div className={`w-12 h-12 rounded-full ${alert.color} flex items-center justify-center mx-auto mb-2`}>
                <span className="text-white font-bold text-lg">{alert.count}</span>
              </div>
              <div className="text-sm font-medium capitalize">{alert.type}</div>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium mb-2">Recent Alerts</h4>
          {recentAlerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex-1">
                <div className="text-sm">{alert.message}</div>
                <div className="text-xs text-muted-foreground">{alert.time}</div>
              </div>
              <Badge 
                variant={alert.severity === 'critical' ? 'destructive' : 
                        alert.severity === 'warning' ? 'secondary' : 'default'}
                className="text-xs"
              >
                {alert.severity}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Power & Energy Widget
export function PowerEnergyWidget() {
  const powerData = [
    { location: "Rack A-01", power: 2.4, status: "normal" },
    { location: "Rack A-02", power: 3.1, status: "high" },
    { location: "Rack A-03", power: 1.8, status: "normal" },
    { location: "Rack A-04", power: 2.7, status: "normal" }
  ];

  const totalPower = powerData.reduce((sum, rack) => sum + rack.power, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Power & Energy
        </CardTitle>
        <CardDescription>Power consumption across all containment racks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-primary/10 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalPower.toFixed(1)} kW</div>
            <div className="text-sm text-muted-foreground">Total Power Consumption</div>
          </div>
        </div>

        <div className="space-y-3">
          {powerData.map((rack) => (
            <div key={rack.location} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  rack.status === 'high' ? 'bg-red-500' : 
                  rack.status === 'normal' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm font-medium">{rack.location}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{rack.power} kW</div>
                <Badge 
                  variant={rack.status === 'high' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {rack.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}