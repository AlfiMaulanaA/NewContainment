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
    public class SensorDataConfigurationController : ControllerBase
    {
        private readonly ISensorDataConfigurationService _configService;
        private readonly IEnhancedDeviceSensorDataService _sensorDataService;
        private readonly ILogger<SensorDataConfigurationController> _logger;

        public SensorDataConfigurationController(
            ISensorDataConfigurationService configService,
            IEnhancedDeviceSensorDataService sensorDataService,
            ILogger<SensorDataConfigurationController> logger)
        {
            _configService = configService;
            _sensorDataService = sensorDataService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        // Configuration Management
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SensorDataConfiguration>>> GetAllConfigurations()
        {
            try
            {
                var configurations = await _configService.GetAllConfigurationsAsync();
                return Ok(configurations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data configurations");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SensorDataConfiguration>> GetConfigurationById(int id)
        {
            try
            {
                var configuration = await _configService.GetConfigurationByIdAsync(id);
                if (configuration == null)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("global")]
        public async Task<ActionResult<SensorDataConfiguration>> GetGlobalConfiguration()
        {
            try
            {
                var configuration = await _configService.GetGlobalConfigurationAsync();
                if (configuration == null)
                    return NotFound(new { success = false, message = "Global configuration not found" });

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving global configuration");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("device/{deviceId}")]
        public async Task<ActionResult<SensorDataConfiguration>> GetConfigurationByDevice(int deviceId)
        {
            try
            {
                var configuration = await _configService.GetEffectiveConfigurationAsync(deviceId);
                if (configuration == null)
                    return NotFound(new { success = false, message = "Configuration not found for device" });

                return Ok(configuration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving configuration for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult<SensorDataConfiguration>> CreateConfiguration([FromBody] CreateConfigurationRequest request)
        {
            try
            {
                var configuration = new SensorDataConfiguration
                {
                    Name = request.Name,
                    Description = request.Description,
                    SaveIntervalSeconds = request.SaveIntervalSeconds,
                    IsIntervalEnabled = request.IsIntervalEnabled,
                    IsTemperatureThresholdEnabled = request.IsTemperatureThresholdEnabled,
                    TemperatureUpperThreshold = request.TemperatureUpperThreshold,
                    TemperatureLowerThreshold = request.TemperatureLowerThreshold,
                    TemperatureColdColor = request.TemperatureColdColor ?? "#3B82F6",
                    TemperatureNormalColor = request.TemperatureNormalColor ?? "#10B981",
                    TemperatureWarmColor = request.TemperatureWarmColor ?? "#F59E0B",
                    TemperatureHotColor = request.TemperatureHotColor ?? "#EF4444",
                    TemperatureCriticalColor = request.TemperatureCriticalColor ?? "#7C2D12",
                    TemperatureColdMax = request.TemperatureColdMax,
                    TemperatureNormalMin = request.TemperatureNormalMin,
                    TemperatureNormalMax = request.TemperatureNormalMax,
                    TemperatureWarmMin = request.TemperatureWarmMin,
                    TemperatureWarmMax = request.TemperatureWarmMax,
                    TemperatureHotMin = request.TemperatureHotMin,
                    TemperatureHotMax = request.TemperatureHotMax,
                    TemperatureCriticalMin = request.TemperatureCriticalMin,
                    AutoSaveOnThresholdExceed = request.AutoSaveOnThresholdExceed,
                    AutoSaveOnUpperThreshold = request.AutoSaveOnUpperThreshold,
                    AutoSaveOnLowerThreshold = request.AutoSaveOnLowerThreshold,
                    EnableNotifications = request.EnableNotifications,
                    NotificationRecipients = request.NotificationRecipients,
                    DeviceId = request.DeviceId,
                    ContainmentId = request.ContainmentId,
                    IsGlobalConfiguration = request.IsGlobalConfiguration,
                    CreatedBy = GetCurrentUserId()
                };

                var createdConfig = await _configService.CreateConfigurationAsync(configuration);
                return CreatedAtAction(nameof(GetConfigurationById), new { id = createdConfig.Id }, createdConfig);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sensor data configuration");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult<SensorDataConfiguration>> UpdateConfiguration(int id, [FromBody] UpdateConfigurationRequest request)
        {
            try
            {
                var existingConfig = await _configService.GetConfigurationByIdAsync(id);
                if (existingConfig == null)
                    return NotFound(new { success = false, message = "Configuration not found" });

                existingConfig.Name = request.Name ?? existingConfig.Name;
                existingConfig.Description = request.Description ?? existingConfig.Description;
                existingConfig.SaveIntervalSeconds = request.SaveIntervalSeconds ?? existingConfig.SaveIntervalSeconds;
                existingConfig.IsIntervalEnabled = request.IsIntervalEnabled ?? existingConfig.IsIntervalEnabled;
                existingConfig.IsTemperatureThresholdEnabled = request.IsTemperatureThresholdEnabled ?? existingConfig.IsTemperatureThresholdEnabled;
                existingConfig.TemperatureUpperThreshold = request.TemperatureUpperThreshold ?? existingConfig.TemperatureUpperThreshold;
                existingConfig.TemperatureLowerThreshold = request.TemperatureLowerThreshold ?? existingConfig.TemperatureLowerThreshold;
                existingConfig.AutoSaveOnThresholdExceed = request.AutoSaveOnThresholdExceed ?? existingConfig.AutoSaveOnThresholdExceed;
                existingConfig.EnableNotifications = request.EnableNotifications ?? existingConfig.EnableNotifications;
                existingConfig.UpdatedBy = GetCurrentUserId();

                var updatedConfig = await _configService.UpdateConfigurationAsync(existingConfig);
                return Ok(updatedConfig);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteConfiguration(int id)
        {
            try
            {
                var success = await _configService.DeleteConfigurationAsync(id);
                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = "Configuration deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Interval Management (Task 7)
        [HttpPost("{id}/interval")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult> UpdateSaveInterval(int id, [FromBody] UpdateIntervalRequest request)
        {
            try
            {
                var success = await _configService.UpdateSaveIntervalAsync(id, request.IntervalSeconds, GetCurrentUserId());
                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = "Save interval updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating save interval for configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("{id}/interval/toggle")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult> ToggleInterval(int id, [FromBody] ToggleRequest request)
        {
            try
            {
                var success = await _configService.EnableDisableIntervalAsync(id, request.IsEnabled, GetCurrentUserId());
                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = $"Interval {(request.IsEnabled ? "enabled" : "disabled")} successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling interval for configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Temperature Threshold Management (Task 8)
        [HttpPost("{id}/thresholds")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult> UpdateTemperatureThresholds(int id, [FromBody] UpdateThresholdsRequest request)
        {
            try
            {
                var success = await _configService.UpdateTemperatureThresholdsAsync(id, request.UpperThreshold, request.LowerThreshold, GetCurrentUserId());
                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = "Temperature thresholds updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating temperature thresholds for configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("{id}/thresholds/toggle")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult> ToggleThresholds(int id, [FromBody] ToggleRequest request)
        {
            try
            {
                var success = await _configService.EnableDisableThresholdsAsync(id, request.IsEnabled, GetCurrentUserId());
                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = $"Temperature thresholds {(request.IsEnabled ? "enabled" : "disabled")} successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling thresholds for configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Color Range Management (Task 8)
        [HttpPost("{id}/colors")]
        [Authorize(Roles = "Admin,Developer")]
        public async Task<ActionResult> UpdateTemperatureColors(int id, [FromBody] UpdateColorsRequest request)
        {
            try
            {
                var success = await _configService.UpdateTemperatureColorsAsync(
                    id,
                    request.ColdColor,
                    request.NormalColor,
                    request.WarmColor,
                    request.HotColor,
                    request.CriticalColor,
                    GetCurrentUserId()
                );

                if (!success)
                    return NotFound(new { success = false, message = "Configuration not found" });

                return Ok(new { success = true, message = "Temperature colors updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating temperature colors for configuration {ConfigId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Enhanced Sensor Data Endpoints
        [HttpGet("device/{deviceId}/sensor-data")]
        public async Task<ActionResult> GetEnhancedSensorData(int deviceId, int page = 1, int pageSize = 50)
        {
            try
            {
                var data = await _sensorDataService.GetEnhancedSensorDataAsync(deviceId, page, pageSize);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving enhanced sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("device/{deviceId}/temperature-data")]
        public async Task<ActionResult> GetTemperatureDataWithColors(int deviceId, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var data = await _sensorDataService.GetTemperatureDataWithColorsAsync(deviceId, startDate, endDate);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving temperature data with colors for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("device/{deviceId}/latest")]
        public async Task<ActionResult> GetLatestSensorDataWithStatus(int deviceId)
        {
            try
            {
                var data = await _sensorDataService.GetLatestSensorDataWithStatusAsync(deviceId);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving latest sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Auto-save and Threshold Violations (Task 9)
        [HttpGet("auto-save-logs")]
        public async Task<ActionResult> GetAutoSaveLogs(int page = 1, int pageSize = 50, int? deviceId = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var logs = await _configService.GetAutoSaveLogsAsync(page, pageSize, deviceId, startDate, endDate);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving auto-save logs");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("auto-save-statistics")]
        public async Task<ActionResult> GetAutoSaveStatistics(DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var stats = await _configService.GetAutoSaveStatisticsAsync(startDate, endDate);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving auto-save statistics");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet("device/{deviceId}/threshold-violations")]
        public async Task<ActionResult> GetThresholdViolations(int deviceId, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var violations = await _sensorDataService.GetThresholdViolationsAsync(deviceId, startDate, endDate);
                return Ok(violations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving threshold violations for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Configuration validation and summary
        [HttpGet("device/{deviceId}/summary")]
        public async Task<ActionResult> GetSensorDataWithConfiguration(int deviceId)
        {
            try
            {
                var summary = await _sensorDataService.GetSensorDataWithConfigurationAsync(deviceId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data summary for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // Request DTOs
    public class CreateConfigurationRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SaveIntervalSeconds { get; set; } = 300;
        public bool IsIntervalEnabled { get; set; } = true;
        public bool IsTemperatureThresholdEnabled { get; set; } = false;
        public decimal? TemperatureUpperThreshold { get; set; }
        public decimal? TemperatureLowerThreshold { get; set; }
        public string? TemperatureColdColor { get; set; }
        public string? TemperatureNormalColor { get; set; }
        public string? TemperatureWarmColor { get; set; }
        public string? TemperatureHotColor { get; set; }
        public string? TemperatureCriticalColor { get; set; }
        public decimal TemperatureColdMax { get; set; } = 15.0m;
        public decimal TemperatureNormalMin { get; set; } = 15.1m;
        public decimal TemperatureNormalMax { get; set; } = 25.0m;
        public decimal TemperatureWarmMin { get; set; } = 25.1m;
        public decimal TemperatureWarmMax { get; set; } = 30.0m;
        public decimal TemperatureHotMin { get; set; } = 30.1m;
        public decimal TemperatureHotMax { get; set; } = 35.0m;
        public decimal TemperatureCriticalMin { get; set; } = 35.1m;
        public bool AutoSaveOnThresholdExceed { get; set; } = false;
        public bool AutoSaveOnUpperThreshold { get; set; } = true;
        public bool AutoSaveOnLowerThreshold { get; set; } = false;
        public bool EnableNotifications { get; set; } = false;
        public string? NotificationRecipients { get; set; }
        public int? DeviceId { get; set; }
        public int? ContainmentId { get; set; }
        public bool IsGlobalConfiguration { get; set; } = false;
    }

    public class UpdateConfigurationRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int? SaveIntervalSeconds { get; set; }
        public bool? IsIntervalEnabled { get; set; }
        public bool? IsTemperatureThresholdEnabled { get; set; }
        public decimal? TemperatureUpperThreshold { get; set; }
        public decimal? TemperatureLowerThreshold { get; set; }
        public bool? AutoSaveOnThresholdExceed { get; set; }
        public bool? AutoSaveOnUpperThreshold { get; set; }
        public bool? AutoSaveOnLowerThreshold { get; set; }
        public bool? EnableNotifications { get; set; }
        public string? NotificationRecipients { get; set; }
    }

    public class UpdateIntervalRequest
    {
        public int IntervalSeconds { get; set; }
    }

    public class UpdateThresholdsRequest
    {
        public decimal? UpperThreshold { get; set; }
        public decimal? LowerThreshold { get; set; }
    }

    public class UpdateColorsRequest
    {
        public string ColdColor { get; set; } = string.Empty;
        public string NormalColor { get; set; } = string.Empty;
        public string WarmColor { get; set; } = string.Empty;
        public string HotColor { get; set; } = string.Empty;
        public string CriticalColor { get; set; } = string.Empty;
    }

    public class ToggleRequest
    {
        public bool IsEnabled { get; set; }
    }
}