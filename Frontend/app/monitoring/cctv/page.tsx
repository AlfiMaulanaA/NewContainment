"use client";

import React, { useState, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CctvGridViewer } from '@/components/cctv-grid-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CctvCamera, 
  cctvApi,
  containmentsApi,
  racksApi,
  Containment,
  Rack
} from '@/lib/api-service';
import { 
  Camera, 
  Monitor, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Maximize2,
  Eye,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface CameraStats {
  total: number;
  online: number;
  offline: number;
  error: number;
}

export default function CctvMonitoringPage() {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [selectedContainment, setSelectedContainment] = useState<number | null>(null);
  const [selectedRack, setSelectedRack] = useState<number | null>(null);
  const [stats, setStats] = useState<CameraStats>({ total: 0, online: 0, offline: 0, error: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCameras();
  }, [selectedContainment, selectedRack]);

  useEffect(() => {
    calculateStats();
  }, [cameras]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [containmentsResult, racksResult] = await Promise.all([
        containmentsApi.getContainments(),
        racksApi.getRacks()
      ]);

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      }
      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
      }
    } catch (error) {
      toast.error('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCameras = async () => {
    try {
      // Always load all cameras, then filter in UI
      const result = await cctvApi.getAllCameras();

      if (result.success && result.data) {
        setCameras(result.data);
      } else {
        toast.error('Failed to load cameras');
        setCameras([]);
      }
    } catch (error) {
      toast.error('Error loading cameras');
      setCameras([]);
    }
  };

  const calculateStats = () => {
    const total = cameras.length;
    const online = cameras.filter(c => c.isOnline).length;
    const offline = cameras.filter(c => !c.isOnline && c.isActive).length;
    const error = cameras.filter(c => !c.isActive).length;
    
    setStats({ total, online, offline, error });
  };

  const refreshCameras = () => {
    loadCameras();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const getFilteredCameras = () => {
    let filtered = cameras;
    
    if (selectedContainment) {
      filtered = filtered.filter(camera => camera.containmentId === selectedContainment);
    }
    
    if (selectedRack) {
      filtered = filtered.filter(camera => camera.rackId === selectedRack);
    }
    
    // Only show active cameras
    return filtered.filter(camera => camera.isActive);
  };

  const onlineCameras = cameras.filter(c => c.isOnline);
  const offlineCameras = cameras.filter(c => !c.isOnline);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black space-y-6">
        {/* Fullscreen content - existing code remains the same */}
        {/* Rest of the fullscreen JSX */}
      </div>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Monitoring</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Real-time security camera monitoring dashboard</p>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
            <Button variant="outline" onClick={refreshCameras}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cameras</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Active monitoring points</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.online}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <Monitor className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 && stats.offline === 0 ? (
                  <span className="text-green-600">Good</span>
                ) : stats.offline < stats.total / 2 ? (
                  <span className="text-yellow-600">Fair</span>
                ) : (
                  <span className="text-red-600">Poor</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Overall system status</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {!isFullscreen && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {onlineCameras.length} Online
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {offlineCameras.length} Offline
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Containment:</label>
                <Select 
                  value={selectedContainment?.toString() || 'all'} 
                  onValueChange={(value) => {
                    setSelectedContainment(value === 'all' ? null : parseInt(value));
                    setSelectedRack(null); // Reset rack filter
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Containments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Containments</SelectItem>
                    {containments.map(containment => (
                      <SelectItem key={containment.id} value={containment.id.toString()}>
                        {containment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Rack:</label>
                <Select 
                  value={selectedRack?.toString() || 'all'} 
                  onValueChange={(value) => {
                    setSelectedRack(value === 'all' ? null : parseInt(value));
                    setSelectedContainment(null); // Reset containment filter
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Racks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Racks</SelectItem>
                    {racks.map(rack => (
                      <SelectItem key={rack.id} value={rack.id.toString()}>
                        {rack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedContainment(null);
                  setSelectedRack(null);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Controls */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refreshCameras}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Camera Grid */}
      <div className={isFullscreen ? 'h-screen p-4' : ''}>
        <CctvGridViewer
          cameras={getFilteredCameras()}
          className={isFullscreen ? 'h-full' : ''}
        />
      </div>

      {/* Offline Cameras Alert */}
      {!isFullscreen && offlineCameras.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-700">
                Offline Cameras ({offlineCameras.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {offlineCameras.slice(0, 6).map((camera) => (
                <div key={camera.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="text-sm font-medium">{camera.name}</p>
                    <p className="text-xs text-gray-500">{camera.location}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Offline
                  </Badge>
                </div>
              ))}
              {offlineCameras.length > 6 && (
                <div className="flex items-center justify-center p-2 bg-white rounded border">
                  <p className="text-sm text-gray-500">
                    +{offlineCameras.length - 6} more offline
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </SidebarInset>
  );
}