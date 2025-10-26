using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Models;
using Backend.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Backend.Enums;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeviceController : ControllerBase
    {
        private readonly IDeviceService _deviceService;
        private readonly IDeviceStatusMonitoringService _deviceStatusService;
        private readonly Backend.Data.AppDbContext _context;

        public DeviceController(
            IDeviceService deviceService,
            IDeviceStatusMonitoringService deviceStatusService,
            Backend.Data.AppDbContext context)
        {
            _deviceService = deviceService;
            _deviceStatusService = deviceStatusService;
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Device>>> GetDevices()
        {
            var devices = await _deviceService.GetAllDevicesAsync();
            return Ok(devices);
        }

        [HttpGet("by-rack/{rackId}")]
        public async Task<ActionResult<IEnumerable<Device>>> GetDevicesByRack(int rackId)
        {
            var devices = await _deviceService.GetDevicesByRackIdAsync(rackId);
            return Ok(devices);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Device>> GetDevice(int id)
        {
            var device = await _deviceService.GetDeviceByIdAsync(id);

            if (device == null)
            {
                return NotFound();
            }

            return Ok(device);
        }

        [HttpPost]
        public async Task<ActionResult<Device>> CreateDevice(CreateDeviceRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var device = new Device
            {
                Name = request.Name,
                Type = request.Type,
                RackId = request.RackId,
                Description = request.Description,
                SerialNumber = request.SerialNumber,
                Topic = request.Topic,
                SensorType = request.SensorType,
                UCapacity = request.UCapacity
            };

            var createdDevice = await _deviceService.CreateDeviceAsync(device, userId);
            return CreatedAtAction(nameof(GetDevice), new { id = createdDevice.Id }, createdDevice);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDevice(int id, UpdateDeviceRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var device = new Device
            {
                Name = request.Name,
                Type = request.Type,
                RackId = request.RackId,
                Description = request.Description,
                SerialNumber = request.SerialNumber,
                Topic = request.Topic,
                SensorType = request.SensorType,
                UCapacity = request.UCapacity
            };

            var updatedDevice = await _deviceService.UpdateDeviceAsync(id, device, userId);

            if (updatedDevice == null)
            {
                return NotFound();
            }

            return Ok(updatedDevice);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDevice(int id)
        {
            var result = await _deviceService.DeleteDeviceAsync(id);

            if (!result)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpGet("status")]
        public async Task<ActionResult<IEnumerable<DeviceActivityStatus>>> GetDevicesStatus()
        {
            var statuses = await _deviceStatusService.GetAllDeviceActivityStatusAsync();
            return Ok(statuses);
        }

        [HttpGet("{id}/status")]
        public async Task<ActionResult<DeviceActivityStatus>> GetDeviceStatus(int id)
        {
            var status = await _deviceStatusService.GetDeviceActivityStatusAsync(id);

            if (status == null)
            {
                return NotFound();
            }

            return Ok(status);
        }

        [HttpGet("{id}/online")]
        public async Task<ActionResult<bool>> IsDeviceOnline(int id)
        {
            var isOnline = await _deviceStatusService.IsDeviceOnlineAsync(id);
            return Ok(isOnline);
        }

        [HttpPost("status/check")]
        public async Task<ActionResult> ForceStatusCheck()
        {
            await _deviceStatusService.CheckAndUpdateDeviceStatusesAsync();
            return Ok(new { message = "Device status check completed" });
        }

        [HttpPost("status/initialize")]
        public async Task<ActionResult> InitializeMonitoring()
        {
            await _deviceStatusService.InitializeDeviceMonitoringAsync();
            return Ok(new { message = "Device monitoring initialized" });
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            return 0;
        }
    }

    public class ValidSensorTypeAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value == null)
                return ValidationResult.Success; // Allow null

            if (value is string sensorType)
            {
                var validTypes = SensorTypeExtensions.GetAllDisplayNames();
                if (validTypes.Contains(sensorType))
                {
                    return ValidationResult.Success;
                }
                else
                {
                    return new ValidationResult($"Invalid sensor type. Valid values are: {string.Join(", ", validTypes)}");
                }
            }

            return new ValidationResult("SensorType must be a string");
        }
    }

    public class CreateDeviceRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        public int RackId { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? SerialNumber { get; set; }

        [StringLength(100)]
        public string? Topic { get; set; }

        [StringLength(50)]
        [ValidSensorType]
        public string? SensorType { get; set; }

        public int? UCapacity { get; set; }
    }

    public class UpdateDeviceRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        public int RackId { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? SerialNumber { get; set; }

        [StringLength(100)]
        public string? Topic { get; set; }

        [StringLength(50)]
        [ValidSensorType]
        public string? SensorType { get; set; }

        public int? UCapacity { get; set; }
    }

    public class DeviceStatusResponse
    {
        public int DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public string? SensorType { get; set; }
        public string? Topic { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastSeen { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
