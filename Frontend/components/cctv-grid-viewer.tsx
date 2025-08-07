"use client";

import React, { useState, useEffect } from 'react';
import { CctvStreamViewer } from './cctv-stream-viewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CctvCamera, 
  cctvApi 
} from '@/lib/api-service';
import { 
  Grid3x3, 
  Grid2x2, 
  Square, 
  RefreshCw, 
  Settings,
  Monitor,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';

type GridLayout = '1x1' | '2x2' | '3x3' | '2x1' | '1x2';

interface CctvGridViewerProps {
  containmentId?: number;
  rackId?: number;
  cameras?: CctvCamera[];
  className?: string;
}

export function CctvGridViewer({ 
  containmentId, 
  rackId, 
  cameras: propCameras,
  className = "" 
}: CctvGridViewerProps) {
  const [cameras, setCameras] = useState<CctvCamera[]>(propCameras || []);
  const [selectedCamera, setSelectedCamera] = useState<CctvCamera | null>(null);
  const [gridLayout, setGridLayout] = useState<GridLayout>('2x2');
  const [isLoading, setIsLoading] = useState(!propCameras);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (propCameras) {
      setCameras(propCameras);
    } else {
      loadCameras();
    }
  }, [containmentId, rackId, propCameras]);

  useEffect(() => {
    const online = cameras.filter(c => c.isOnline).length;
    setOnlineCount(online);
  }, [cameras]);

  const loadCameras = async () => {
    try {
      setIsLoading(true);
      let result;
      
      if (containmentId) {
        result = await cctvApi.getCamerasByContainment(containmentId);
      } else if (rackId) {
        result = await cctvApi.getCamerasByRack(rackId);
      } else {
        result = await cctvApi.getAllCameras();
      }

      if (result.success && result.data) {
        setCameras(result.data);
      } else {
        toast.error('Failed to load cameras');
      }
    } catch (error) {
      toast.error('Error loading cameras');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCameras = () => {
    loadCameras();
  };

  const getGridClass = () => {
    switch (gridLayout) {
      case '1x1':
        return 'grid-cols-1';
      case '2x1':
        return 'grid-cols-2 grid-rows-1';
      case '1x2':
        return 'grid-cols-1 grid-rows-2';
      case '2x2':
        return 'grid-cols-2 grid-rows-2';
      case '3x3':
        return 'grid-cols-3 grid-rows-3';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  };

  const getMaxCameras = () => {
    switch (gridLayout) {
      case '1x1': return 1;
      case '2x1': return 2;
      case '1x2': return 2;
      case '2x2': return 4;
      case '3x3': return 9;
      default: return 4;
    }
  };

  const displayedCameras = cameras.slice(0, getMaxCameras());

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading cameras...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cameras.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No cameras found</p>
              <p className="text-xs text-gray-500 mt-1">
                Add cameras to start monitoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">CCTV Monitor</CardTitle>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    {onlineCount} Online
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {cameras.length - onlineCount} Offline
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Total: {cameras.length} cameras
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Grid Layout Controls */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  size="sm"
                  variant={gridLayout === '1x1' ? 'default' : 'ghost'}
                  className="h-8 w-8 p-0"
                  onClick={() => setGridLayout('1x1')}
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={gridLayout === '2x2' ? 'default' : 'ghost'}
                  className="h-8 w-8 p-0"
                  onClick={() => setGridLayout('2x2')}
                >
                  <Grid2x2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={gridLayout === '3x3' ? 'default' : 'ghost'}
                  className="h-8 w-8 p-0"
                  onClick={() => setGridLayout('3x3')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
              
              <Button size="sm" variant="outline" onClick={refreshCameras}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Camera Grid */}
      <div className={`grid gap-4 ${getGridClass()}`}>
        {displayedCameras.map((camera, index) => (
          <div key={camera.id} className="relative">
            <CctvStreamViewer
              camera={camera}
              autoPlay={index === 0} // Only auto-play first camera
              showControls={true}
            />
            
            {/* Camera info overlay */}
            <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
              <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
                Camera {index + 1}
              </div>
              {!camera.isOnline && (
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Offline
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: getMaxCameras() - displayedCameras.length }).map((_, index) => (
          <Card key={`empty-${index}`} className="aspect-video">
            <CardContent className="p-0 h-full">
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <Monitor className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No Camera</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Camera List (if more cameras than grid can show) */}
      {cameras.length > getMaxCameras() && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Additional Cameras</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cameras.slice(getMaxCameras()).map((camera) => (
                <div
                  key={camera.id}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCamera(camera)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${camera.isOnline ? 'bg-green-500' : 'bg-red-500'}`} 
                    />
                    <div>
                      <p className="text-sm font-medium">{camera.name}</p>
                      <p className="text-xs text-gray-500">{camera.location}</p>
                    </div>
                  </div>
                  <Badge variant={camera.isOnline ? "default" : "destructive"} className="text-xs">
                    {camera.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}