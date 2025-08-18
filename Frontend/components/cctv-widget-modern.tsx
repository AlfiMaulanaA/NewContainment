"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Settings,
  Square,
  Camera,
  Circle,
  Expand,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cameraConfig, CameraConfig, cctvApi } from "@/lib/api-service";
import Hls from "hls.js";

interface MonitorData {
  camera: CameraConfig;
  data: any[];
}

interface StreamItem {
  name: string;
  mid: string;
  status: string;
  streams: any[];
  camera: CameraConfig;
}

const ModernVideoPlayer = ({
  src,
  title,
  isFullscreen = false,
}: {
  src: string;
  title: string;
  isFullscreen?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) {
          video.play().catch((error) => {
            console.error("Auto-play failed:", error);
            setIsPlaying(false);
          });
        }
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error("HLS Error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Network connection failed");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Media playback error");
              hls.recoverMediaError();
              break;
            default:
              setError("Stream unavailable");
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        if (isPlaying) {
          video.play().catch((error) => {
            console.error("Auto-play failed:", error);
            setIsPlaying(false);
          });
        }
      });
    } else {
      setError("HLS not supported in this browser");
    }
  }, [src, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restartStream = () => {
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.startLoad();
      setError(null);
    }
  };

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center relative">
        <div className="absolute top-3 left-3">
          <Badge
            variant="secondary"
            className="bg-gray-700 text-gray-300 text-xs"
          >
            <Circle className="h-2 w-2 fill-gray-400 mr-1" />
            OFFLINE
          </Badge>
        </div>

        <Camera className="h-12 w-12 text-gray-500 mb-2" />
        <p className="text-sm text-gray-400 text-center mb-3">{error}</p>
        <Button
          onClick={restartStream}
          size="sm"
          variant="outline"
          className="text-gray-300 border-gray-600"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Retry
        </Button>

        <div className="absolute bottom-3 right-3">
          <span className="text-xs text-gray-500">{currentTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted={isMuted}
        playsInline
      />

      {/* Live Badge */}
      <div className="absolute top-3 left-3">
        <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs animate-pulse">
          <Circle className="h-2 w-2 fill-white mr-1" />
          LIVE
        </Badge>
      </div>

      {/* Timestamp */}
      <div className="absolute top-3 right-3">
        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
          {currentTime}
        </span>
      </div>

      {/* Video overlay for play/pause */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/20">
        <Button
          onClick={togglePlay}
          size="lg"
          variant="secondary"
          className="bg-black/70 hover:bg-black/90 border-0 text-white"
        >
          {isPlaying ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8" />
          )}
        </Button>
      </div>
    </div>
  );
};

const CCTVCard = ({
  streamItem,
  onExpand,
}: {
  streamItem: StreamItem;
  onExpand: (stream: StreamItem) => void;
}) => {
  const router = useRouter();
  const streamUrl = `http://${streamItem.camera.ipAddress}:${streamItem.camera.port}/${streamItem.camera.apiKey}/hls/${streamItem.camera.group}/${streamItem.mid}/s.m3u8`;

  const handleSettingsClick = () => {
    router.push("/management/camera");
  };

  const handleExpandClick = () => {
    onExpand(streamItem);
  };

  return (
    <Card className="bg-white shadow-lg border border-gray-200 overflow-hidden">
      {/* Header with title */}
      <div className="flex justify-between items-center bg-gray-50 px-4 py-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">
            CCTV Feed - {streamItem.name}
          </h3>
          <div className="text-xs text-muted-foreground">
            Camera: {streamItem.host}
          </div>
        </div>
        <div className="text-xs text-gray-500 border-gray-400 border rounded-full px-2 py-1">
          {streamItem.status}
        </div>
      </div>

      {/* Video content */}
      <CardContent className="p-4">
        <ModernVideoPlayer src={streamUrl} title={streamItem.name} />

        {/* Control panel */}
        <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleSettingsClick}
              title="Camera Settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleExpandClick}
              title="Fullscreen"
            >
              <Expand className="h-3 w-3" />
            </Button>
          </div>

          {/* Camera info */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            | Stream ID: {streamItem.mid}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FullscreenModal = ({
  streamItem,
  onClose,
}: {
  streamItem: StreamItem;
  onClose: () => void;
}) => {
  const streamUrl = `http://${streamItem.camera.ipAddress}:${streamItem.camera.port}/${streamItem.camera.apiKey}/hls/${streamItem.camera.group}/${streamItem.mid}/s.m3u8`;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/90 text-white border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold">{streamItem.name}</h2>
            <p className="text-sm text-gray-300">
              Camera: {streamItem.camera.name} | Stream ID: {streamItem.mid}
            </p>
          </div>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Fullscreen Video */}
      <div className="flex-1 p-4">
        <div className="w-full h-full bg-black rounded-lg overflow-hidden">
          <ModernVideoPlayer
            src={streamUrl}
            title={streamItem.name}
            isFullscreen={true}
          />
        </div>
      </div>
    </div>
  );
};

