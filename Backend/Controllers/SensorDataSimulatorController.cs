using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SensorDataSimulatorController : ControllerBase
    {
        private readonly SensorDataSimulatorService _simulatorService;
        private readonly ILogger<SensorDataSimulatorController> _logger;

        public SensorDataSimulatorController(
            SensorDataSimulatorService simulatorService,
            ILogger<SensorDataSimulatorController> logger)
        {
            _simulatorService = simulatorService;
            _logger = logger;
        }

        /// <summary>
        /// Generate sample sensor data for testing purposes
        /// </summary>
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateSampleData([FromQuery] int daysBack = 7, [FromQuery] int recordsPerHour = 6)
        {
            try
            {
                if (daysBack < 1 || daysBack > 30)
                {
                    return BadRequest("daysBack must be between 1 and 30");
                }

                if (recordsPerHour < 1 || recordsPerHour > 60)
                {
                    return BadRequest("recordsPerHour must be between 1 and 60");
                }

                _logger.LogInformation("Starting sensor data generation: {DaysBack} days, {RecordsPerHour} records per hour",
                    daysBack, recordsPerHour);

                await _simulatorService.GenerateSampleSensorDataAsync(daysBack, recordsPerHour);

                return Ok(new
                {
                    message = "Sample sensor data generated successfully",
                    daysBack = daysBack,
                    recordsPerHour = recordsPerHour,
                    estimatedRecords = daysBack * 24 * recordsPerHour * 4 // 4 sensor devices
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate sample sensor data");
                return StatusCode(500, new { message = "Failed to generate sample sensor data", error = ex.Message });
            }
        }

        /// <summary>
        /// Get statistics about sensor data in the database
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                var statistics = await _simulatorService.GetSensorDataStatisticsAsync();
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get sensor data statistics");
                return StatusCode(500, new { message = "Failed to get sensor data statistics", error = ex.Message });
            }
        }
    }
}