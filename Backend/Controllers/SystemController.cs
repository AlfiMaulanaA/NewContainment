using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Require authentication for system info
    public class SystemController : ControllerBase
    {
        private readonly ISystemInfoService _systemInfoService;
        private readonly ILogger<SystemController> _logger;

        public SystemController(ISystemInfoService systemInfoService, ILogger<SystemController> logger)
        {
            _systemInfoService = systemInfoService;
            _logger = logger;
        }

        /// <summary>
        /// Mendapatkan informasi status sistem secara real-time.
        /// </summary>
        /// <returns>Objek SystemInfo yang berisi metrik sistem.</returns>
        [HttpGet("info")]
        [ProducesResponseType(typeof(SystemInfo), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetSystemInfo()
        {
            try
            {
                _logger.LogDebug("Getting system information");
                var systemInfo = await _systemInfoService.GetSystemInfoAsync();
                return Ok(systemInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system information");
                return StatusCode(500, new { error = "Failed to get system information", details = ex.Message });
            }
        }

        /// <summary>
        /// Mendapatkan informasi status sistem secara real-time (alias untuk backward compatibility).
        /// </summary>
        /// <returns>Objek SystemInfo yang berisi metrik sistem.</returns>
        [HttpGet("status")]
        [ProducesResponseType(typeof(SystemInfo), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> GetSystemStatus()
        {
            return await GetSystemInfo();
        }

        /// <summary>
        /// Refresh dan mendapatkan informasi sistem terbaru (bypass cache).
        /// </summary>
        /// <returns>Objek SystemInfo yang berisi metrik sistem terbaru.</returns>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(SystemInfo), 200)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> RefreshSystemInfo()
        {
            try
            {
                _logger.LogDebug("Refreshing system information (clearing cache)");
                _systemInfoService.ClearCache();
                var systemInfo = await _systemInfoService.GetSystemInfoAsync();
                return Ok(systemInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing system information");
                return StatusCode(500, new { error = "Failed to refresh system information", details = ex.Message });
            }
        }

        /// <summary>
        /// Mendapatkan informasi dasar sistem (hostname, OS, dll).
        /// </summary>
        /// <returns>Informasi dasar sistem.</returns>
        [HttpGet("basic")]
        [ProducesResponseType(typeof(object), 200)]
        public IActionResult GetBasicSystemInfo()
        {
            try
            {
                var basicInfo = new
                {
                    hostname = Environment.MachineName,
                    os_platform = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
                    os_version = Environment.OSVersion.VersionString,
                    processor_count = Environment.ProcessorCount,
                    clr_version = Environment.Version.ToString(),
                    working_set = Environment.WorkingSet,
                    timestamp = DateTime.UtcNow
                };

                return Ok(basicInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting basic system information");
                return StatusCode(500, new { error = "Failed to get basic system information" });
            }
        }

        /// <summary>
        /// Health check endpoint untuk system monitoring.
        /// </summary>
        /// <returns>Status kesehatan sistem.</returns>
        [HttpGet("health")]
        [AllowAnonymous] // Allow anonymous access for health checks
        [ProducesResponseType(200)]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                uptime_ms = Environment.TickCount64
            });
        }
    }
}