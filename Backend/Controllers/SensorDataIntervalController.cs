using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SensorDataIntervalController : ControllerBase
    {
        private readonly ISensorDataIntervalService _intervalService;
        private readonly ILogger<SensorDataIntervalController> _logger;

        public SensorDataIntervalController(
            ISensorDataIntervalService intervalService,
            ILogger<SensorDataIntervalController> logger)
        {
            _intervalService = intervalService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        // Configuration Management
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SensorDataIntervalConfig>>> GetAllConfigurations()
        {
            try
            {
                var configurations = await _intervalService.GetAllConfigurationsAsync();
                return Ok(new { success = true, data = configurations });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor interval configurations");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SensorDataIntervalConfig>> GetConfiguration(int id)
        {
            try
            {
                var configuration = await _intervalService.GetConfigurationByIdAsync(id);
                if (configuration == null)
                {
                    return NotFound(new { success = false, message = "Configuration not found" });
                }

                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor interval configuration {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<SensorDataIntervalConfig>> CreateConfiguration(
            [FromBody] CreateSensorIntervalConfigRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var configuration = new SensorDataIntervalConfig
                {
                    Name = request.Name,
                    Description = request.Description,
                    SaveIntervalMinutes = request.SaveIntervalMinutes,
                    IsEnabled = request.IsEnabled,
                    DeviceId = request.DeviceId,
                    ContainmentId = request.ContainmentId,
                    IsGlobalConfiguration = request.IsGlobalConfiguration,
                    CreatedBy = userId,
                    UpdatedBy = userId
                };

                var createdConfig = await _intervalService.CreateConfigurationAsync(configuration);
                return CreatedAtAction(nameof(GetConfiguration), 
                    new { id = createdConfig.Id }, 
                    new { success = true, data = createdConfig });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sensor interval configuration");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<SensorDataIntervalConfig>> UpdateConfiguration(
            int id, [FromBody] UpdateSensorIntervalConfigRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var configuration = new SensorDataIntervalConfig
                {
                    Id = id,
                    Name = request.Name,
                    Description = request.Description,
                    SaveIntervalMinutes = request.SaveIntervalMinutes,
                    IsEnabled = request.IsEnabled,
                    UpdatedBy = userId
                };

                var updatedConfig = await _intervalService.UpdateConfigurationAsync(configuration);
                return Ok(new { success = true, data = updatedConfig });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sensor interval configuration {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteConfiguration(int id)
        {
            try
            {
                var deleted = await _intervalService.DeleteConfigurationAsync(id);
                if (!deleted)
                {
                    return NotFound(new { success = false, message = "Configuration not found" });
                }

                return Ok(new { success = true, message = "Configuration deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sensor interval configuration {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Specific configuration types
        [HttpGet("global")]
        public async Task<ActionResult<SensorDataIntervalConfig>> GetGlobalConfiguration()
        {
            try
            {
                var configuration = await _intervalService.GetGlobalConfigurationAsync();
                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving global sensor interval configuration");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("device/{deviceId}")]
        public async Task<ActionResult<SensorDataIntervalConfig>> GetDeviceConfiguration(int deviceId)
        {
            try
            {
                var configuration = await _intervalService.GetDeviceConfigurationAsync(deviceId);
                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving device sensor interval configuration for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("containment/{containmentId}")]
        public async Task<ActionResult<SensorDataIntervalConfig>> GetContainmentConfiguration(int containmentId)
        {
            try
            {
                var configuration = await _intervalService.GetContainmentConfigurationAsync(containmentId);
                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving containment sensor interval configuration for containment {ContainmentId}", containmentId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("effective/{deviceId}")]
        public async Task<ActionResult<SensorDataIntervalConfig>> GetEffectiveConfiguration(int deviceId, [FromQuery] int? containmentId = null)
        {
            try
            {
                var configuration = await _intervalService.GetEffectiveConfigurationAsync(deviceId, containmentId);
                return Ok(new { success = true, data = configuration });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving effective sensor interval configuration for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Available intervals
        [HttpGet("available-intervals")]
        public ActionResult GetAvailableIntervals()
        {
            try
            {
                var intervals = _intervalService.GetAvailableIntervals();
                var formattedIntervals = intervals.Select(i => new { value = i.Value, label = i.Label }).ToList();
                return Ok(new { success = true, data = formattedIntervals });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available intervals");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Toggle enable/disable
        [HttpPut("{id}/toggle")]
        public async Task<ActionResult> ToggleConfiguration(int id, [FromBody] ToggleConfigRequest request)
        {
            try
            {
                var success = await _intervalService.ToggleConfigurationAsync(id, request.Enabled);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Configuration not found" });
                }

                return Ok(new { success = true, message = $"Configuration {(request.Enabled ? "enabled" : "disabled")} successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling sensor interval configuration {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Update interval only
        [HttpPut("{id}/interval")]
        public async Task<ActionResult> UpdateInterval(int id, [FromBody] UpdateSensorIntervalRequest request)
        {
            try
            {
                var success = await _intervalService.UpdateIntervalAsync(id, request.IntervalMinutes);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Configuration not found" });
                }

                return Ok(new { success = true, message = "Interval updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating interval for configuration {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Bulk operations
        [HttpPost("set-global-interval")]
        public async Task<ActionResult> SetGlobalInterval([FromBody] SetSensorIntervalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var success = await _intervalService.SetGlobalIntervalAsync(request.IntervalMinutes, userId);
                return Ok(new { success, message = "Global interval set successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting global interval");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("set-device-interval")]
        public async Task<ActionResult> SetDeviceInterval([FromBody] SetDeviceIntervalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var success = await _intervalService.SetDeviceIntervalAsync(request.DeviceId, request.IntervalMinutes, userId);
                return Ok(new { success, message = "Device interval set successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting device interval");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("set-containment-interval")]
        public async Task<ActionResult> SetContainmentInterval([FromBody] SetContainmentIntervalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0)
                {
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var success = await _intervalService.SetContainmentIntervalAsync(request.ContainmentId, request.IntervalMinutes, userId);
                return Ok(new { success, message = "Containment interval set successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting containment interval");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Check if should save
        [HttpGet("should-save/{deviceId}")]
        public async Task<ActionResult> ShouldSaveByInterval(int deviceId, [FromQuery] DateTime? timestamp = null, [FromQuery] int? containmentId = null)
        {
            try
            {
                var checkTime = timestamp ?? DateTime.UtcNow;
                var shouldSave = await _intervalService.ShouldSaveByIntervalAsync(deviceId, checkTime, containmentId);
                
                return Ok(new { 
                    success = true, 
                    shouldSave,
                    deviceId,
                    timestamp = checkTime,
                    containmentId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if should save for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // Request DTOs
    public class CreateSensorIntervalConfigRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SaveIntervalMinutes { get; set; } = 15;
        public bool IsEnabled { get; set; } = true;
        public int? DeviceId { get; set; }
        public int? ContainmentId { get; set; }
        public bool IsGlobalConfiguration { get; set; } = false;
    }

    public class UpdateSensorIntervalConfigRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SaveIntervalMinutes { get; set; }
        public bool IsEnabled { get; set; }
    }

    public class ToggleConfigRequest
    {
        public bool Enabled { get; set; }
    }

    public class UpdateSensorIntervalRequest
    {
        public int IntervalMinutes { get; set; }
    }

    public class SetSensorIntervalRequest
    {
        public int IntervalMinutes { get; set; }
    }

    public class SetDeviceIntervalRequest
    {
        public int DeviceId { get; set; }
        public int IntervalMinutes { get; set; }
    }

    public class SetContainmentIntervalRequest
    {
        public int ContainmentId { get; set; }
        public int IntervalMinutes { get; set; }
    }
}