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
        /// Get current status for a specific containment
        /// </summary>
        [HttpGet("{containmentId}")]
        public async Task<ActionResult<ContainmentStatus>> GetStatus(int containmentId)
        {
            try
            {
                var status = await _containmentStatusService.GetStatusByContainmentIdAsync(containmentId);
                
                if (status == null)
                {
                    // Try to initialize default status if not found
                    status = await _containmentStatusService.InitializeDefaultStatusAsync(containmentId);
                }

                return Ok(status);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid containment ID: {ContainmentId}", containmentId);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting status for containment {ContainmentId}", containmentId);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get all containment statuses
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContainmentStatus>>> GetAllStatuses()
        {
            try
            {
                var statuses = await _containmentStatusService.GetAllStatusesAsync();
                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all statuses");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Initialize default status for a containment
        /// </summary>
        [HttpPost("{containmentId}/initialize")]
        public async Task<ActionResult<ContainmentStatus>> InitializeStatus(int containmentId)
        {
            try
            {
                var status = await _containmentStatusService.InitializeDefaultStatusAsync(containmentId);
                return CreatedAtAction(nameof(GetStatus), new { containmentId = containmentId }, status);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid containment ID: {ContainmentId}", containmentId);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing status for containment {ContainmentId}", containmentId);
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
                    nameof(GetStatus), 
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