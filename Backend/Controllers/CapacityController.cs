using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CapacityController : ControllerBase
    {
        private readonly ICapacityService _capacityService;
        private readonly ILogger<CapacityController> _logger;

        public CapacityController(ICapacityService capacityService, ILogger<CapacityController> logger)
        {
            _capacityService = capacityService;
            _logger = logger;
        }

        /// <summary>
        /// Get capacity information for a specific rack
        /// </summary>
        [HttpGet("rack/{rackId}")]
        public async Task<IActionResult> GetRackCapacity(int rackId)
        {
            try
            {
                var capacity = await _capacityService.GetRackCapacityAsync(rackId);
                return Ok(new { success = true, data = capacity });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting rack capacity for ID {RackId}", rackId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get capacity information for all racks
        /// </summary>
        [HttpGet("racks")]
        public async Task<IActionResult> GetAllRackCapacities()
        {
            try
            {
                var capacities = await _capacityService.GetAllRackCapacitiesAsync();
                return Ok(new { success = true, data = capacities });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all rack capacities");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get capacity summary across all racks
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetCapacitySummary()
        {
            try
            {
                var summary = await _capacityService.GetCapacitySummaryAsync();
                return Ok(new { success = true, data = summary });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity summary");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get capacity alerts
        /// </summary>
        [HttpGet("alerts")]
        public async Task<IActionResult> GetCapacityAlerts()
        {
            try
            {
                var alerts = await _capacityService.GetCapacityAlertsAsync();
                return Ok(new { success = true, data = alerts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity alerts");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Plan capacity for new devices
        /// </summary>
        [HttpPost("planning")]
        public async Task<IActionResult> PlanCapacity([FromBody] CapacityPlanningRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid request data" });
                }

                if (request.UCapacity <= 0 || request.Quantity <= 0)
                {
                    return BadRequest(new { success = false, message = "UCapacity and Quantity must be greater than 0" });
                }

                var result = await _capacityService.PlanCapacityAsync(request);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error planning capacity for request {@Request}", request);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get capacity utilization statistics
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetCapacityStatistics()
        {
            try
            {
                var capacities = await _capacityService.GetAllRackCapacitiesAsync();
                
                var statistics = new
                {
                    TotalRacks = capacities.Count,
                    HighUtilization = capacities.Count(r => r.UtilizationPercentage >= 80),
                    MediumUtilization = capacities.Count(r => r.UtilizationPercentage >= 60 && r.UtilizationPercentage < 80),
                    LowUtilization = capacities.Count(r => r.UtilizationPercentage < 60),
                    FullCapacity = capacities.Count(r => r.AvailableCapacityU == 0),
                    AverageUtilization = capacities.Count > 0 ? Math.Round(capacities.Average(r => r.UtilizationPercentage), 2) : 0,
                    TotalCapacity = capacities.Sum(r => r.TotalCapacityU),
                    TotalUsed = capacities.Sum(r => r.UsedCapacityU),
                    TotalAvailable = capacities.Sum(r => r.AvailableCapacityU)
                };

                return Ok(new { success = true, data = statistics });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity statistics");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
}