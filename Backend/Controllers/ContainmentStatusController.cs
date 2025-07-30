using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ContainmentStatusController : ControllerBase
    {
        private readonly IContainmentStatusService _containmentStatusService;
        private readonly ILogger<ContainmentStatusController> _logger;

        public ContainmentStatusController(
            IContainmentStatusService containmentStatusService,
            ILogger<ContainmentStatusController> logger)
        {
            _containmentStatusService = containmentStatusService;
            _logger = logger;
        }

        /// <summary>
        /// Get the latest status for a specific containment
        /// </summary>
        [HttpGet("{containmentId}/latest")]
        public async Task<ActionResult<ContainmentStatus>> GetLatestStatus(int containmentId)
        {
            try
            {
                var status = await _containmentStatusService.GetLatestStatusByContainmentIdAsync(containmentId);
                
                if (status == null)
                {
                    return NotFound($"No status found for containment ID {containmentId}");
                }

                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting latest status for containment {ContainmentId}", containmentId);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get status history for a specific containment
        /// </summary>
        [HttpGet("{containmentId}/history")]
        public async Task<ActionResult<IEnumerable<ContainmentStatus>>> GetStatusHistory(
            int containmentId, 
            [FromQuery] int limit = 100)
        {
            try
            {
                if (limit <= 0 || limit > 1000)
                {
                    return BadRequest("Limit must be between 1 and 1000");
                }

                var statuses = await _containmentStatusService.GetStatusHistoryByContainmentIdAsync(containmentId, limit);
                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting status history for containment {ContainmentId}", containmentId);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get latest status for all containments
        /// </summary>
        [HttpGet("all/latest")]
        public async Task<ActionResult<IEnumerable<ContainmentStatus>>> GetAllLatestStatuses()
        {
            try
            {
                var statuses = await _containmentStatusService.GetAllLatestStatusesAsync();
                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all latest statuses");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Manually process MQTT payload (for testing)
        /// </summary>
        [HttpPost("{containmentId}/process")]
        public async Task<ActionResult<ContainmentStatus>> ProcessMqttPayload(
            int containmentId, 
            [FromBody] object payload)
        {
            try
            {
                var jsonPayload = System.Text.Json.JsonSerializer.Serialize(payload);
                var status = await _containmentStatusService.ProcessMqttPayloadAsync(containmentId, jsonPayload);
                
                return CreatedAtAction(
                    nameof(GetLatestStatus), 
                    new { containmentId = containmentId }, 
                    status);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid payload for containment {ContainmentId}", containmentId);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MQTT payload for containment {ContainmentId}", containmentId);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}