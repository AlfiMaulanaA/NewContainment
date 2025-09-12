"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Settings, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { sensorIntervalApi, type SensorDataIntervalConfig, type IntervalOption } from "@/lib/api-service";
import { toast } from "sonner";

interface SensorIntervalConfigProps {
  className?: string;
}

export function SensorIntervalConfig({ className }: SensorIntervalConfigProps) {
  const [globalConfig, setGlobalConfig] = useState<SensorDataIntervalConfig | null>(null);
  const [availableIntervals, setAvailableIntervals] = useState<IntervalOption[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load global configuration and available intervals in parallel
      const [globalResponse, intervalsResponse] = await Promise.all([
        sensorIntervalApi.getGlobalConfiguration(),
        sensorIntervalApi.getAvailableIntervals()
      ]);

      if (globalResponse.success && globalResponse.data) {
        setGlobalConfig(globalResponse.data);
        setSelectedInterval(globalResponse.data.saveIntervalMinutes);
      }

      if (intervalsResponse.success && intervalsResponse.data) {
        setAvailableIntervals(intervalsResponse.data);
      }
    } catch (error) {
      console.error("Failed to load sensor interval data:", error);
      toast.error("Failed to load sensor interval configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInterval = async () => {
    if (!selectedInterval) {
      toast.error("Please select an interval");
      return;
    }

    setIsSaving(true);
    try {
      const response = await sensorIntervalApi.setGlobalInterval(selectedInterval);
      
      if (response.success) {
        toast.success("Sensor interval configuration updated successfully");
        await loadData(); // Reload to get updated config
      } else {
        toast.error(response.message || "Failed to update sensor interval configuration");
      }
    } catch (error) {
      console.error("Failed to save sensor interval:", error);
      toast.error("Failed to save sensor interval configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const getModeInfo = (intervalMinutes: number) => {
    const intervalOption = availableIntervals.find(i => i.value === intervalMinutes);
    return intervalOption?.mode || "Custom";
  };

  const getTimingDescription = (intervalMinutes: number) => {
    if (intervalMinutes === 1) {
      return "Data saved every minute at exact times (18:00:00, 18:01:00, 18:02:00...)";
    } else if (intervalMinutes === 60) {
      return "Data saved every hour at exact times (18:00:00, 19:00:00, 20:00:00...)";
    } else {
      return `Data saved every ${intervalMinutes} minutes at rounded intervals`;
    }
  };

  const getCurrentEnvironmentMode = () => {
    return process.env.NODE_ENV === 'development' ? "Development" : "Production";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sensor Interval Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Sensor Interval Configuration
        </CardTitle>
        <CardDescription>
          Configure how frequently sensor data is saved to the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Current Interval</span>
            </div>
            {globalConfig ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {globalConfig.saveIntervalMinutes === 1 ? "1 minute" : 
                     globalConfig.saveIntervalMinutes === 60 ? "1 hour" :
                     `${globalConfig.saveIntervalMinutes} minutes`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getModeInfo(globalConfig.saveIntervalMinutes)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getTimingDescription(globalConfig.saveIntervalMinutes)}
                </p>
              </div>
            ) : (
              <span className="text-muted-foreground">Not configured</span>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {globalConfig?.isEnabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600 dark:text-orange-400">Disabled</span>
                </>
              )}
            </div>
            <Badge variant="secondary" className="mt-1 text-xs">
              {getCurrentEnvironmentMode()}
            </Badge>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Interval Mode
            </label>
            <Select 
              value={selectedInterval?.toString() || ""} 
              onValueChange={(value) => setSelectedInterval(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an interval..." />
              </SelectTrigger>
              <SelectContent>
                {availableIntervals.map((interval) => (
                  <SelectItem key={interval.value} value={interval.value.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{interval.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {interval.mode}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInterval && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {getModeInfo(selectedInterval)} Mode
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {getTimingDescription(selectedInterval)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleSaveInterval}
            disabled={isSaving || !selectedInterval || selectedInterval === globalConfig?.saveIntervalMinutes}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Update Interval Configuration"
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Development mode (1 min) is ideal for testing and debugging</p>
          <p>• Production mode (1 hr) provides stable, long-term data logging</p>
          <p>• Data is always saved at exact rounded times (e.g., 18:00:00, 19:00:00)</p>
          <p>• Changes take effect immediately for new incoming data</p>
        </div>
      </CardContent>
    </Card>
  );
}