interface ModernCCTVWidgetProps {
  layout?: "1x1" | "2x2" | "3x3" | "4x2" | "auto";
}

export default function ModernCCTVWidget({ layout = "auto" }: ModernCCTVWidgetProps = {}) {
  const [monitorData, setMonitorData] = useState<MonitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenStream, setFullscreenStream] = useState<StreamItem | null>(
    null
  );

  useEffect(() => {
    loadCamerasAndMonitorData();
  }, []);

  const fetchMonitorData = async (
    camera: CameraConfig
  ): Promise<MonitorData | null> => {
    if (!camera.isActive || !camera.apiKey || !camera.group) {
      return null;
    }

    const monitorUrl = `http://${camera.ipAddress}:${camera.port}/${camera.apiKey}/monitor/${camera.group}`;

    try {
      const response = await fetch(monitorUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { camera, data };
    } catch (error: any) {
      toast.error(
        `Error loading monitor data for "${camera.name}": ${error.message}`
      );
      return null;
    }
  };

  const loadCamerasAndMonitorData = async () => {
    setLoading(true);
    setMonitorData([]);

    try {
      const result = await cameraConfig.getCameraConfigs();
      if (result.success && result.data) {
        const activeCameras = result.data.filter((cam) => cam.isActive);
        const monitorPromises = activeCameras.map(fetchMonitorData);
        const results = await Promise.all(monitorPromises);
        const validResults = results.filter(
          (res) => res !== null
        ) as MonitorData[];
        setMonitorData(validResults);

        if (validResults.length === 0) {
          toast.info("No active cameras found");
        }
      } else {
        toast.error(result.message || "Failed to load CCTV cameras");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading CCTV cameras");
    } finally {
      setLoading(false);
    }
  };

  const allStreams: StreamItem[] = monitorData
    .flatMap((monData) =>
      monData.data.map((item) => ({
        ...item,
        camera: monData.camera,
      }))
    )
    .filter((item) => item.streams && item.streams.length > 0);

  const handleExpand = (stream: StreamItem) => {
    setFullscreenStream(stream);
  };

  const handleCloseFullscreen = () => {
    setFullscreenStream(null);
  };

  const getLoadingItemCount = () => {
    switch (layout) {
      case "1x1": return 1;
      case "2x2": return 2;
      case "3x3": return 3;
      case "4x2": return 4;
      default: return 3;
    }
  };

  if (loading) {
    return (
      <>
        {[...Array(getLoadingItemCount())].map((_, index) => (
          <Card
            key={index}
            className="bg-white shadow-lg border border-gray-200 animate-pulse"
          >
            <div className="bg-gray-200 px-4 py-3 border-b">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
            <CardContent className="p-4">
              <div className="w-full aspect-video bg-gray-300 rounded-lg mb-4"></div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 bg-gray-300 rounded"
                      ></div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 bg-gray-300 rounded"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (allStreams.length === 0) {
    return (
      <>
        {[...Array(getLoadingItemCount())].map((_, index) => (
          <Card
            key={index}
            className="bg-white shadow-lg border border-gray-200"
          >
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">
                CCTV Feed -{" "}
                {index === 0
                  ? "Entrance Corridor"
                  : index === 1
                  ? "Loading Dock"
                  : "Server Room A Cam 1"}
              </h3>
            </div>
            <CardContent className="p-4">
              <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center relative">
                <div className="absolute top-3 left-3">
                  <Badge
                    variant="secondary"
                    className="bg-gray-700 text-gray-300 text-xs"
                  >
                    <Circle className="h-2 w-2 fill-gray-400 mr-1" />
                    OFFLINE
                  </Badge>
                </div>

                <Camera className="h-12 w-12 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400 text-center">
                  No camera feed available
                </p>

                <div className="absolute bottom-3 right-3">
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <VolumeX className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <Square className="h-3 w-3 text-gray-400" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled
                  >
                    <Expand className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500 text-center">
                Camera: Not connected | Stream ID: N/A
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  const renderCCTVCards = () => {
    const streamsToShow = layout === "1x1" ? allStreams.slice(0, 1) : 
                         layout === "2x2" ? allStreams.slice(0, 2) :
                         layout === "3x3" ? allStreams.slice(0, 3) :
                         layout === "4x2" ? allStreams.slice(0, 4) :
                         allStreams;

    return streamsToShow.map((streamItem, index) => (
      <CCTVCard
        key={index}
        streamItem={streamItem}
        onExpand={handleExpand}
      />
    ));
  };

  return (
    <>
      {renderCCTVCards()}

      {/* Fullscreen Modal */}
      {fullscreenStream && (
        <FullscreenModal
          streamItem={fullscreenStream}
          onClose={handleCloseFullscreen}
        />
      )}
    </>
  );
}
