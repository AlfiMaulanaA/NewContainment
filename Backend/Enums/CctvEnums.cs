namespace Backend.Enums
{
    public enum CctvStreamType
    {
        Live = 1,
        Recording = 2,
        Snapshot = 3
    }
    
    public enum CctvStreamProtocol
    {
        RTSP = 1,
        HTTP = 2,
        HTTPS = 3,
        WebRTC = 4,
        HLS = 5,
        MJPEG = 6
    }
    
    public enum CctvResolution
    {
        Unknown = 0,   // Sentinel value
        QVGA = 1,      // 320x240
        VGA = 2,       // 640x480
        HD720p = 3,    // 1280x720
        HD1080p = 4,   // 1920x1080
        UHD4K = 5      // 3840x2160
    }
    
    public enum CctvStatus
    {
        Offline = 0,
        Online = 1,
        Error = 2,
        Maintenance = 3
    }
}