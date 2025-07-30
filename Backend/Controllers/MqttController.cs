using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using System.ComponentModel.DataAnnotations;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MqttController : ControllerBase
    {
        private readonly IMqttService _mqttService;
        private readonly ILogger<MqttController> _logger;

        public MqttController(IMqttService mqttService, ILogger<MqttController> logger)
        {
            _mqttService = mqttService;
            _logger = logger;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            try
            {
                // Log user info for debugging
                var userId = User.FindFirst("UserId")?.Value;
                var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
                _logger.LogInformation("MQTT Status requested by user: {UserId} - {UserName}", userId, userName);

                return Ok(new
                {
                    IsConnected = _mqttService.IsConnected,
                    Status = _mqttService.IsConnected ? "Connected" : "Disconnected",
                    RequestedBy = new
                    {
                        UserId = userId,
                        UserName = userName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MQTT status");
                return BadRequest(new { message = "Error getting MQTT status", error = ex.Message });
            }
        }

        [HttpPost("connect")]
        public async Task<IActionResult> Connect()
        {
            try
            {
                await _mqttService.ConnectAsync();
                return Ok(new { message = "Connected to MQTT broker successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to MQTT broker");
                return BadRequest(new { message = "Failed to connect to MQTT broker", error = ex.Message });
            }
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            try
            {
                await _mqttService.DisconnectAsync();
                return Ok(new { message = "Disconnected from MQTT broker successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to disconnect from MQTT broker");
                return BadRequest(new { message = "Failed to disconnect from MQTT broker", error = ex.Message });
            }
        }

        [HttpPost("publish")]
        public async Task<IActionResult> Publish([FromBody] PublishRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _mqttService.PublishAsync(request.Topic, request.Payload);
                return Ok(new { message = $"Message published to topic '{request.Topic}' successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish message to topic {Topic}", request.Topic);
                return BadRequest(new { message = "Failed to publish message", error = ex.Message });
            }
        }

        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _mqttService.SubscribeAsync(request.Topic, async (topic, payload) =>
                {
                    _logger.LogInformation("Received message from topic {Topic}: {Payload}", topic, payload);
                });

                return Ok(new { message = $"Subscribed to topic '{request.Topic}' successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to subscribe to topic {Topic}", request.Topic);
                return BadRequest(new { message = "Failed to subscribe to topic", error = ex.Message });
            }
        }

        [HttpPost("unsubscribe")]
        public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _mqttService.UnsubscribeAsync(request.Topic);
                return Ok(new { message = $"Unsubscribed from topic '{request.Topic}' successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to unsubscribe from topic {Topic}", request.Topic);
                return BadRequest(new { message = "Failed to unsubscribe from topic", error = ex.Message });
            }
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestMqtt()
        {
            try
            {
                var testTopic = "test/backend";
                var testMessage = $"Test message from Backend API at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

                if (!_mqttService.IsConnected)
                {
                    await _mqttService.ConnectAsync();
                }

                await _mqttService.PublishAsync(testTopic, testMessage);

                return Ok(new
                {
                    message = "MQTT test completed successfully",
                    topic = testTopic,
                    payload = testMessage,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT test failed");
                return BadRequest(new { message = "MQTT test failed", error = ex.Message });
            }
        }
    }

    public class PublishRequest
    {
        [Required]
        public string Topic { get; set; } = string.Empty;

        [Required]
        public string Payload { get; set; } = string.Empty;
    }

    public class SubscribeRequest
    {
        [Required]
        public string Topic { get; set; } = string.Empty;
    }

    public class UnsubscribeRequest
    {
        [Required]
        public string Topic { get; set; } = string.Empty;
    }
}