using Backend.Data;
using Backend.Models;
using Backend.Enums;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;

namespace Backend.Services
{
    public class CctvService : ICctvService
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<CctvService> _logger;

        public CctvService(AppDbContext context, IHttpClientFactory httpClientFactory, ILogger<CctvService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<IEnumerable<CctvCamera>> GetAllCamerasAsync()
        {
            return await _context.CctvCameras
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<CctvCamera?> GetCameraByIdAsync(int id)
        {
            return await _context.CctvCameras
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IEnumerable<CctvCamera>> GetCamerasByContainmentAsync(int containmentId)
        {
            return await _context.CctvCameras
                .Include(c => c.CreatedByUser)
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .Where(c => c.ContainmentId == containmentId && c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<CctvCamera>> GetCamerasByRackAsync(int rackId)
        {
            return await _context.CctvCameras
                .Include(c => c.CreatedByUser)
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .Where(c => c.RackId == rackId && c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<CctvCamera> CreateCameraAsync(CctvCamera camera)
        {
            camera.CreatedAt = DateTime.UtcNow;
            camera.UpdatedAt = DateTime.UtcNow;

            _context.CctvCameras.Add(camera);
            await _context.SaveChangesAsync();

            // Test initial connection
            _ = Task.Run(async () => await TestCameraConnectionAsync(camera.Id));

            return camera;
        }

        public async Task<CctvCamera> UpdateCameraAsync(CctvCamera camera)
        {
            var existingCamera = await _context.CctvCameras.FindAsync(camera.Id);
            if (existingCamera == null)
            {
                throw new InvalidOperationException("Camera not found");
            }

            existingCamera.Name = camera.Name;
            existingCamera.Description = camera.Description;
            existingCamera.StreamUrl = camera.StreamUrl;
            existingCamera.SnapshotUrl = camera.SnapshotUrl;
            existingCamera.StreamType = camera.StreamType;
            existingCamera.Protocol = camera.Protocol;
            existingCamera.Username = camera.Username;
            existingCamera.Password = camera.Password;
            existingCamera.Port = camera.Port;
            existingCamera.Location = camera.Location;
            existingCamera.ContainmentId = camera.ContainmentId;
            existingCamera.RackId = camera.RackId;
            existingCamera.Resolution = camera.Resolution;
            existingCamera.FrameRate = camera.FrameRate;
            existingCamera.IsActive = camera.IsActive;
            existingCamera.UpdatedAt = DateTime.UtcNow;
            existingCamera.UpdatedBy = camera.UpdatedBy;

            await _context.SaveChangesAsync();

            // Test connection after update
            _ = Task.Run(async () => await TestCameraConnectionAsync(camera.Id));

            return existingCamera;
        }

        public async Task<bool> DeleteCameraAsync(int id)
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null) return false;

            camera.IsActive = false;
            camera.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> TestCameraConnectionAsync(int id)
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null) return false;

            try
            {
                using var httpClient = _httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);

                // Test connection based on protocol
                bool isOnline = false;
                
                switch (camera.Protocol)
                {
                    case CctvStreamProtocol.HTTP:
                    case CctvStreamProtocol.HTTPS:
                    case CctvStreamProtocol.MJPEG:
                        isOnline = await TestHttpConnection(httpClient, camera);
                        break;
                    case CctvStreamProtocol.RTSP:
                        isOnline = await TestRtspConnection(camera);
                        break;
                    default:
                        // For other protocols, assume online if URL is valid
                        isOnline = !string.IsNullOrEmpty(camera.StreamUrl);
                        break;
                }

                await UpdateCameraStatusAsync(id, isOnline ? CctvStatus.Online : CctvStatus.Offline);
                return isOnline;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test camera connection for ID {CameraId}", id);
                await UpdateCameraStatusAsync(id, CctvStatus.Error);
                return false;
            }
        }

        private async Task<bool> TestHttpConnection(HttpClient httpClient, CctvCamera camera)
        {
            try
            {
                if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
                {
                    var credentials = Convert.ToBase64String(
                        System.Text.Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                    httpClient.DefaultRequestHeaders.Authorization = 
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
                }

                var response = await httpClient.GetAsync(camera.StreamUrl);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> TestRtspConnection(CctvCamera camera)
        {
            // For RTSP, we'll do a basic URI validation and assume it's working
            // In a real implementation, you'd use a library like FFMpegCore to test RTSP streams
            try
            {
                var uri = new Uri(camera.StreamUrl);
                return uri.Scheme.ToLower() == "rtsp";
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> UpdateCameraStatusAsync(int id, CctvStatus status)
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null) return false;

            camera.IsOnline = status == CctvStatus.Online;
            
            if (camera.IsOnline)
            {
                camera.LastOnlineAt = DateTime.UtcNow;
            }
            
            camera.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<string?> GetCameraSnapshotAsync(int id)
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null || string.IsNullOrEmpty(camera.SnapshotUrl)) return null;

            try
            {
                using var httpClient = _httpClientFactory.CreateClient();
                
                if (!string.IsNullOrEmpty(camera.Username) && !string.IsNullOrEmpty(camera.Password))
                {
                    var credentials = Convert.ToBase64String(
                        System.Text.Encoding.ASCII.GetBytes($"{camera.Username}:{camera.Password}"));
                    httpClient.DefaultRequestHeaders.Authorization = 
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
                }

                var imageBytes = await httpClient.GetByteArrayAsync(camera.SnapshotUrl);
                return Convert.ToBase64String(imageBytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get snapshot for camera ID {CameraId}", id);
                return null;
            }
        }

        public async Task<IEnumerable<CctvCamera>> GetOnlineCamerasAsync()
        {
            return await _context.CctvCameras
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .Where(c => c.IsActive && c.IsOnline)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<CctvCamera>> GetOfflineCamerasAsync()
        {
            return await _context.CctvCameras
                .Include(c => c.Containment)
                .Include(c => c.Rack)
                .Where(c => c.IsActive && !c.IsOnline)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }
    }
}