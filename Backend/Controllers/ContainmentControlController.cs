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
    public class ContainmentControlController : ControllerBase
    {
        private readonly IContainmentControlService _containmentControlService;
        private readonly ILogger<ContainmentControlController> _logger;

        public ContainmentControlController(
            IContainmentControlService containmentControlService,
            ILogger<ContainmentControlController> logger)
        {
            _containmentControlService = containmentControlService;
            _logger = logger;
        }

        /// <summary>
        /// Send toggle control command to containment via MQTT
        /// </summary>
        [HttpPost("toggle")]
        public async Task<ActionResult<ContainmentControlResponse>> SendToggleCommand(
            [FromBody] ToggleControlRequest request)
        {
            try
            {
                // Get user ID from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized("Invalid user token");
                }

                var result = await _containmentControlService.SendToggleCommandAsync(request, userId);

                if (result.Success)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending control command");
                return StatusCode(500, new ContainmentControlResponse
                {
                    Success = false,
                    Message = "Internal server error"
                });
            }
        }

        /// <summary>
        /// Get control history for specific containment
        /// </summary>
        [HttpGet("{containmentId}/history")]
        public async Task<ActionResult<IEnumerable<ContainmentControl>>> GetControlHistory(
            int containmentId,
            [FromQuery] int limit = 50)
        {
            try
            {
                if (limit <= 0 || limit > 500)
                {
                    return BadRequest("Limit must be between 1 and 500");
                }

                var history = await _containmentControlService.GetControlHistoryAsync(containmentId, limit);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting control history for containment {ContainmentId}", containmentId);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get all control history across all containments
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<ContainmentControl>>> GetAllControlHistory(
            [FromQuery] int limit = 100)
        {
            try
            {
                if (limit <= 0 || limit > 500)
                {
                    return BadRequest("Limit must be between 1 and 500");
                }

                var history = await _containmentControlService.GetAllControlHistoryAsync(limit);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all control history");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get available toggle controls
        /// </summary>
        [HttpGet("controls")]
        public ActionResult<object> GetAvailableControls()
        {
            try
            {
                var controls = new[]
                {
                    new { Name = "front_door", Label = "Front Door", Category = "Door Control", Icon = "door" },
                    new { Name = "back_door", Label = "Back Door", Category = "Door Control", Icon = "door" },
                    new { Name = "front_door_always", Label = "Front Door Always", Category = "Door Mode", Icon = "settings" },
                    new { Name = "back_door_always", Label = "Back Door Always", Category = "Door Mode", Icon = "settings" },
                    new { Name = "ceiling", Label = "Ceiling", Category = "Ceiling Control", Icon = "arrow-up-down" }
                };

                return Ok(new
                {
                    Controls = controls,
                    Categories = new[]
                    {
                        "Door Control",
                        "Door Mode",
                        "Ceiling Control"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available controls");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Test MQTT connection and send test command
        /// </summary>
        [HttpPost("test")]
        public async Task<ActionResult<object>> TestMqttControl()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized("Invalid user token");
                }

                var testRequest = new ToggleControlRequest
                {
                    ContainmentId = 1, // Use first containment for test
                    ControlType = "front_door",
                    IsEnabled = true
                };

                var result = await _containmentControlService.SendToggleCommandAsync(testRequest, userId);

                return Ok(new
                {
                    TestResult = result.Success ? "Success" : "Failed",
                    Message = result.Message,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing MQTT control");
                return StatusCode(500, new
                {
                    TestResult = "Error",
                    Message = "Internal server error",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

    }
}