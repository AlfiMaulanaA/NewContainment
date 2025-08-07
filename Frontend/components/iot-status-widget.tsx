"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  AlertTriangle, 
  Flame, 
  Shield, 
  AlertCircle, 
  Thermometer,
  RefreshCw,
  Eye,
  Building2
} from "lucide-react";
import { 
  containmentStatusApi, 
  ContainmentStatus
} from "@/lib/api-service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface IoTStatusWidgetProps {
  containmentId: number;
  containmentName?: string;
  className?: string;
  showViewButton?: boolean;
}

export default function IoTStatusWidget({ 
  containmentId, 
  containmentName, 
  className,
  showViewButton = true 
}: IoTStatusWidgetProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ContainmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadStatus(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [containmentId]);

  const loadStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const result = await containmentStatusApi.getLatestStatus(containmentId);
      if (result.success && result.data) {
        setStatus(result.data);
        setLastUpdated(new Date());
      } else if (showLoading) {
        toast.error("Failed to load IoT status");
      }
    } catch (error) {
      if (showLoading) {
        toast.error("Error loading IoT status");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getAlertCount = () => {
    if (!status) return 0;
    let count = 0;
    if (status.emergencyStatus) count++;
    if (status.smokeDetectorStatus) count++;
    if (status.emergencyButtonState) count++;
    if (status.emergencyTemp) count++;
    return count;
  };

  const getStatusColor = () => {
    const alertCount = getAlertCount();
    if (alertCount > 0) return "text-red-600";
    if (status?.lightingStatus || status?.fssStatus) return "text-green-600";
    return "text-gray-500";
  };

  const getStatusText = () => {
    const alertCount = getAlertCount();
    if (alertCount > 0) return `${alertCount} Alert${alertCount > 1 ? 's' : ''}`;
    if (status?.lightingStatus || status?.fssStatus) return "Operational";
    return "Standby";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            IoT Status
            {containmentName && (
              <span className="text-xs text-muted-foreground">- {containmentName}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadStatus()}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {showViewButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/monitoring/iot-status')}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : status ? (
          <div className="space-y-3">
            {/* Status Summary */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <Badge 
                variant={getAlertCount() > 0 ? "destructive" : "default"}
                className={getStatusColor()}
              >
                {getStatusText()}
              </Badge>
            </div>

            {/* Quick Status Grid */}
            <div className="grid grid-cols-4 gap-2">
              {/* Lighting */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
                <Lightbulb className={`h-4 w-4 ${status.lightingStatus ? 'text-yellow-600' : 'text-gray-400'}`} />
                <span className="text-xs">Light</span>
              </div>

              {/* Emergency */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
                <AlertTriangle className={`h-4 w-4 ${status.emergencyStatus ? 'text-red-600' : 'text-gray-400'}`} />
                <span className="text-xs">Emergency</span>
              </div>

              {/* Smoke */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
                <Flame className={`h-4 w-4 ${status.smokeDetectorStatus ? 'text-red-600' : 'text-gray-400'}`} />
                <span className="text-xs">Smoke</span>
              </div>

              {/* FSS */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
                <Shield className={`h-4 w-4 ${status.fssStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-xs">FSS</span>
              </div>
            </div>

            {/* Active Alerts */}
            {getAlertCount() > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-red-600">Active Alerts:</span>
                <div className="flex flex-wrap gap-1">
                  {status.emergencyStatus && (
                    <Badge variant="destructive" className="text-xs">Emergency</Badge>
                  )}
                  {status.smokeDetectorStatus && (
                    <Badge variant="destructive" className="text-xs">Smoke</Badge>
                  )}
                  {status.emergencyButtonState && (
                    <Badge variant="destructive" className="text-xs">Button</Badge>
                  )}
                  {status.emergencyTemp && (
                    <Badge variant="destructive" className="text-xs">Temp</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Last Update */}
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No IoT data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}