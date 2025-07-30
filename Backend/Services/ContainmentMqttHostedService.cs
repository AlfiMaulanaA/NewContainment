using System.Text.RegularExpressions;

namespace Backend.Services
{
    public class ContainmentMqttHostedService : BackgroundService
    {
        private readonly ILogger<ContainmentMqttHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IMqttService _mqttService;
        private readonly string _containmentStatusTopic = "IOT/Containment/Status";

        public ContainmentMqttHostedService(
            ILogger<ContainmentMqttHostedService> logger,
            IServiceProvider serviceProvider,
            IMqttService mqttService)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _mqttService = mqttService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ContainmentMqttHostedService starting...");

            try
            {
                // Wait for the MQTT service to be ready
                await WaitForMqttConnectionAsync(stoppingToken);

                // Subscribe to the containment status topic
                await _mqttService.SubscribeAsync(_containmentStatusTopic, HandleContainmentStatusMessage);

                _logger.LogInformation("Successfully subscribed to containment status topic: {Topic}", _containmentStatusTopic);

                // Keep the service running
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                    
                    // Check if MQTT is still connected, reconnect if needed
                    if (!_mqttService.IsConnected)
                    {
                        _logger.LogWarning("MQTT connection lost, attempting to reconnect...");
                        try
                        {
                            await _mqttService.ConnectAsync();
                            await _mqttService.SubscribeAsync(_containmentStatusTopic, HandleContainmentStatusMessage);
                            _logger.LogInformation("Reconnected to MQTT and resubscribed to topics");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to reconnect to MQTT");
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("ContainmentMqttHostedService is stopping due to cancellation");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ContainmentMqttHostedService");
            }
        }

        private async Task WaitForMqttConnectionAsync(CancellationToken stoppingToken)
        {
            var maxAttempts = 30;
            var attempts = 0;

            while (!_mqttService.IsConnected && attempts < maxAttempts && !stoppingToken.IsCancellationRequested)
            {
                attempts++;
                _logger.LogInformation("Waiting for MQTT connection... Attempt {Attempt}/{MaxAttempts}", attempts, maxAttempts);
                
                try
                {
                    await _mqttService.ConnectAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to connect to MQTT broker on attempt {Attempt}", attempts);
                }

                if (!_mqttService.IsConnected)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
            }

            if (!_mqttService.IsConnected)
            {
                throw new Exception("Failed to establish MQTT connection after maximum attempts");
            }

            _logger.LogInformation("MQTT connection established successfully");
        }

        private async Task HandleContainmentStatusMessage(string topic, string payload)
        {
            _logger.LogInformation("Received containment status message on topic {Topic}", topic);

            try
            {
                // For the current implementation, we'll assume the topic is for a specific containment
                // In the future, you might want to extract containment ID from topic pattern
                // For now, we'll use a default containment ID of 1 or extract from somewhere
                
                // Extract containment ID from topic or payload if available
                // For this example, let's assume we need to determine containment ID
                // You might want to modify this based on your MQTT topic structure
                
                int containmentId = ExtractContainmentIdFromTopicOrPayload(topic, payload);

                using var scope = _serviceProvider.CreateScope();
                var containmentStatusService = scope.ServiceProvider.GetRequiredService<IContainmentStatusService>();

                await containmentStatusService.ProcessMqttPayloadAsync(containmentId, payload);

                _logger.LogInformation("Successfully processed containment status for ContainmentId: {ContainmentId}", containmentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing containment status message from topic {Topic}: {Payload}", topic, payload);
            }
        }

        private int ExtractContainmentIdFromTopicOrPayload(string topic, string payload)
        {
            // Method 1: Try to extract from topic pattern like "IOT/Containment/{id}/Status"
            var topicMatch = Regex.Match(topic, @"IOT/Containment/(\d+)/Status", RegexOptions.IgnoreCase);
            if (topicMatch.Success && int.TryParse(topicMatch.Groups[1].Value, out var containmentIdFromTopic))
            {
                return containmentIdFromTopic;
            }

            // Method 2: Try to extract from payload if it contains containment ID
            try
            {
                using var document = System.Text.Json.JsonDocument.Parse(payload);
                if (document.RootElement.TryGetProperty("ContainmentId", out var containmentIdProperty))
                {
                    if (containmentIdProperty.TryGetInt32(out var containmentIdFromPayload))
                    {
                        return containmentIdFromPayload;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse JSON payload for containment ID extraction");
            }

            // Method 3: Default fallback - use containment ID 1 for now
            // In production, you should modify this based on your requirements
            _logger.LogWarning("Could not extract containment ID from topic {Topic} or payload. Using default containment ID 1", topic);
            return 1;
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ContainmentMqttHostedService is stopping...");

            try
            {
                if (_mqttService.IsConnected)
                {
                    await _mqttService.UnsubscribeAsync(_containmentStatusTopic);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unsubscribing from MQTT topics during shutdown");
            }

            await base.StopAsync(stoppingToken);
        }
    }
}