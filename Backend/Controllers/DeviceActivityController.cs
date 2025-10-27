using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;
using DeviceActivityInfo = Backend.Services.DeviceActivityInfo;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeviceActivityController : ControllerBase
    {
        private readonly IDeviceActivityService _deviceActivityService;
        private readonly ILogger<DeviceActivityController> _logger;

        public DeviceActivityController(
            IDeviceActivityService deviceActivityService,
            ILogger<DeviceActivityController> logger)
        {
            _deviceActivityService = deviceActivityService;
            _logger = logger;
        }

        /// <summary>
        /// Get activity status for all devices
        /// </summary>
        [HttpGet("all")]
        public async Task<ActionResult<ApiResponse<List<DeviceActivityInfo>>>> GetAllDevicesActivity()
        {
            try
            {
                var activityInfo = await _deviceActivityService.GetAllDevicesActivityAsync();

                return Ok(new ApiResponse<List<DeviceActivityInfo>>
                {
                    Success = true,
                    Data = activityInfo,
                    Message = $"Retrieved activity info for {activityInfo.Count} devices"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all devices activity");
                return StatusCode(500, new ApiResponse<List<DeviceActivityInfo>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get activity status for a specific device
        /// </summary>
        [HttpGet("device/{deviceId}")]
        public async Task<ActionResult<ApiResponse<DeviceActivityInfo>>> GetDeviceActivity(int deviceId)
        {
            try
            {
                var activityInfo = await _deviceActivityService.GetDeviceActivityAsync(deviceId);

                return Ok(new ApiResponse<DeviceActivityInfo>
                {
                    Success = true,
                    Data = activityInfo,
                    Message = $"Activity info for device {deviceId}"
                });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new ApiResponse<DeviceActivityInfo>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving device activity for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<DeviceActivityInfo>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Check if a specific device is active
        /// </summary>
        [HttpGet("device/{deviceId}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> IsDeviceActive(int deviceId)
        {
            try
            {
                var isActive = await _deviceActivityService.IsDeviceActiveAsync(deviceId);

                return Ok(new ApiResponse<bool>
                {
                    Success = true,
                    Data = isActive,
                    Message = $"Device {deviceId} is {(isActive ? "active" : "inactive")}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if device {DeviceId} is active", deviceId);
                return StatusCode(500, new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Manually trigger device activity status update for all devices
        /// </summary>
        [HttpPost("update-all")]
        public async Task<ActionResult<ApiResponse<string>>> UpdateAllDevicesActivity()
        {
            try
            {
                await _deviceActivityService.UpdateDeviceActivityStatusAsync();

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Data = "Update completed",
                    Message = "All device activity statuses have been updated"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating all devices activity");
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Manually trigger device activity status update for a specific device
        /// </summary>
        [HttpPost("device/{deviceId}/update")]
        public async Task<ActionResult<ApiResponse<string>>> UpdateSingleDeviceActivity(int deviceId)
        {
            try
            {
                await _deviceActivityService.UpdateSingleDeviceActivityAsync(deviceId);

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Data = "Update completed",
                    Message = $"Device {deviceId} activity status has been updated"
                });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new ApiResponse<string>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating device activity for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get device activity statistics
        /// </summary>
        [HttpGet("statistics")]
        public async Task<ActionResult<ApiResponse<object>>> GetDeviceActivityStatistics()
        {
            try
            {
                var allDevicesActivity = await _deviceActivityService.GetAllDevicesActivityAsync();

                var stats = new
                {
                    TotalDevices = allDevicesActivity.Count,
                    OnlineDevices = allDevicesActivity.Count(d => d.ActivityStatus == "Online"),
                    OfflineDevices = allDevicesActivity.Count(d => d.ActivityStatus == "Offline"),
                    WarningDevices = allDevicesActivity.Count(d => d.ActivityStatus == "Warning"),
                    NeverSeenDevices = allDevicesActivity.Count(d => d.ActivityStatus == "Never Seen"),
                    SensorDevices = allDevicesActivity.Count(d => d.DeviceType.ToLower() == "sensor"),
                    NonSensorDevices = allDevicesActivity.Count(d => d.DeviceType.ToLower() != "sensor"),
                    DevicesWithRecentData = allDevicesActivity.Count(d => d.HasRecentData),
                    LastUpdateTime = DateTime.UtcNow
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = stats,
                    Message = "Device activity statistics"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving device activity statistics");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }
    }
}