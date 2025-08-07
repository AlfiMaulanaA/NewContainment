using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;
using Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CctvController : ControllerBase
    {
        private readonly ICctvService _cctvService;
        private readonly ILogger<CctvController> _logger;

        public CctvController(ICctvService cctvService, ILogger<CctvController> logger)
        {
            _cctvService = cctvService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CctvCameraDto>>> GetAllCameras()
        {
            try
            {
                var cameras = await _cctvService.GetAllCamerasAsync();
                var cameraDtos = cameras.Select(MapToCameraDto);
                return Ok(cameraDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all cameras");
                return StatusCode(500, new { message = "Failed to retrieve cameras" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CctvCameraDto>> GetCamera(int id)
        {
            try
            {
                var camera = await _cctvService.GetCameraByIdAsync(id);
                if (camera == null)
                {
                    return NotFound(new { message = "Camera not found" });
                }

                return Ok(MapToCameraDto(camera));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting camera {CameraId}", id);
                return StatusCode(500, new { message = "Failed to retrieve camera" });
            }
        }

        [HttpGet("containment/{containmentId}")]
        public async Task<ActionResult<IEnumerable<CctvCameraDto>>> GetCamerasByContainment(int containmentId)
        {
            try
            {
                var cameras = await _cctvService.GetCamerasByContainmentAsync(containmentId);
                var cameraDtos = cameras.Select(MapToCameraDto);
                return Ok(cameraDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cameras for containment {ContainmentId}", containmentId);
                return StatusCode(500, new { message = "Failed to retrieve cameras" });
            }
        }

        [HttpGet("rack/{rackId}")]
        public async Task<ActionResult<IEnumerable<CctvCameraDto>>> GetCamerasByRack(int rackId)
        {
            try
            {
                var cameras = await _cctvService.GetCamerasByRackAsync(rackId);
                var cameraDtos = cameras.Select(MapToCameraDto);
                return Ok(cameraDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cameras for rack {RackId}", rackId);
                return StatusCode(500, new { message = "Failed to retrieve cameras" });
            }
        }

        [HttpGet("online")]
        public async Task<ActionResult<IEnumerable<CctvCameraDto>>> GetOnlineCameras()
        {
            try
            {
                var cameras = await _cctvService.GetOnlineCamerasAsync();
                var cameraDtos = cameras.Select(MapToCameraDto);
                return Ok(cameraDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting online cameras");
                return StatusCode(500, new { message = "Failed to retrieve online cameras" });
            }
        }

        [HttpGet("offline")]
        public async Task<ActionResult<IEnumerable<CctvCameraDto>>> GetOfflineCameras()
        {
            try
            {
                var cameras = await _cctvService.GetOfflineCamerasAsync();
                var cameraDtos = cameras.Select(MapToCameraDto);
                return Ok(cameraDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting offline cameras");
                return StatusCode(500, new { message = "Failed to retrieve offline cameras" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<CctvCameraDto>> CreateCamera(CreateCameraRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
                
                var camera = new CctvCamera
                {
                    Name = request.Name,
                    Description = request.Description,
                    StreamUrl = request.StreamUrl,
                    SnapshotUrl = request.SnapshotUrl,
                    StreamType = request.StreamType,
                    Protocol = request.Protocol,
                    Username = request.Username,
                    Password = request.Password,
                    Port = request.Port,
                    Location = request.Location,
                    ContainmentId = request.ContainmentId,
                    RackId = request.RackId,
                    Resolution = request.Resolution,
                    FrameRate = request.FrameRate,
                    ShowDashboard = request.ShowDashboard ?? false,
                    CreatedBy = userId
                };

                var createdCamera = await _cctvService.CreateCameraAsync(camera);
                return CreatedAtAction(nameof(GetCamera), new { id = createdCamera.Id }, MapToCameraDto(createdCamera));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating camera");
                return StatusCode(500, new { message = "Failed to create camera" });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<CctvCameraDto>> UpdateCamera(int id, UpdateCameraRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var existingCamera = await _cctvService.GetCameraByIdAsync(id);
                if (existingCamera == null)
                {
                    return NotFound(new { message = "Camera not found" });
                }

                var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
                
                existingCamera.Name = request.Name;
                existingCamera.Description = request.Description;
                existingCamera.StreamUrl = request.StreamUrl;
                existingCamera.SnapshotUrl = request.SnapshotUrl;
                existingCamera.Protocol = request.Protocol;
                existingCamera.Username = request.Username;
                existingCamera.Password = request.Password;
                existingCamera.Port = request.Port;
                existingCamera.Location = request.Location;
                existingCamera.ContainmentId = request.ContainmentId;
                existingCamera.RackId = request.RackId;
                existingCamera.Resolution = request.Resolution;
                existingCamera.FrameRate = request.FrameRate;
                existingCamera.ShowDashboard = request.ShowDashboard ?? existingCamera.ShowDashboard;
                existingCamera.UpdatedBy = userId;

                var updatedCamera = await _cctvService.UpdateCameraAsync(existingCamera);
                return Ok(MapToCameraDto(updatedCamera));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating camera {CameraId}", id);
                return StatusCode(500, new { message = "Failed to update camera" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCamera(int id)
        {
            try
            {
                var success = await _cctvService.DeleteCameraAsync(id);
                if (!success)
                {
                    return NotFound(new { message = "Camera not found" });
                }

                return Ok(new { message = "Camera deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting camera {CameraId}", id);
                return StatusCode(500, new { message = "Failed to delete camera" });
            }
        }

        [HttpPost("{id}/test-connection")]
        public async Task<IActionResult> TestConnection(int id)
        {
            try
            {
                var isOnline = await _cctvService.TestCameraConnectionAsync(id);
                return Ok(new { isOnline, message = isOnline ? "Camera is online" : "Camera is offline" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing connection for camera {CameraId}", id);
                return StatusCode(500, new { message = "Failed to test camera connection" });
            }
        }

        [HttpGet("{id}/snapshot")]
        public async Task<IActionResult> GetSnapshot(int id)
        {
            try
            {
                var snapshotData = await _cctvService.GetCameraSnapshotAsync(id);
                if (snapshotData == null)
                {
                    return NotFound(new { message = "Snapshot not available" });
                }

                return Ok(new { snapshot = snapshotData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting snapshot for camera {CameraId}", id);
                return StatusCode(500, new { message = "Failed to get camera snapshot" });
            }
        }

        private static CctvCameraDto MapToCameraDto(CctvCamera camera)
        {
            return new CctvCameraDto
            {
                Id = camera.Id,
                Name = camera.Name,
                Description = camera.Description,
                StreamUrl = camera.StreamUrl,
                SnapshotUrl = camera.SnapshotUrl,
                StreamType = camera.StreamType,
                Protocol = camera.Protocol,
                Port = camera.Port,
                Location = camera.Location,
                ContainmentId = camera.ContainmentId,
                RackId = camera.RackId,
                Resolution = camera.Resolution,
                FrameRate = camera.FrameRate,
                IsActive = camera.IsActive,
                IsOnline = camera.IsOnline,
                ShowDashboard = camera.ShowDashboard,
                LastOnlineAt = camera.LastOnlineAt,
                CreatedAt = camera.CreatedAt,
                UpdatedAt = camera.UpdatedAt,
                CreatedBy = camera.CreatedBy,
                ContainmentName = camera.Containment?.Name,
                RackName = camera.Rack?.Name
            };
        }
    }

    public class CreateCameraRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(500)]
        public string StreamUrl { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? SnapshotUrl { get; set; }
        
        [Required]
        public CctvStreamType StreamType { get; set; }
        
        [Required]
        public CctvStreamProtocol Protocol { get; set; }
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        public int? Port { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;
        
        public int? ContainmentId { get; set; }
        
        public int? RackId { get; set; }
        
        public CctvResolution Resolution { get; set; } = CctvResolution.HD720p;
        
        [Range(1, 60)]
        public int FrameRate { get; set; } = 30;
        
        public bool? ShowDashboard { get; set; }
    }

    public class UpdateCameraRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(500)]
        public string StreamUrl { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? SnapshotUrl { get; set; }
        
        [Required]
        public CctvStreamProtocol Protocol { get; set; }
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        public int? Port { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;
        
        public int? ContainmentId { get; set; }
        
        public int? RackId { get; set; }
        
        public CctvResolution Resolution { get; set; } = CctvResolution.HD720p;
        
        [Range(1, 60)]
        public int FrameRate { get; set; } = 30;
        
        public bool? ShowDashboard { get; set; }
    }

    public class CctvCameraDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string StreamUrl { get; set; } = string.Empty;
        public string? SnapshotUrl { get; set; }
        public CctvStreamType StreamType { get; set; }
        public CctvStreamProtocol Protocol { get; set; }
        public int? Port { get; set; }
        public string Location { get; set; } = string.Empty;
        public int? ContainmentId { get; set; }
        public int? RackId { get; set; }
        public CctvResolution Resolution { get; set; }
        public int FrameRate { get; set; }
        public bool IsActive { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastOnlineAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int CreatedBy { get; set; }
        public string? ContainmentName { get; set; }
        public string? RackName { get; set; }
        public bool ShowDashboard { get; set; }
    }
}