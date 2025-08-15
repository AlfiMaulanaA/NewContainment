using Backend.Models;
using Backend.Services;
using Backend.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AccessLogController : ControllerBase
    {
        private readonly IAccessLogService _accessLogService;
        private readonly ILogger<AccessLogController> _logger;

        public AccessLogController(IAccessLogService accessLogService, ILogger<AccessLogController> logger)
        {
            _accessLogService = accessLogService;
            _logger = logger;
        }

        /// <summary>
        /// Get access logs with filtering and pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AccessLog>>> GetAccessLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] AccessMethod? via = null,
            [FromQuery] string? user = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var (data, total) = await _accessLogService.GetAccessLogsAsync(
                    page, pageSize, via, user, startDate, endDate);

                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving access logs");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get access log by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<AccessLog>>> GetAccessLog(int id)
        {
            try
            {
                var accessLog = await _accessLogService.GetAccessLogByIdAsync(id);
                
                if (accessLog == null)
                {
                    return NotFound(new ApiResponse<AccessLog>
                    {
                        Success = false,
                        Message = $"Access log with ID {id} not found"
                    });
                }

                return Ok(new ApiResponse<AccessLog>
                {
                    Success = true,
                    Data = accessLog,
                    Message = "Access log retrieved successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving access log {AccessLogId}", id);
                return StatusCode(500, new ApiResponse<AccessLog>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Create new access log
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ApiResponse<AccessLog>>> CreateAccessLog([FromBody] AccessLog accessLog)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new ApiResponse<AccessLog>
                    {
                        Success = false,
                        Message = "Invalid data provided"
                    });
                }

                // Set IP address from request
                accessLog.IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                
                var createdLog = await _accessLogService.CreateAccessLogAsync(accessLog);
                
                return CreatedAtAction(nameof(GetAccessLog), 
                    new { id = createdLog.Id },
                    new ApiResponse<AccessLog>
                    {
                        Success = true,
                        Data = createdLog,
                        Message = "Access log created successfully"
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating access log");
                return StatusCode(500, new ApiResponse<AccessLog>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Log software access (for containment controls)
        /// </summary>
        [HttpPost("software")]
        public async Task<ActionResult<ApiResponse<AccessLog>>> LogSoftwareAccess([FromBody] SoftwareAccessRequest request)
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var accessLog = await _accessLogService.LogSoftwareAccessAsync(
                    request.User, 
                    request.Trigger, 
                    request.AdditionalData, 
                    ipAddress);

                return Ok(new ApiResponse<AccessLog>
                {
                    Success = true,
                    Data = accessLog,
                    Message = "Software access logged successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging software access");
                return StatusCode(500, new ApiResponse<AccessLog>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get access logs by via (access method)
        /// </summary>
        [HttpGet("via/{via}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<AccessLog>>>> GetAccessLogsByVia(AccessMethod via)
        {
            try
            {
                var logs = await _accessLogService.GetAccessLogsByViaAsync(via);
                return Ok(new ApiResponse<IEnumerable<AccessLog>>
                {
                    Success = true,
                    Data = logs,
                    Message = $"Retrieved {logs.Count()} access logs for via: {via}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving access logs by via {Via}", via);
                return StatusCode(500, new ApiResponse<IEnumerable<AccessLog>>
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get access logs summary
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetAccessLogSummary(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var summary = await _accessLogService.GetAccessLogSummaryAsync(startDate, endDate);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving access log summary");
                return StatusCode(500, "Internal server error");
            }
        }
    }

    public class SoftwareAccessRequest
    {
        public string User { get; set; } = string.Empty;
        public string Trigger { get; set; } = string.Empty;
        public string? AdditionalData { get; set; }
    }
}