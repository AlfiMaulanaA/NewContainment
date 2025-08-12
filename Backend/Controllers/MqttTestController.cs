using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Developer")]
    public class MqttTestController : ControllerBase
    {
        private readonly IMqttService _mqttService;
        private readonly ILogger<MqttTestController> _logger;
        private readonly IConfiguration _configuration;

        public MqttTestController(
            IMqttService mqttService,
            ILogger<MqttTestController> logger,
            IConfiguration configuration)
        {
            _mqttService = mqttService;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpGet("status")]
        public IActionResult GetConnectionStatus()
        {
            try
            {
                var isConnected = _mqttService.IsConnected;
                var useWebSocket = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_WEBSOCKET") ?? _configuration["Mqtt:UseWebSocket"] ?? "false");
                var webSocketUri = Environment.GetEnvironmentVariable("MQTT_WEBSOCKET_URI") ?? _configuration["Mqtt:WebSocketUri"];
                var brokerHost = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST") ?? _configuration["Mqtt:BrokerHost"];
                var brokerPort = Environment.GetEnvironmentVariable("MQTT_BROKER_PORT") ?? _configuration["Mqtt:BrokerPort"];

                return Ok(new
                {
                    isConnected = isConnected,
                    connectionType = useWebSocket ? "WebSocket" : "TCP",
                    endpoint = useWebSocket ? webSocketUri : $"{brokerHost}:{brokerPort}",
                    status = isConnected ? "Connected" : "Disconnected",
                    configuration = new
                    {
                        useWebSocket = useWebSocket,
                        webSocketUri = webSocketUri,
                        tcpHost = brokerHost,
                        tcpPort = brokerPort,
                        clientId = Environment.GetEnvironmentVariable("MQTT_CLIENT_ID") ?? _configuration["Mqtt:ClientId"],
                        enableMqtt = Environment.GetEnvironmentVariable("MQTT_ENABLE") ?? _configuration["Mqtt:EnableMqtt"]
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting MQTT connection status");
                return StatusCode(500, new { message = "Error retrieving connection status" });
            }
        }

        [HttpPost("connect")]
        public async Task<IActionResult> Connect()
        {
            try
            {
                if (_mqttService.IsConnected)
                {
                    return Ok(new { message = "Already connected to MQTT broker" });
                }

                await _mqttService.ConnectAsync();
                
                return Ok(new
                {
                    message = "Successfully connected to MQTT broker",
                    isConnected = _mqttService.IsConnected
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to MQTT broker");
                return StatusCode(500, new { message = $"Failed to connect: {ex.Message}" });
            }
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            try
            {
                if (!_mqttService.IsConnected)
                {
                    return Ok(new { message = "Already disconnected from MQTT broker" });
                }

                await _mqttService.DisconnectAsync();
                
                return Ok(new
                {
                    message = "Successfully disconnected from MQTT broker",
                    isConnected = _mqttService.IsConnected
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting from MQTT broker");
                return StatusCode(500, new { message = $"Failed to disconnect: {ex.Message}" });
            }
        }

        [HttpPost("publish")]
        public async Task<IActionResult> PublishTestMessage([FromBody] TestMessageRequest request)
        {
            try
            {
                if (!_mqttService.IsConnected)
                {
                    return BadRequest(new { message = "MQTT client is not connected" });
                }

                var topic = request.Topic ?? "test/backend/message";
                var payload = request.Payload ?? $"Test message from backend at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

                await _mqttService.PublishAsync(topic, payload);

                _logger.LogInformation("Published test message to topic {Topic}", topic);

                return Ok(new
                {
                    message = "Test message published successfully",
                    topic = topic,
                    payload = payload,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing test message");
                return StatusCode(500, new { message = $"Failed to publish message: {ex.Message}" });
            }
        }

        [HttpPost("subscribe")]
        public async Task<IActionResult> SubscribeToTestTopic([FromBody] TestSubscribeRequest request)
        {
            try
            {
                if (!_mqttService.IsConnected)
                {
                    return BadRequest(new { message = "MQTT client is not connected" });
                }

                var topic = request.Topic ?? "test/backend/+";

                await _mqttService.SubscribeAsync(topic, async (receivedTopic, receivedPayload) =>
                {
                    _logger.LogInformation("Received test message from topic {Topic}: {Payload}", receivedTopic, receivedPayload);
                });

                return Ok(new
                {
                    message = "Successfully subscribed to test topic",
                    topic = topic,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing to test topic");
                return StatusCode(500, new { message = $"Failed to subscribe: {ex.Message}" });
            }
        }

        [HttpPost("test-websocket")]
        public async Task<IActionResult> TestWebSocketConnection()
        {
            try
            {
                var useWebSocket = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_WEBSOCKET") ?? _configuration["Mqtt:UseWebSocket"] ?? "false");
                
                if (!useWebSocket)
                {
                    return BadRequest(new { message = "WebSocket is not enabled in configuration" });
                }

                var webSocketUri = Environment.GetEnvironmentVariable("MQTT_WEBSOCKET_URI") ?? _configuration["Mqtt:WebSocketUri"];
                
                if (string.IsNullOrEmpty(webSocketUri))
                {
                    return BadRequest(new { message = "WebSocket URI is not configured" });
                }

                // Test connection
                var wasConnected = _mqttService.IsConnected;
                
                if (!wasConnected)
                {
                    await _mqttService.ConnectAsync();
                }

                // Test publish/subscribe
                var testTopic = $"test/websocket/{Guid.NewGuid().ToString("N")[..8]}";
                var testPayload = $"WebSocket test message at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";
                
                string? receivedPayload = null;
                var messageReceived = false;

                await _mqttService.SubscribeAsync(testTopic, async (topic, payload) =>
                {
                    receivedPayload = payload;
                    messageReceived = true;
                });

                // Give subscription time to register
                await Task.Delay(1000);

                await _mqttService.PublishAsync(testTopic, testPayload);

                // Wait for message reception
                var timeout = DateTime.UtcNow.AddSeconds(10);
                while (!messageReceived && DateTime.UtcNow < timeout)
                {
                    await Task.Delay(100);
                }

                await _mqttService.UnsubscribeAsync(testTopic);

                return Ok(new
                {
                    message = "WebSocket MQTT test completed",
                    webSocketUri = webSocketUri,
                    connectionSuccessful = _mqttService.IsConnected,
                    publishSuccessful = true,
                    subscriptionSuccessful = messageReceived,
                    testTopic = testTopic,
                    sentPayload = testPayload,
                    receivedPayload = receivedPayload,
                    roundTripSuccessful = messageReceived && receivedPayload == testPayload
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing WebSocket connection");
                return StatusCode(500, new { message = $"WebSocket test failed: {ex.Message}" });
            }
        }
    }

    public class TestMessageRequest
    {
        public string? Topic { get; set; }
        public string? Payload { get; set; }
    }

    public class TestSubscribeRequest
    {
        public string? Topic { get; set; }
    }
}