using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/palm-recognition-devices")]
    [Authorize] // Require authentication for all endpoints
    public class PalmRecognitionDeviceController : ControllerBase
    {
        private readonly IPalmRecognitionDeviceService _service;
        private readonly ILogger<PalmRecognitionDeviceController> _logger;

        public PalmRecognitionDeviceController(
            IPalmRecognitionDeviceService service,
            ILogger<PalmRecognitionDeviceController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// Get all palm recognition devices
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PalmRecognitionDevice>>> GetPalmRecognitionDevices()
        {
            try
            {
                var devices = await _service.GetAllPalmRecognitionDevicesAsync();
                _logger.LogInformation("Retrieved {Count} palm recognition devices", devices.Count());
                return Ok(devices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving palm recognition devices");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get a palm recognition device by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PalmRecognitionDevice>> GetPalmRecognitionDevice(int id)
        {
            try
            {
                var device = await _service.GetPalmRecognitionDeviceByIdAsync(id);
                if (device == null)
                {
                    _logger.LogWarning("Palm recognition device with ID {Id} not found", id);
                    return NotFound($"Palm recognition device with ID {id} not found");
                }

                _logger.LogInformation("Retrieved palm recognition device with ID {Id}", id);
                return Ok(device);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving palm recognition device with ID {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Create a new palm recognition device
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PalmRecognitionDevice>> CreatePalmRecognitionDevice(
            CreatePalmRecognitionDeviceRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var device = new PalmRecognitionDevice
                {
                    Name = request.Name,
                    IpAddress = request.IpAddress,
                    IsActive = request.IsActive,
                    Timestamp = DateTime.UtcNow
                };

                var createdDevice = await _service.CreatePalmRecognitionDeviceAsync(device);
                _logger.LogInformation("Created palm recognition device with ID {Id}", createdDevice.Id);

                return CreatedAtAction(
                    nameof(GetPalmRecognitionDevice),
                    new { id = createdDevice.Id },
                    createdDevice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating palm recognition device");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update a palm recognition device
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePalmRecognitionDevice(
            int id,
            UpdatePalmRecognitionDeviceRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var device = new PalmRecognitionDevice
                {
                    Name = request.Name,
                    IpAddress = request.IpAddress,
                    IsActive = request.IsActive
                };

                var updatedDevice = await _service.UpdatePalmRecognitionDeviceAsync(id, device);
                if (updatedDevice == null)
                {
                    _logger.LogWarning("Palm recognition device with ID {Id} not found for update", id);
                    return NotFound($"Palm recognition device with ID {id} not found");
                }

                _logger.LogInformation("Updated palm recognition device with ID {Id}", id);
                return Ok(updatedDevice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating palm recognition device with ID {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Delete a palm recognition device
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePalmRecognitionDevice(int id)
        {
            try
            {
                var result = await _service.DeletePalmRecognitionDeviceAsync(id);
                if (!result)
                {
                    _logger.LogWarning("Palm recognition device with ID {Id} not found for deletion", id);
                    return NotFound($"Palm recognition device with ID {id} not found");
                }

                _logger.LogInformation("Deleted palm recognition device with ID {Id}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting palm recognition device with ID {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Check if a palm recognition device exists
        /// </summary>
        [HttpGet("{id}/exists")]
        public async Task<ActionResult<bool>> PalmRecognitionDeviceExists(int id)
        {
            try
            {
                var exists = await _service.PalmRecognitionDeviceExistsAsync(id);
                return Ok(exists);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if palm recognition device with ID {Id} exists", id);
                return StatusCode(500, "Internal server error");
            }
        }
    }

    public class CreatePalmRecognitionDeviceRequest
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(45)]
        public string IpAddress { get; set; } = string.Empty;

        public bool IsActive { get; set; } = false;
    }

    public class UpdatePalmRecognitionDeviceRequest
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MaxLength(45)]
        public string IpAddress { get; set; } = string.Empty;

        public bool IsActive { get; set; } = false;
    }
}
