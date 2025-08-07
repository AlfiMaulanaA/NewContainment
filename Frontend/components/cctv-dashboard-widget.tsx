"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle,
  Monitor,
  Maximize2,
  Settings,
  Play,
  Pause
} from 'lucide-react';
import { CctvCamera, cctvApi } from '@/lib/api-service';
import { toast } from 'sonner';
import Link from 'next/link';

interface CctvDashboardWidgetProps {
  className?: string;
}

export default function CctvDashboardWidget({ className }: CctvDashboardWidgetProps) {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<CctvCamera | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  useEffect(() => {
    loadDashboardCameras();
  }, []);

  const loadDashboardCameras = async () => {
    try {
      setIsLoading(true);
      const result = await cctvApi.getAllCameras();
      
      if (result.success && result.data) {
        // Filter cameras that have showDashboard enabled
        const dashboardCameras = result.data.filter(camera => camera.showDashboard);
        setCameras(dashboardCameras);
        
        // Auto-select first camera if available
        if (dashboardCameras.length > 0 && !selectedCamera) {
          setSelectedCamera(dashboardCameras[0]);
        }
      } else {
        toast.error('Failed to load dashboard cameras');
      }
    } catch (error) {
      console.error('Error loading dashboard cameras:', error);
      toast.error('Error loading cameras');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraSelect = (camera: CctvCamera) => {
    setSelectedCamera(camera);
    setIsStreamLoading(true);
    // Simulate stream loading
    setTimeout(() => setIsStreamLoading(false), 1000);
  };

  const StreamViewer = ({ camera }: { camera: CctvCamera }) => {
    const [streamError, setStreamError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);

    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {isStreamLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading stream...</p>
            </div>
          </div>
        ) : streamError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm">Stream unavailable</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white mt-2"
                onClick={() => setStreamError(false)}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mock video player interface */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{camera.name}</p>
                  <p className="text-sm opacity-75">{camera.location}</p>
                </div>
              </div>
              
              {/* Stream controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {camera.resolution === 2 ? 'HD 720p' : camera.resolution === 3 ? 'HD 1080p' : 'SD'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            CCTV Cameras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading cameras...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cameras.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            CCTV Cameras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Dashboard Cameras</h3>
            <p className="text-gray-500 mb-4">
              No cameras are configured to show in the dashboard widget.
            </p>
            <Link href="/management/cctv">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Cameras
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            CCTV Cameras ({cameras.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadDashboardCameras}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/management/cctv">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedCamera?.id.toString() || ''} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4" 
                   style={{ gridTemplateColumns: `repeat(${Math.min(cameras.length, 4)}, 1fr)` }}>
            {cameras.slice(0, 4).map((camera) => (
              <TabsTrigger 
                key={camera.id} 
                value={camera.id.toString()}
                onClick={() => handleCameraSelect(camera)}
                className="text-xs"
              >
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${camera.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="truncate">{camera.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {cameras.map((camera) => (
            <TabsContent key={camera.id} value={camera.id.toString()}>
              <div className="space-y-4">
                <StreamViewer camera={camera} />
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Badge variant={camera.isOnline ? "default" : "destructive"}>
                        {camera.isOnline ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Online
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                    <span className="text-gray-500">{camera.location}</span>
                  </div>
                  
                  <div className="text-gray-500">
                    {camera.lastOnlineAt 
                      ? `Last seen: ${new Date(camera.lastOnlineAt).toLocaleTimeString()}`
                      : 'Never online'
                    }
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        {cameras.length > 4 && (
          <div className="mt-4 text-center">
            <Link href="/monitoring/cctv">
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                View All Cameras ({cameras.length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}