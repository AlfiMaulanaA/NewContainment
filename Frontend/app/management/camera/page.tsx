"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Search,
  MonitorPlay,
  Video,
  Play,
  Download,
  Calendar,
  Clock,
  RotateCcw,
  Settings,
  Circle,
  Pause,
  VolumeX,
  Volume2,
  Expand,
  X,
  Square,
  VideoOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  cameraConfig,
  CameraConfig,
  CreateCameraConfigRequest,
  UpdateCameraConfigRequest,
  cctvApi,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import Hls from "hls.js";

const ITEMS_PER_PAGE = 10;

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
  width?: number;
  height?: number;
  host?: string;
}

// HLS Video Player Component for live streams
// Live Stream Video Player Component
const LiveStreamPlayer = ({
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

      {/* Video overlay controls */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/20">
        <div className="flex items-center gap-2">
          <Button
            onClick={togglePlay}
            size="sm"
            variant="secondary"
            className="bg-black/70 hover:bg-black/90 border-0 text-white"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={toggleMute}
            size="sm"
            variant="secondary"
            className="bg-black/70 hover:bg-black/90 border-0 text-white"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Live Streams Tab Component
const LiveStreamsTab = ({ monitorData }: { monitorData: MonitorData[] }) => {
  const [fullscreenStream, setFullscreenStream] = useState<StreamItem | null>(
    null
  );

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

  const totalCameraCount = allStreams.length;

  const totalCameraOnline = allStreams.filter(
    (item) => item.status === "Watching"
  ).length;

  const totalCameraOffline = allStreams.filter(
    (item) => item.status !== "Watching"
  ).length;

  const handleCloseFullscreen = () => {
    setFullscreenStream(null);
  };

  if (allStreams.length === 0) {
    return (
      <div className="text-center py-8">
        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">No live streams available</p>
        <p className="text-sm text-gray-500">
          Make sure cameras are configured and active
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Cameras Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">Total Cameras</CardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-full">
              <Camera className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalCameraCount}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Total registered camera devices
            </p>
          </CardContent>
        </Card>

        {/* Online Cameras Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">Online</CardTitle>
            <div className="p-2 bg-green-100 text-green-600 rounded-full">
              <Video className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalCameraOnline}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Active and connected camera devices
            </p>
          </CardContent>
        </Card>

        {/* Offline Cameras Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">Offline</CardTitle>
            <div className="p-2 bg-red-100 text-red-600 rounded-full">
              <VideoOff className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalCameraOffline}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Disconnected camera devices
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allStreams.map((streamItem, index) => {
          const streamUrl = `http://${streamItem.camera.ipAddress}:${streamItem.camera.port}/${streamItem.camera.apiKey}/hls/${streamItem.camera.group}/${streamItem.mid}/s.m3u8`;

          return (
            <Card
              key={index}
              className="bg-white shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Live Stream - {streamItem.name}
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      Camera: {streamItem.host}
                    </div>
                  </div>
                  <Badge
                    variant={
                      streamItem.status === "Watching"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {streamItem.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <LiveStreamPlayer src={streamUrl} title={streamItem.name} />

                <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => handleExpand(streamItem)}
                      title="Fullscreen"
                    >
                      <Expand className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-gray-500">
                      {streamItem.width} × {streamItem.height}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 text-center">
                    | Monitor ID: {streamItem.mid}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenStream && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/90 text-white border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold">
                  {fullscreenStream.name}
                </h2>
                <p className="text-sm text-gray-300">
                  Camera: {fullscreenStream.camera.name} | Monitor ID:{" "}
                  {fullscreenStream.mid}
                </p>
              </div>
            </div>
            <Button
              onClick={handleCloseFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 p-4">
            <div className="w-full h-full bg-black rounded-lg overflow-hidden">
              <LiveStreamPlayer
                src={`http://${fullscreenStream.camera.ipAddress}:${fullscreenStream.camera.port}/${fullscreenStream.camera.apiKey}/hls/${fullscreenStream.camera.group}/${fullscreenStream.mid}/s.m3u8`}
                title={fullscreenStream.name}
                isFullscreen={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Motion Detection Video Widget Component
const MotionVideosTab = ({
  monitorData,
  router,
}: {
  monitorData: MonitorData[];
  router: any;
}) => {
  const [videosData, setVideosData] = useState<Record<string, any>>({});
  const [loadingVideos, setLoadingVideos] = useState<Record<string, boolean>>(
    {}
  );
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    loadAllVideos();
  }, [monitorData]);

  const loadAllVideos = async () => {
    const videoPromises = monitorData.flatMap((monData) =>
      monData.data.map(async (item) => {
        const key = `${monData.camera.id}-${item.mid}`;
        setLoadingVideos((prev) => ({ ...prev, [key]: true }));

        try {
          const videosUrl = `http://${monData.camera.ipAddress}:${monData.camera.port}/${monData.camera.apiKey}/videos/${monData.camera.group}/${item.mid}`;
          console.log("Loading videos from URL:", videosUrl);

          const videos = await cctvApi.getVideoList(videosUrl);
          setVideosData((prev) => ({ ...prev, [key]: videos }));
        } catch (error: any) {
          console.error(
            `Error loading videos for ${item.name}:`,
            error.message
          );
          setVideosData((prev) => ({
            ...prev,
            [key]: { ok: false, videos: [] },
          }));
        } finally {
          setLoadingVideos((prev) => ({ ...prev, [key]: false }));
        }
      })
    );

    await Promise.all(videoPromises);
  };

  const playVideo = (video: any, camera: any) => {
    setSelectedVideo({ ...video, camera });
    setShowVideoPlayer(true);
  };

  const downloadVideo = (video: any, camera: any) => {
    const downloadUrl = `http://${camera.ipAddress}:${camera.port}${video.href}`;
    window.open(downloadUrl, "_blank");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const formatDateTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };

  const getVideoDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="destructive">Unread</Badge>;
      case 2:
        return <Badge variant="default">Read</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <>
      <Card className="m-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Motion Detection Videos
              </CardTitle>
              <CardDescription>
                Motion detection videos recorded from all active camera monitors
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllVideos}
              disabled={Object.values(loadingVideos).some(Boolean)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh Videos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monitorData.map((monData) =>
            monData.data.map((item, index) => {
              const key = `${monData.camera.id}-${item.mid}`;
              const videos = videosData[key];
              const isLoading = loadingVideos[key];

              return (
                <div key={key} className="mb-8 border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        Camera: {monData.camera.name} | Monitor ID: {item.mid}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "Watching" ? "success" : "destructive"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Loading videos...</span>
                    </div>
                  ) : videos && videos.ok && videos.videos?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Total: {videos.videos.length} videos
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {videos.videos.map(
                            (video: any, videoIndex: number) => (
                              <TableRow key={videoIndex}>
                                <TableCell className="font-medium">
                                  {video.filename}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateTime(video.time)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {getVideoDuration(video.time, video.end)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatFileSize(video.size)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(video.status)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        playVideo(video, monData.camera)
                                      }
                                      title="Play Video"
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        downloadVideo(video, monData.camera)
                                      }
                                      title="Download Video"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600">
                        No motion detection videos found
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Video Player Dialog */}
      <Dialog open={showVideoPlayer} onOpenChange={setShowVideoPlayer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.filename}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  className="w-full h-full object-cover"
                  controls
                  src={`http://${selectedVideo.camera.ipAddress}:${selectedVideo.camera.port}${selectedVideo.href}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Start Time:</Label>
                  <p>{formatDateTime(selectedVideo.time)}</p>
                </div>
                <div>
                  <Label className="font-medium">End Time:</Label>
                  <p>{formatDateTime(selectedVideo.end)}</p>
                </div>
                <div>
                  <Label className="font-medium">Duration:</Label>
                  <p>
                    {getVideoDuration(selectedVideo.time, selectedVideo.end)}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">File Size:</Label>
                  <p>{formatFileSize(selectedVideo.size)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Monitor List Tab Component
const MonitorListTab = ({
  monitorData,
  router,
}: {
  monitorData: MonitorData[];
  router: any;
}) => {
  if (monitorData.length === 0) {
    return (
      <div className="text-center py-8">
        <MonitorPlay className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">No monitors found</p>
        <p className="text-sm text-gray-500">
          Configure cameras to see monitor data
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Monitors</CardTitle>
        <CardDescription>
          Monitor data from active and connected cameras. Click on a row to view
          detailed monitor information and motion detection videos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camera</TableHead>
              <TableHead>Monitor ID</TableHead>
              <TableHead>Monitor Name</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitorData.map((monData) =>
              monData.data.map((item, index) => (
                <TableRow
                  key={`${monData.camera.id}-${index}`}
                  className="hover:bg-gray-50"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{monData.camera.name}</div>
                      <div className="text-sm text-gray-500">
                        <a href={`//${encodeURIComponent(item.host)}`}>
                          {item.host}
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.mid}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.width} × {item.height}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Watching" ? "default" : "destructive"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default function CctvManagementPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [monitorData, setMonitorData] = useState<MonitorData[]>([]);

  const [formData, setFormData] = useState<CreateCameraConfigRequest>({
    name: "",
    ipAddress: "",
    port: 554,
    apiKey: "",
    group: "",
    isActive: true,
  });

  const { sorted, handleSort } = useSortableTable(cameras);

  const filteredCameras = sorted.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCameras.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCameras = filteredCameras.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
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
      const videos = await cctvApi.getVideoList(monitorUrl);
      toast.success(`Monitor data for "${camera.name}" loaded successfully.`);
      return { camera, data: videos };
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
        const cameraData = Array.isArray(result.data) ? result.data : [result.data];
        setCameras(cameraData);
        const activeCameras = cameraData.filter((cam) => cam.isActive);
        const monitorPromises = activeCameras.map(fetchMonitorData);
        const results = await Promise.all(monitorPromises);
        const validResults = results.filter(
          (res) => res !== null
        ) as MonitorData[];
        setMonitorData(validResults);
      } else {
        toast.error(result.message || "Failed to load CCTV cameras");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading CCTV cameras");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCamera = async () => {
    setActionLoading(true);
    try {
      const result = await cameraConfig.createCamera(formData);
      if (result.success) {
        toast.success("CCTV camera created successfully");
        setShowCreateDialog(false);
        resetForm();
        loadCamerasAndMonitorData();
      } else {
        toast.error(result.message || "Failed to create CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating CCTV camera");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCamera = async () => {
    if (!editingCamera) return;

    setActionLoading(true);
    try {
      const updateData: UpdateCameraConfigRequest = {
        name: formData.name,
        ipAddress: formData.ipAddress,
        port: formData.port,
        apiKey: formData.apiKey,
        group: formData.group,
        isActive: formData.isActive,
      };

      const result = await cameraConfig.updateCamera(
        editingCamera.id,
        updateData
      );
      if (result.success) {
        toast.success("CCTV camera updated successfully");
        setShowEditDialog(false);
        setEditingCamera(null);
        resetForm();
        loadCamerasAndMonitorData();
      } else {
        toast.error(result.message || "Failed to update CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating CCTV camera");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCamera = async (camera: CameraConfig) => {
    try {
      const result = await cameraConfig.deleteCamera(camera.id);
      if (result.success) {
        toast.success("CCTV camera deleted successfully");
        loadCamerasAndMonitorData();
      } else {
        toast.error(result.message || "Failed to delete CCTV camera");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting CCTV camera");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      ipAddress: "",
      port: 554,
      apiKey: "",
      group: "",
      isActive: true,
    });
  };

  const openEditDialog = (camera: CameraConfig) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      ipAddress: camera.ipAddress,
      port: camera.port,
      apiKey: camera.apiKey || "",
      group: camera.group,
      isActive: camera.isActive,
    });
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Camera className="h-5 w-5" />
            <h1 className="text-lg font-semibold">CCTV Camera Management</h1>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading CCTV cameras...</span>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Camera className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Camera Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New CCTV Camera</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Camera Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Entrance Camera"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ipAddress: e.target.value,
                      }))
                    }
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        port: parseInt(e.target.value) || 554,
                      }))
                    }
                    placeholder="554"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="apiKey">API Key</Label>
                  <span className="p-2 bg-gray-200 rounded-full text-xs text-muted-foreground">
                    For Motion Detection
                  </span>
                </div>
                <Input
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
                  }
                  placeholder="Shinobi CCTV API Key"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group">Group</Label>
                <Input
                  id="group"
                  value={formData.group}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      group: e.target.value,
                    }))
                  }
                  placeholder="e.g., Main Building"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCamera} disabled={actionLoading}>
                {actionLoading ? "Creating..." : "Create Camera"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="cameras" className="w-full mt-4 p-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cameras">Camera Configuration</TabsTrigger>
          <TabsTrigger value="monitors">Monitor List</TabsTrigger>
          <TabsTrigger value="streams">Live Streams</TabsTrigger>
          <TabsTrigger value="videos">Motion Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="cameras" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  CCTV Camera Configuration ({filteredCameras.length})
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cameras..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("ipAddress")}
                    >
                      IP Address <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Api Keys</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCameras.map((camera, index) => (
                    <TableRow key={camera.id}>
                      <TableCell className="font-medium">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{camera.name}</div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`http://${camera.ipAddress}:${camera.port}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {camera.ipAddress}:{camera.port}
                        </a>
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <span className="block w-full truncate">
                          {camera.apiKey || "Not set"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{camera.group}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            camera.isActive === true ? "success" : "destructive"
                          }
                          className="capitalize"
                        >
                          {camera.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(camera)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete CCTV Camera
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete camera "
                                  {camera.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCamera(camera)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i + 1)}
                            isActive={currentPage === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitors" className="space-y-4">
          <MonitorListTab monitorData={monitorData} router={router} />
        </TabsContent>

        <TabsContent value="streams" className="space-y-4">
          <LiveStreamsTab monitorData={monitorData} />
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <MotionVideosTab monitorData={monitorData} router={router} />
        </TabsContent>
      </Tabs>

      {/* Edit Camera Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit CCTV Camera</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Camera Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Entrance Camera"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-ipAddress">IP Address</Label>
                <Input
                  id="edit-ipAddress"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ipAddress: e.target.value,
                    }))
                  }
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      port: parseInt(e.target.value) || 554,
                    }))
                  }
                  placeholder="554"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-apiKey">API Key</Label>
                <span className="p-2 bg-gray-200 rounded-full text-xs text-muted-foreground">
                  For Motion Detection
                </span>
              </div>
              <Input
                id="edit-apiKey"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="Shinobi CCTV API Key"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-group">Group</Label>
              <Input
                id="edit-group"
                value={formData.group}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    group: e.target.value,
                  }))
                }
                placeholder="e.g., Main Building"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCamera} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Camera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
