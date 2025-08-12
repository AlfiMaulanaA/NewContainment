using Backend.Models;

namespace Backend.Services;

public interface ICctvStreamingService
{
    Task<Stream?> GetStreamAsync(int cameraId, CancellationToken cancellationToken = default);
    Task<bool> TestConnectionAsync(int cameraId);
    Task<bool> TestConnectionAsync(CctvCamera camera);
    Task<CctvStreamInfo?> GetStreamInfoAsync(int cameraId);
    Task<byte[]?> GetSnapshotAsync(int cameraId);
    Task UpdateStreamStatusAsync(int cameraId, bool isOnline, string? errorMessage = null);
    Task StreamMjpegAsync(int cameraId, Stream outputStream, CancellationToken cancellationToken = default);
}

public class CctvStreamInfo
{
    public int CameraId { get; set; }
    public string CameraName { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public DateTime? LastOnlineAt { get; set; }
    public string? ErrorMessage { get; set; }
    public string ContentType { get; set; } = "video/mp4";
    public long? ContentLength { get; set; }
}

public class CctvConnectionResult
{
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public DateTime TestedAt { get; set; } = DateTime.UtcNow;
}