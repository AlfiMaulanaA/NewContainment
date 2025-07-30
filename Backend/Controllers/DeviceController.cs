using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Models;
using Backend.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeviceController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DeviceController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
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
                Status = request.Status ?? "Active",
                Topic = request.Topic
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
                Status = request.Status ?? "Active",
                Topic = request.Topic
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
        
        [StringLength(50)]
        public string? Status { get; set; } = "Active";
        
        [StringLength(100)]
        public string? Topic { get; set; }
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
        
        [StringLength(50)]
        public string? Status { get; set; } = "Active";
        
        [StringLength(100)]
        public string? Topic { get; set; }
    }
}