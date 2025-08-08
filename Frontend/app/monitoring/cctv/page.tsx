"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { 
  Monitor, 
  Camera, 
  Grid, 
  Maximize2, 
  Minimize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CctvCamera, cctvApi } from "@/lib/api-service";

type GridLayout = "1x1" | "2x2" | "3x3" | "4x4";

interface CameraStreamProps {
  camera: CctvCamera;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function CameraStream({ camera, isFullscreen = false, onToggleFullscreen }: CameraStreamProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    testConnection();
  }, [camera.id]);

  const testConnection = async () => {
    try {
      setIsLoading(true);
      const result = await cctvApi.testConnection(camera.id);
      if (result.success && result.data) {
        setIsOnline(result.data.isConnected);
        setHasError(!result.data.isConnected);
      } else {
        setIsOnline(false);
        setHasError(true);
      }
    } catch (error) {
      setIsOnline(false);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStream = () => {
    setHasError(false);
    testConnection();
  };

  const getStreamContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading stream...</p>
          </div>
        </div>
      );
    }

    if (hasError || !isOnline) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-2">Camera offline</p>
            <Button size="sm" variant="outline" onClick={refreshStream}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    // For now, show a placeholder with camera info
    // In real implementation, this would show actual stream
    return (
      <div className="relative h-full bg-gray-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">{camera.name}</p>
            <p className="text-xs text-gray-500">{camera.streamUrl}</p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="absolute top-2 left-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        {/* Control overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
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
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {onToggleFullscreen && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{camera.name}</CardTitle>
            <p className="text-xs text-gray-500">{camera.ip}:{camera.port}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? (
                <><Wifi className="h-3 w-3 mr-1" /> Online</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="aspect-video">
          {getStreamContent()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CctvMonitoringPage() {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridLayout, setGridLayout] = useState<GridLayout>("2x2");
  const [fullscreenCamera, setFullscreenCamera] = useState<CctvCamera | null>(null);
  const [selectedCameras, setSelectedCameras] = useState<CctvCamera[]>([]);

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    // Update selected cameras when grid layout changes
    const maxCameras = getMaxCamerasForLayout(gridLayout);
    setSelectedCameras(cameras.slice(0, maxCameras));
  }, [cameras, gridLayout]);

  const loadCameras = async () => {
    setLoading(true);
    try {
      const result = await cctvApi.getCameras();
      if (result.success && result.data) {
        setCameras(result.data);
      } else {
        toast.error(result.message || "Failed to load CCTV cameras");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading CCTV cameras");
    } finally {
      setLoading(false);
    }
  };

  const getMaxCamerasForLayout = (layout: GridLayout): number => {
    switch (layout) {
      case "1x1": return 1;
      case "2x2": return 4;
      case "3x3": return 9;
      case "4x4": return 16;
      default: return 4;
    }
  };

  const getGridClasses = (layout: GridLayout): string => {
    switch (layout) {
      case "1x1": return "grid-cols-1 grid-rows-1";
      case "2x2": return "grid-cols-2 grid-rows-2";
      case "3x3": return "grid-cols-3 grid-rows-3";
      case "4x4": return "grid-cols-4 grid-rows-4";
      default: return "grid-cols-2 grid-rows-2";
    }
  };

  const toggleFullscreen = (camera: CctvCamera) => {
    if (fullscreenCamera?.id === camera.id) {
      setFullscreenCamera(null);
    } else {
      setFullscreenCamera(camera);
    }
  };

  const refreshAllStreams = () => {
    toast.success("Refreshing all camera streams...");
    loadCameras();
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Monitor className="h-5 w-5" />
            <h1 className="text-lg font-semibold">CCTV Monitoring</h1>
          </div>
        </header>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading cameras...</span>
        </div>
      </SidebarInset>
    );
  }

  // Fullscreen view
  if (fullscreenCamera) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="h-full w-full">
          <CameraStream
            camera={fullscreenCamera}
            isFullscreen={true}
            onToggleFullscreen={() => setFullscreenCamera(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Monitor className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Monitoring</h1>
          <Badge variant="outline" className="ml-2">
            {cameras.length} cameras
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={gridLayout} onValueChange={(value) => setGridLayout(value as GridLayout)}>
            <SelectTrigger className="w-32">
              <Grid className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1x1">1×1 Grid</SelectItem>
              <SelectItem value="2x2">2×2 Grid</SelectItem>
              <SelectItem value="3x3">3×3 Grid</SelectItem>
              <SelectItem value="4x4">4×4 Grid</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={refreshAllStreams}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh All
          </Button>
          
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </header>

      <div className="p-4 h-[calc(100vh-4rem)]">
        {selectedCameras.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No CCTV cameras found</h3>
              <p className="text-gray-600 mb-4">Add cameras in the management section to start monitoring</p>
              <Button onClick={() => window.location.href = '/management/cctv'}>
                Go to Camera Management
              </Button>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 h-full ${getGridClasses(gridLayout)}`}>
            {selectedCameras.map((camera) => (
              <div key={camera.id} className="min-h-0">
                <CameraStream
                  camera={camera}
                  onToggleFullscreen={() => toggleFullscreen(camera)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarInset>
  );
}