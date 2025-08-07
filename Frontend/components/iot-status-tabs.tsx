"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Lightbulb, 
  AlertTriangle, 
  Flame, 
  Shield, 
  AlertCircle, 
  Droplets,
  DoorOpen,
  DoorClosed,
  Thermometer,
  Activity,
  Clock,
  RefreshCw,
  Building2,
  History,
  TrendingUp
} from "lucide-react";
import { 
  containmentStatusApi, 
  containmentsApi,
  ContainmentStatus, 
  Containment 
} from "@/lib/api-service";
import { toast } from "sonner";

interface IoTStatusTabsProps {
  containmentId?: number;
  className?: string;
}

export default function IoTStatusTabs({ containmentId, className }: IoTStatusTabsProps) {
  const [containments, setContainments] = useState<Containment[]>([]);
  const [selectedContainmentId, setSelectedContainmentId] = useState<number>(containmentId || 0);
  const [currentStatus, setCurrentStatus] = useState<ContainmentStatus | null>(null);
  const [statusHistory, setStatusHistory] = useState<ContainmentStatus[]>([]);
  const [allStatuses, setAllStatuses] = useState<ContainmentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load containments on component mount
  useEffect(() => {
    loadContainments();
  }, []);

  // Load status data when containment changes
  useEffect(() => {
    if (selectedContainmentId > 0) {
      loadStatusData();
    }
  }, [selectedContainmentId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedContainmentId > 0) {
        loadStatusData(false); // Silent refresh
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedContainmentId]);

  const loadContainments = async () => {
    try {
      const result = await containmentsApi.getContainments();
      if (result.success && result.data) {
        setContainments(result.data);
        if (!containmentId && result.data.length > 0) {
          setSelectedContainmentId(result.data[0].id);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load containments");
    }
  };

  const loadStatusData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const [latestResult, historyResult, allResult] = await Promise.all([
        containmentStatusApi.getLatestStatus(selectedContainmentId),
        containmentStatusApi.getStatusHistory(selectedContainmentId, 50),
        containmentStatusApi.getAllLatestStatuses()
      ]);

      if (latestResult.success && latestResult.data) {
        setCurrentStatus(latestResult.data);
      }

      if (historyResult.success && historyResult.data) {
        setStatusHistory(historyResult.data);
      }

      if (allResult.success && allResult.data) {
        setAllStatuses(allResult.data);
      }

      setLastUpdated(new Date());
    } catch (error: any) {
      if (showLoading) {
        toast.error("Failed to load status data");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean, type: string) => {
    const iconClass = `h-5 w-5 ${status ? 'text-green-600' : 'text-gray-400'}`;
    
    switch (type) {
      case 'lighting': return <Lightbulb className={iconClass} />;
      case 'emergency': return <AlertTriangle className={iconClass} />;
      case 'smoke': return <Flame className={iconClass} />;
      case 'fss': return <Shield className={iconClass} />;
      case 'button': return <AlertCircle className={iconClass} />;
      case 'selenoid': return <Droplets className={iconClass} />;
      case 'door': return status ? <DoorOpen className={iconClass} /> : <DoorClosed className={iconClass} />;
      case 'temp': return <Thermometer className={iconClass} />;
      default: return <Activity className={iconClass} />;
    }
  };

  const getStatusBadge = (status: boolean, type: string = 'default') => {
    // Use shared color scheme
    if (type === 'emergency' || type === 'smoke' || type === 'temp' || type === 'button') {
      return (
        <Badge 
          variant="outline" 
          className="bg-red-100 border-red-600 text-red-600 rounded-full hover:bg-red-200"
        >
          {status ? "ALERT" : "Normal"}
        </Badge>
      );
    }

    if (type === 'door' || type === 'switch') {
      return (
        <Badge 
          variant="outline" 
          className={status ? "bg-orange-100 border-orange-600 text-orange-600 rounded-full hover:bg-orange-200" : "bg-green-100 border-green-600 text-green-600 rounded-full hover:bg-green-200"}
        >
          {status ? "Open" : "Closed"}
        </Badge>
      );
    }
    
    // For lighting, selenoid, fss and other system components
    return (
      <Badge 
        variant="outline" 
        className={status ? "bg-blue-100 border-blue-600 text-blue-600 rounded-full hover:bg-blue-200" : "bg-gray-100 border-gray-600 text-gray-600 rounded-full hover:bg-gray-200"}
      >
        {status ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCurrentContainment = () => {
    return containments.find(c => c.id === selectedContainmentId);
  };

  const getStatusCount = (statuses: ContainmentStatus[], field: keyof ContainmentStatus) => {
    return statuses.filter(s => s[field] === true).length;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              IoT Containment Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={selectedContainmentId.toString()}
                onValueChange={(value) => setSelectedContainmentId(parseInt(value))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Containment" />
                </SelectTrigger>
                <SelectContent>
                  {containments.map((containment) => (
                    <SelectItem key={containment.id} value={containment.id.toString()}>
                      {containment.name} - {containment.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStatusData()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="current">Current Status</TabsTrigger>
              <TabsTrigger value="sensors">Sensor Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* Current Status Tab */}
            <TabsContent value="current" className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : currentStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Lighting System */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.lightingStatus, 'lighting')}
                        Lighting System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.lightingStatus)}
                    </CardContent>
                  </Card>

                  {/* Emergency System */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.emergencyStatus, 'emergency')}
                        Emergency System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.emergencyStatus)}
                    </CardContent>
                  </Card>

                  {/* Smoke Detector */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.smokeDetectorStatus, 'smoke')}
                        Smoke Detector
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.smokeDetectorStatus)}
                    </CardContent>
                  </Card>

                  {/* FSS Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.fssStatus, 'fss')}
                        FSS System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.fssStatus)}
                    </CardContent>
                  </Card>

                  {/* Emergency Button */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.emergencyButtonState, 'button')}
                        Emergency Button
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.emergencyButtonState)}
                    </CardContent>
                  </Card>

                  {/* Temperature Emergency */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(currentStatus.emergencyTemp, 'temp')}
                        Emergency Temp
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(currentStatus.emergencyTemp)}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No status data available</p>
                  <p className="text-sm">Select a containment to view IoT status</p>
                </div>
              )}
            </TabsContent>

            {/* Sensor Details Tab */}
            <TabsContent value="sensors" className="space-y-4">
              {currentStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Door & Access Control */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Door & Access Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.limitSwitchFrontDoorStatus, 'door')}
                          Front Door Limit Switch
                        </span>
                        {getStatusBadge(currentStatus.limitSwitchFrontDoorStatus, 'switch')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.limitSwitchBackDoorStatus, 'door')}
                          Back Door Limit Switch
                        </span>
                        {getStatusBadge(currentStatus.limitSwitchBackDoorStatus, 'switch')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.openFrontDoorStatus, 'door')}
                          Front Door Status
                        </span>
                        {getStatusBadge(currentStatus.openFrontDoorStatus, 'door')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.openBackDoorStatus, 'door')}
                          Back Door Status
                        </span>
                        {getStatusBadge(currentStatus.openBackDoorStatus, 'door')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.selenoidStatus, 'selenoid')}
                          Selenoid Control
                        </span>
                        {getStatusBadge(currentStatus.selenoidStatus)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.lightingStatus, 'lighting')}
                          Lighting Control
                        </span>
                        {getStatusBadge(currentStatus.lightingStatus)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safety Systems */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Safety & Security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.smokeDetectorStatus, 'smoke')}
                          Smoke Detection
                        </span>
                        {getStatusBadge(currentStatus.smokeDetectorStatus)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.fssStatus, 'fss')}
                          Fire Safety System
                        </span>
                        {getStatusBadge(currentStatus.fssStatus)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getStatusIcon(currentStatus.emergencyTemp, 'temp')}
                          Emergency Temperature
                        </span>
                        {getStatusBadge(currentStatus.emergencyTemp)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        <span className="font-medium">Containment:</span> {getCurrentContainment()?.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Location:</span> {getCurrentContainment()?.location}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Last MQTT Update:</span><br />
                        {formatTimestamp(currentStatus.mqttTimestamp)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">System Update:</span><br />
                        {formatTimestamp(currentStatus.updatedAt)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sensor data available</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {statusHistory.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5" />
                    <span className="font-medium">Recent Status Changes</span>
                    <Badge variant="outline">{statusHistory.length} records</Badge>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {statusHistory.map((status, index) => (
                      <Card key={status.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div className="text-sm">
                              <div className="font-medium">
                                {formatTimestamp(status.mqttTimestamp)}
                              </div>
                              <div className="text-muted-foreground">
                                Updated: {formatTimestamp(status.updatedAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {status.emergencyStatus && (
                              <Badge variant="destructive" className="text-xs">Emergency</Badge>
                            )}
                            {status.smokeDetectorStatus && (
                              <Badge variant="destructive" className="text-xs">Smoke</Badge>
                            )}
                            {status.emergencyTemp && (
                              <Badge variant="destructive" className="text-xs">Temp Alert</Badge>
                            )}
                            {!status.emergencyStatus && !status.smokeDetectorStatus && !status.emergencyTemp && (
                              <Badge variant="secondary" className="text-xs">Normal</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No history data available</p>
                </div>
              )}
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      System Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Containments</span>
                      <Badge>{containments.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Statuses</span>
                      <Badge>{allStatuses.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>History Records</span>
                      <Badge>{statusHistory.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {allStatuses.length > 0 && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Safety Alerts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Emergency Active</span>
                          <Badge variant="destructive">
                            {getStatusCount(allStatuses, 'emergencyStatus')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Smoke Detected</span>
                          <Badge variant="destructive">
                            {getStatusCount(allStatuses, 'smokeDetectorStatus')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Temperature Alert</span>
                          <Badge variant="destructive">
                            {getStatusCount(allStatuses, 'emergencyTemp')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">System Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Lighting Active</span>
                          <Badge variant="default">
                            {getStatusCount(allStatuses, 'lightingStatus')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>FSS Active</span>
                          <Badge variant="default">
                            {getStatusCount(allStatuses, 'fssStatus')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Selenoid Active</span>
                          <Badge variant="default">
                            {getStatusCount(allStatuses, 'selenoidStatus')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}