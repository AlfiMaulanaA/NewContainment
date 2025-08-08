using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;

namespace Backend.Services;

public class CctvStreamingService : ICctvStreamingService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CctvStreamingService> _logger;
    private static readonly Dictionary<int, DateTime> _lastConnectionTest = new();

    public CctvStreamingService(
        AppDbContext context, 
        IHttpClientFactory httpClientFactory,
        ILogger<CctvStreamingService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<Stream?> GetStreamAsync(int cameraId, CancellationToken cancellationToken = default)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(cameraId);
            if (camera == null)
            {
                _logger.LogWarning("Camera with ID {CameraId} not found", cameraId);
                return null;
            }

            _logger.LogInformation("Attempting to get stream for camera {CameraName} ({CameraId})", camera.Name, cameraId);

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            // Set authentication if provided
            if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
            {
                var credentials = Convert.ToBase64String(
                    Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Basic", credentials);
            }

            // Handle different stream protocols
            if (camera.StreamUrl.StartsWith("rtsp://", StringComparison.OrdinalIgnoreCase))
            {
                // For RTSP streams, we would typically need a specialized library
                // For now, we'll return an error indicating RTSP is not directly supported via HTTP
                _logger.LogWarning("RTSP streaming requires specialized handling for camera {CameraId}", cameraId);
                await UpdateStreamStatusAsync(cameraId, false, "RTSP streaming not directly supported via HTTP");
                return null;
            }
            else if (camera.StreamUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                // HTTP/HTTPS streaming
                var response = await httpClient.GetAsync(camera.StreamUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully connected to stream for camera {CameraId}", cameraId);
                    await UpdateStreamStatusAsync(cameraId, true);
                    return await response.Content.ReadAsStreamAsync(cancellationToken);
                }
                else
                {
                    _logger.LogWarning("Failed to connect to stream for camera {CameraId}: {StatusCode}", 
                        cameraId, response.StatusCode);
                    await UpdateStreamStatusAsync(cameraId, false, $"HTTP {response.StatusCode}: {response.ReasonPhrase}");
                    return null;
                }
            }
            else
            {
                _logger.LogWarning("Unsupported stream URL format for camera {CameraId}: {StreamUrl}", 
                    cameraId, camera.StreamUrl);
                await UpdateStreamStatusAsync(cameraId, false, "Unsupported stream URL format");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stream for camera {CameraId}", cameraId);
            await UpdateStreamStatusAsync(cameraId, false, ex.Message);
            return null;
        }
    }

    public async Task<bool> TestConnectionAsync(int cameraId)
    {
        var camera = await _context.CctvCameras.FindAsync(cameraId);
        if (camera == null)
        {
            return false;
        }

        return await TestConnectionAsync(camera);
    }

    public async Task<bool> TestConnectionAsync(CctvCamera camera)
    {
        try
        {
            var stopwatch = Stopwatch.StartNew();
            
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Set authentication if provided
            if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
            {
                var credentials = Convert.ToBase64String(
                    Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Basic", credentials);
            }

            bool isOnline = false;
            string? errorMessage = null;

            if (camera.StreamUrl.StartsWith("rtsp://", StringComparison.OrdinalIgnoreCase))
            {
                // For RTSP, we'll do a basic TCP connection test to the port
                var uri = new Uri(camera.StreamUrl);
                var tcpClient = new System.Net.Sockets.TcpClient();
                try
                {
                    await tcpClient.ConnectAsync(uri.Host, uri.Port);
                    isOnline = tcpClient.Connected;
                    tcpClient.Close();
                }
                catch (Exception ex)
                {
                    errorMessage = $"RTSP connection failed: {ex.Message}";
                    isOnline = false;
                }
            }
            else if (camera.StreamUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    // For HTTP streams, try HEAD request first, then GET if HEAD fails
                    var headResponse = await httpClient.SendAsync(
                        new HttpRequestMessage(HttpMethod.Head, camera.StreamUrl));
                    
                    if (headResponse.IsSuccessStatusCode)
                    {
                        isOnline = true;
                    }
                    else
                    {
                        // Try GET request
                        var getResponse = await httpClient.GetAsync(camera.StreamUrl, HttpCompletionOption.ResponseHeadersRead);
                        isOnline = getResponse.IsSuccessStatusCode;
                        if (!isOnline)
                        {
                            errorMessage = $"HTTP {getResponse.StatusCode}: {getResponse.ReasonPhrase}";
                        }
                    }
                }
                catch (Exception ex)
                {
                    errorMessage = $"HTTP connection failed: {ex.Message}";
                    isOnline = false;
                }
            }
            else
            {
                errorMessage = "Unsupported stream protocol";
                isOnline = false;
            }

            stopwatch.Stop();
            
            _logger.LogInformation("Connection test for camera {CameraName} ({CameraId}): {Status} in {ElapsedMs}ms", 
                camera.Name, camera.Id, isOnline ? "Success" : "Failed", stopwatch.ElapsedMilliseconds);

            // Update the last connection test time
            _lastConnectionTest[camera.Id] = DateTime.UtcNow;

            // Update stream status in database
            await UpdateStreamStatusAsync(camera.Id, isOnline, errorMessage);

            return isOnline;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection for camera {CameraId}", camera.Id);
            await UpdateStreamStatusAsync(camera.Id, false, ex.Message);
            return false;
        }
    }

    public async Task<CctvStreamInfo?> GetStreamInfoAsync(int cameraId)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(cameraId);
            if (camera == null)
            {
                return null;
            }

            var streamInfo = new CctvStreamInfo
            {
                CameraId = camera.Id,
                CameraName = camera.Name,
                StreamUrl = camera.StreamUrl,
                IsOnline = false, // Will be updated by connection test
                ErrorMessage = null
            };

            // Test connection to get current status
            var isOnline = await TestConnectionAsync(camera);
            streamInfo.IsOnline = isOnline;

            if (isOnline)
            {
                // Try to get content type from HTTP header
                if (camera.StreamUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var httpClient = _httpClientFactory.CreateClient();
                        httpClient.Timeout = TimeSpan.FromSeconds(5);

                        if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
                        {
                            var credentials = Convert.ToBase64String(
                                Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                            httpClient.DefaultRequestHeaders.Authorization = 
                                new AuthenticationHeaderValue("Basic", credentials);
                        }

                        var response = await httpClient.SendAsync(
                            new HttpRequestMessage(HttpMethod.Head, camera.StreamUrl));
                        
                        if (response.IsSuccessStatusCode)
                        {
                            streamInfo.ContentType = response.Content.Headers.ContentType?.MediaType ?? "video/mp4";
                            streamInfo.ContentLength = response.Content.Headers.ContentLength;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to get stream headers for camera {CameraId}", cameraId);
                    }
                }
            }

            return streamInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stream info for camera {CameraId}", cameraId);
            return null;
        }
    }

    public async Task<byte[]?> GetSnapshotAsync(int cameraId)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(cameraId);
            if (camera == null)
            {
                return null;
            }

            // For HTTP streams, try to get a snapshot
            if (camera.StreamUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);

                if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
                {
                    var credentials = Convert.ToBase64String(
                        Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                    httpClient.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Basic", credentials);
                }

                // Try to get a snapshot - many cameras have a snapshot endpoint
                var snapshotUrl = camera.StreamUrl.Replace("/video", "/snapshot")
                    .Replace("/stream", "/snapshot")
                    .Replace(".mjpg", ".jpg");

                try
                {
                    var response = await httpClient.GetAsync(snapshotUrl);
                    if (response.IsSuccessStatusCode)
                    {
                        return await response.Content.ReadAsByteArrayAsync();
                    }
                }
                catch
                {
                    // If snapshot URL fails, we could try to extract a frame from the stream
                    // For now, we'll just return null
                }
            }

            _logger.LogWarning("Snapshot not available for camera {CameraId}", cameraId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting snapshot for camera {CameraId}", cameraId);
            return null;
        }
    }

    public async Task UpdateStreamStatusAsync(int cameraId, bool isOnline, string? errorMessage = null)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(cameraId);
            if (camera != null)
            {
                if (isOnline)
                {
                    camera.UpdatedAt = DateTime.UtcNow;
                    // Note: We don't have LastOnlineAt in the simple model, but we could add it later
                }
                
                // Note: We don't have Status or ErrorMessage fields in the simple model
                // If needed, we could add these fields to the CctvCamera model

                await _context.SaveChangesAsync();
                _logger.LogDebug("Updated stream status for camera {CameraId}: {Status}", 
                    cameraId, isOnline ? "Online" : "Offline");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating stream status for camera {CameraId}", cameraId);
        }
    }
}