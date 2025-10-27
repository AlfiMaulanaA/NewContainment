using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeviceSensorDataController : ControllerBase
    {
        private readonly IDeviceSensorDataService _sensorDataService;
        private readonly ILogger<DeviceSensorDataController> _logger;

        public DeviceSensorDataController(
            IDeviceSensorDataService sensorDataService,
            ILogger<DeviceSensorDataController> logger)
        {
            _sensorDataService = sensorDataService;
            _logger = logger;
        }

        /// <summary>
        /// Get sensor data with advanced filtering and pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<DeviceSensorData>>>> GetSensorData(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] int? deviceId = null,
            [FromQuery] int? rackId = null,
            [FromQuery] int? containmentId = null,
            [FromQuery] string? sensorType = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var (data, total) = await _sensorDataService.GetSensorDataAsync(
                    page, pageSize, deviceId, rackId, containmentId, sensorType, startDate, endDate);

                return Ok(new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Retrieved {data.Count()} sensor data records (page {page}/{Math.Ceiling((double)total / pageSize)})",
                    Pagination = new PaginationInfo
                    {
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalItems = total,
                        TotalPages = (int)Math.Ceiling((double)total / pageSize),
                        HasNextPage = page * pageSize < total,
                        HasPreviousPage = page > 1
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data");
                return StatusCode(500, new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get latest sensor data with limit
        /// </summary>
        [HttpGet("latest")]
        public async Task<ActionResult<ApiResponse<IEnumerable<DeviceSensorData>>>> GetLatestSensorData(
            [FromQuery] int limit = 100)
        {
            try
            {
                var data = await _sensorDataService.GetLatestSensorDataAsync(limit);
                return Ok(new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Retrieved latest {data.Count()} sensor data records"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving latest sensor data");
                return StatusCode(500, new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get sensor data by device ID
        /// </summary>
        [HttpGet("device/{deviceId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<DeviceSensorData>>>> GetSensorDataByDevice(
            int deviceId,
            [FromQuery] int limit = 50)
        {
            try
            {
                var data = await _sensorDataService.GetSensorDataByDeviceIdAsync(deviceId);
                var limitedData = data.Take(limit);

                return Ok(new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = true,
                    Data = limitedData,
                    Message = $"Retrieved {limitedData.Count()} sensor data records for device {deviceId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get latest sensor data for a specific device
        /// </summary>
        [HttpGet("device/{deviceId}/latest")]
        public async Task<ActionResult<ApiResponse<DeviceSensorData>>> GetLatestSensorDataByDevice(int deviceId)
        {
            try
            {
                var data = await _sensorDataService.GetLatestSensorDataByDeviceAsync(deviceId);

                if (data == null)
                {
                    return NotFound(new ApiResponse<DeviceSensorData>
                    {
                        Success = false,
                        Message = $"No sensor data found for device {deviceId}"
                    });
                }

                return Ok(new ApiResponse<DeviceSensorData>
                {
                    Success = true,
                    Data = data,
                    Message = $"Latest sensor data for device {deviceId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving latest sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<DeviceSensorData>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get sensor data by rack ID
        /// </summary>
        [HttpGet("rack/{rackId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<DeviceSensorData>>>> GetSensorDataByRack(
            int rackId,
            [FromQuery] int limit = 100)
        {
            try
            {
                var data = await _sensorDataService.GetSensorDataByRackIdAsync(rackId);
                var limitedData = data.Take(limit);

                return Ok(new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = true,
                    Data = limitedData,
                    Message = $"Retrieved {limitedData.Count()} sensor data records for rack {rackId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data for rack {RackId}", rackId);
                return StatusCode(500, new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get sensor data by containment ID
        /// </summary>
        [HttpGet("containment/{containmentId}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<DeviceSensorData>>>> GetSensorDataByContainment(
            int containmentId,
            [FromQuery] int limit = 100)
        {
            try
            {
                var data = await _sensorDataService.GetSensorDataByContainmentIdAsync(containmentId);
                var limitedData = data.Take(limit);

                return Ok(new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = true,
                    Data = limitedData,
                    Message = $"Retrieved {limitedData.Count()} sensor data records for containment {containmentId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data for containment {ContainmentId}", containmentId);
                return StatusCode(500, new ApiResponse<IEnumerable<DeviceSensorData>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get sensor statistics for a device
        /// </summary>
        [HttpGet("device/{deviceId}/statistics")]
        public async Task<ActionResult<ApiResponse<object>>> GetSensorStatistics(
            int deviceId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var stats = await _sensorDataService.GetSensorStatisticsAsync(deviceId, startDate, endDate);
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = stats,
                    Message = $"Statistics for device {deviceId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving statistics for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get data history for a specific key in device sensor data
        /// </summary>
        [HttpGet("device/{deviceId}/data-history/{dataKey}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetDataHistory(
            int deviceId,
            string dataKey,
            [FromQuery] int hours = 24)
        {
            try
            {
                var timeRange = TimeSpan.FromHours(hours);
                var history = await _sensorDataService.GetDataHistoryAsync(deviceId, dataKey, timeRange);

                return Ok(new ApiResponse<IEnumerable<object>>
                {
                    Success = true,
                    Data = history,
                    Message = $"{dataKey} history for device {deviceId} (last {hours} hours)"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving {DataKey} history for device {DeviceId}", dataKey, deviceId);
                return StatusCode(500, new ApiResponse<IEnumerable<object>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get all active topics
        /// </summary>
        [HttpGet("topics")]
        public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetActiveTopics()
        {
            try
            {
                var topics = await _sensorDataService.GetActiveTopicsAsync();
                return Ok(new ApiResponse<IEnumerable<string>>
                {
                    Success = true,
                    Data = topics,
                    Message = $"Retrieved {topics.Count()} active topics"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active topics");
                return StatusCode(500, new ApiResponse<IEnumerable<string>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get topics by containment
        /// </summary>
        [HttpGet("containment/{containmentId}/topics")]
        public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetTopicsByContainment(int containmentId)
        {
            try
            {
                var topics = await _sensorDataService.GetTopicsByContainmentAsync(containmentId);
                return Ok(new ApiResponse<IEnumerable<string>>
                {
                    Success = true,
                    Data = topics,
                    Message = $"Retrieved {topics.Count()} topics for containment {containmentId}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving topics for containment {ContainmentId}", containmentId);
                return StatusCode(500, new ApiResponse<IEnumerable<string>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get aggregated sensor data for charts
        /// </summary>
        [HttpGet("device/{deviceId}/aggregated/{dataKey}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAggregatedData(
            int deviceId,
            string dataKey,
            [FromQuery] string interval = "hour",
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-7);
                var end = endDate ?? DateTime.UtcNow;

                var data = await _sensorDataService.GetAggregatedDataAsync(deviceId, dataKey, interval, start, end);

                return Ok(new ApiResponse<IEnumerable<object>>
                {
                    Success = true,
                    Data = data,
                    Message = $"Aggregated {dataKey} data for device {deviceId} ({interval} intervals)"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving aggregated data for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<IEnumerable<object>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get available sensor types
        /// </summary>
        [HttpGet("sensor-types")]
        public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetAvailableSensorTypes()
        {
            try
            {
                var sensorTypes = await _sensorDataService.GetAvailableSensorTypesAsync();
                return Ok(new ApiResponse<IEnumerable<string>>
                {
                    Success = true,
                    Data = sensorTypes,
                    Message = $"Retrieved {sensorTypes.Count()} sensor types"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor types");
                return StatusCode(500, new ApiResponse<IEnumerable<string>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get sensor data summary
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<object>>> GetSensorDataSummary(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var summary = await _sensorDataService.GetSensorDataSummaryAsync(startDate, endDate);
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = summary,
                    Message = "Sensor data summary retrieved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving sensor data summary");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Manually parse and store sensor data (for testing)
        /// </summary>
        [HttpPost("device/{deviceId}/parse")]
        public async Task<ActionResult<ApiResponse<DeviceSensorData>>> ParseAndStoreSensorData(
            int deviceId,
            [FromBody] ManualSensorDataRequest request)
        {
            try
            {
                var result = await _sensorDataService.ParseAndStoreSensorDataAsync(
                    deviceId,
                    request.Topic,
                    request.Payload);

                return Ok(new ApiResponse<DeviceSensorData>
                {
                    Success = true,
                    Data = result,
                    Message = $"Sensor data parsed and stored for device {deviceId}"
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ApiResponse<DeviceSensorData>
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing and storing sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new ApiResponse<DeviceSensorData>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        // DELETE endpoints for sensor data management
        [HttpDelete("all")]
        public async Task<ActionResult<object>> DeleteAllSensorData()
        {
            try
            {
                _logger.LogWarning("Request to delete ALL sensor data received from user {User}", User?.Identity?.Name ?? "Unknown");
                
                var deletedCount = await _sensorDataService.DeleteAllSensorDataAsync();
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully deleted all {deletedCount} sensor data records",
                    deletedCount = deletedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all sensor data");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("date-range")]
        public async Task<ActionResult<object>> DeleteSensorDataByDateRange([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                if (startDate >= endDate)
                {
                    return BadRequest(new { success = false, message = "Start date must be before end date" });
                }

                _logger.LogWarning("Request to delete sensor data from {StartDate} to {EndDate} received from user {User}", 
                    startDate, endDate, User?.Identity?.Name ?? "Unknown");
                
                var deletedCount = await _sensorDataService.DeleteSensorDataByDateRangeAsync(startDate, endDate);
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully deleted {deletedCount} sensor data records from {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}",
                    deletedCount = deletedCount,
                    startDate = startDate,
                    endDate = endDate
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sensor data by date range {StartDate} to {EndDate}", startDate, endDate);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("device/{deviceId}")]
        public async Task<ActionResult<object>> DeleteSensorDataByDevice(int deviceId)
        {
            try
            {
                _logger.LogWarning("Request to delete sensor data for device {DeviceId} received from user {User}", 
                    deviceId, User?.Identity?.Name ?? "Unknown");
                
                var deletedCount = await _sensorDataService.DeleteSensorDataByDeviceAsync(deviceId);
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully deleted {deletedCount} sensor data records for device {deviceId}",
                    deletedCount = deletedCount,
                    deviceId = deviceId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sensor data for device {DeviceId}", deviceId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("older-than/{days}")]
        public async Task<ActionResult<object>> DeleteOldSensorData(int days)
        {
            try
            {
                if (days <= 0)
                {
                    return BadRequest(new { success = false, message = "Days must be greater than 0" });
                }

                _logger.LogWarning("Request to delete sensor data older than {Days} days received from user {User}", 
                    days, User?.Identity?.Name ?? "Unknown");
                
                var maxAge = TimeSpan.FromDays(days);
                var deletedCount = await _sensorDataService.DeleteOldSensorDataAsync(maxAge);
                
                return Ok(new { 
                    success = true, 
                    message = $"Successfully deleted {deletedCount} sensor data records older than {days} days",
                    deletedCount = deletedCount,
                    maxAgeDays = days
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sensor data older than {Days} days", days);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    public class ManualSensorDataRequest
    {
        public string Topic { get; set; } = string.Empty;
        public string Payload { get; set; } = string.Empty;
    }
}