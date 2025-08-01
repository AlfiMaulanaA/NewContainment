using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmergencyReportController : ControllerBase
    {
        private readonly IEmergencyReportService _emergencyReportService;
        private readonly ILogger<EmergencyReportController> _logger;

        public EmergencyReportController(
            IEmergencyReportService emergencyReportService,
            ILogger<EmergencyReportController> logger)
        {
            _emergencyReportService = emergencyReportService;
            _logger = logger;
        }

        /// <summary>
        /// Get emergency reports with filtering options
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmergencyReport>>> GetEmergencyReports(
            [FromQuery] string? emergencyType = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 500)
                {
                    return BadRequest("Page size cannot exceed 500");
                }

                var filter = new EmergencyReportFilter
                {
                    EmergencyType = emergencyType,
                    StartDate = startDate,
                    EndDate = endDate,
                    IsActive = isActive,
                    Page = page,
                    PageSize = pageSize
                };

                var reports = await _emergencyReportService.GetEmergencyReportsAsync(filter);
                return Ok(reports);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting emergency reports");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get emergency report summary statistics
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<IEnumerable<EmergencyReportSummary>>> GetEmergencyReportSummary(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var summaries = await _emergencyReportService.GetEmergencyReportSummaryAsync(startDate, endDate);
                return Ok(summaries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting emergency report summary");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get currently active emergencies
        /// </summary>
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<EmergencyReport>>> GetActiveEmergencies()
        {
            try
            {
                var filter = new EmergencyReportFilter
                {
                    IsActive = true,
                    PageSize = 100
                };

                var activeEmergencies = await _emergencyReportService.GetEmergencyReportsAsync(filter);
                return Ok(activeEmergencies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active emergencies");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get active emergency for specific type
        /// </summary>
        [HttpGet("active/{emergencyType}")]
        public async Task<ActionResult<EmergencyReport>> GetActiveEmergency(string emergencyType)
        {
            try
            {
                var activeEmergency = await _emergencyReportService.GetActiveEmergencyAsync(emergencyType);
                
                if (activeEmergency == null)
                {
                    return NotFound($"No active emergency found for type: {emergencyType}");
                }

                return Ok(activeEmergency);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active emergency for type {EmergencyType}", emergencyType);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Manually close an active emergency (emergency use only)
        /// </summary>
        [HttpPost("close/{emergencyType}")]
        public async Task<ActionResult> CloseActiveEmergency(string emergencyType)
        {
            try
            {
                await _emergencyReportService.CloseActiveEmergencyAsync(emergencyType);
                
                _logger.LogWarning("Emergency {EmergencyType} manually closed via API", emergencyType);
                
                return Ok(new { 
                    message = $"Emergency {emergencyType} has been manually closed",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing active emergency for type {EmergencyType}", emergencyType);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get emergency types and their current status
        /// </summary>
        [HttpGet("status")]
        public async Task<ActionResult<object>> GetEmergencyStatus()
        {
            try
            {
                var emergencyTypes = new[] { "SmokeDetector", "FSS", "EmergencyButton", "EmergencyTemp" };
                var statusList = new List<object>();

                foreach (var type in emergencyTypes)
                {
                    var activeEmergency = await _emergencyReportService.GetActiveEmergencyAsync(type);
                    statusList.Add(new
                    {
                        EmergencyType = type,
                        IsActive = activeEmergency != null,
                        ActiveSince = activeEmergency?.StartTime,
                        Duration = activeEmergency != null ? (TimeSpan?)(DateTime.UtcNow - activeEmergency.StartTime) : null
                    });
                }

                return Ok(new
                {
                    Timestamp = DateTime.UtcNow,
                    EmergencyStatuses = statusList
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting emergency status");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}