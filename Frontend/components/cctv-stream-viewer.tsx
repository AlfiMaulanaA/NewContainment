"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CctvCamera, 
  CctvStreamProtocol, 
  cctvApi 
} from '@/lib/api-service';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Camera, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface CctvStreamViewerProps {
  camera: CctvCamera;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export function CctvStreamViewer({ 
  camera, 
  autoPlay = true, 
  showControls = true,
  className = "" 
}: CctvStreamViewerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      playStream();
    }
  }, [camera.streamUrl, autoPlay]);

  const playStream = async () => {
    if (!videoRef.current) return;

    try {
      setIsLoading(true);
      setHasError(false);
      
      // Set stream source based on protocol
      switch (camera.protocol) {
        case CctvStreamProtocol.HLS:
          await loadHLSStream();
          break;
        case CctvStreamProtocol.HTTP:
        case CctvStreamProtocol.HTTPS:
        case CctvStreamProtocol.MJPEG:
          videoRef.current.src = camera.streamUrl;
          break;
        case CctvStreamProtocol.WebRTC:
          await loadWebRTCStream();
          break;
        default:
          // For RTSP and other protocols, we'll use a conversion service or show snapshot
          await loadSnapshotStream();
          break;
      }

      if (camera.protocol !== CctvStreamProtocol.RTSP) {
        await videoRef.current.play();
      }
      
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing stream:', error);
      setHasError(true);
      setIsLoading(false);
      toast.error('Failed to load camera stream');
    }
  };

  const loadHLSStream = async () => {
    if (!videoRef.current) return;

    // Check if HLS.js is supported
    if ((window as any).Hls?.isSupported()) {
      const hls = new (window as any).Hls();
      hls.loadSource(camera.streamUrl);
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = camera.streamUrl;
    } else {
      throw new Error('HLS not supported');
    }
  };

  const loadWebRTCStream = async () => {
    // WebRTC implementation would go here
    // This is a complex implementation that requires signaling server
    throw new Error('WebRTC not implemented yet');
  };

  const loadSnapshotStream = async () => {
    try {
      const result = await cctvApi.getCameraSnapshot(camera.id);
      if (result.success && result.data) {
        setSnapshot(`data:image/jpeg;base64,${result.data.snapshot}`);
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
    }
  };

  const pauseStream = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const refreshStream = () => {
    setHasError(false);
    setSnapshot(null);
    playStream();
  };

  const takeSnapshot = async () => {
    try {
      const result = await cctvApi.getCameraSnapshot(camera.id);
      if (result.success && result.data) {
        // Create a download link for the snapshot
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${result.data.snapshot}`;
        link.download = `${camera.name}_snapshot_${new Date().toISOString()}.jpg`;
        link.click();
        toast.success('Snapshot saved');
      }
    } catch (error) {
      toast.error('Failed to take snapshot');
    }
  };

  const getStreamTypeDisplay = () => {
    switch (camera.protocol) {
      case CctvStreamProtocol.RTSP:
        return 'RTSP Stream';
      case CctvStreamProtocol.HLS:
        return 'HLS Stream';
      case CctvStreamProtocol.WebRTC:
        return 'WebRTC Stream';
      case CctvStreamProtocol.MJPEG:
        return 'MJPEG Stream';
      default:
        return 'HTTP Stream';
    }
  };

  const renderStreamContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading stream...</p>
          </div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Stream unavailable</p>
            <Button size="sm" onClick={refreshStream}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (camera.protocol === CctvStreamProtocol.RTSP || snapshot) {
      return (
        <div className="relative h-full">
          {snapshot ? (
            <img 
              src={snapshot} 
              alt={camera.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">RTSP Stream</p>
                <p className="text-xs text-gray-500">Live view via snapshot</p>
              </div>
            </div>
          )}
          {camera.protocol === CctvStreamProtocol.RTSP && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                RTSP
              </Badge>
            </div>
          )}
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls={false}
        muted={isMuted}
        onError={() => setHasError(true)}
        onLoadedData={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        Your browser does not support video streaming.
      </video>
    );
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{camera.name}</CardTitle>
            <p className="text-xs text-gray-500">{camera.location}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={camera.isOnline ? "default" : "destructive"} className="text-xs">
              {camera.isOnline ? "Online" : "Offline"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getStreamTypeDisplay()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="relative aspect-video bg-black"
        >
          {renderStreamContent()}
          
          {/* Control Overlay */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={isPlaying ? pauseStream : playStream}
                    disabled={isLoading}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={takeSnapshot}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="absolute top-2 left-2">
            <div className={`w-2 h-2 rounded-full ${camera.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}