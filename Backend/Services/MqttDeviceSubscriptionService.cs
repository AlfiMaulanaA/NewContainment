using MQTTnet;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Services
{
    public class MqttDeviceSubscriptionService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MqttDeviceSubscriptionService> _logger;
        private IMqttClient? _mqttClient;

        public MqttDeviceSubscriptionService(
            IServiceProvider serviceProvider,
            ILogger<MqttDeviceSubscriptionService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MQTT Device Subscription Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ConnectAndSubscribeToDeviceTopics(stoppingToken);

                    // Keep the service running and check connection every 30 seconds
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is stopping
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in MQTT Device Subscription Service");
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); // Wait before retrying
                }
            }

            await DisconnectAsync();
            _logger.LogInformation("MQTT Device Subscription Service stopped");
        }

        private async Task ConnectAndSubscribeToDeviceTopics(CancellationToken cancellationToken)
        {
            try
            {
                // Get effective MQTT configuration using scoped service
                using var scope = _serviceProvider.CreateScope();
                var mqttConfigService = scope.ServiceProvider.GetRequiredService<IMqttConfigurationService>();
                var config = await mqttConfigService.GetEffectiveConfigurationAsync();

                if (!config.ContainsKey("IsEnabled") || !(bool)config["IsEnabled"])
                {
                    _logger.LogInformation("MQTT is disabled, skipping device subscription");
                    return;
                }

                // Skip if already connected
                if (_mqttClient?.IsConnected == true)
                {
                    return;
                }

                await ConnectToMqttBroker(config, cancellationToken);
                await SubscribeToDeviceTopics(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect and subscribe to device topics");
            }
        }

        private async Task ConnectToMqttBroker(Dictionary<string, object> config, CancellationToken cancellationToken)
        {
            var factory = new MqttClientFactory();
            _mqttClient = factory.CreateMqttClient();

            var optionsBuilder = new MqttClientOptionsBuilder()
                .WithTcpServer(config["BrokerHost"].ToString(), (int)config["BrokerPort"])
                .WithClientId($"DeviceSubscription_{Environment.MachineName}_{Guid.NewGuid():N}"[..23])
                .WithKeepAlivePeriod(TimeSpan.FromSeconds((int)config["KeepAliveInterval"]));

            if (!string.IsNullOrEmpty(config["Username"]?.ToString()))
            {
                optionsBuilder.WithCredentials(config["Username"].ToString(), config["Password"]?.ToString());
            }

            if ((bool)config["UseSsl"])
            {
                optionsBuilder.WithTlsOptions(o => o.UseTls());
            }

            var options = optionsBuilder.Build();

            // Setup message handler
            _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceived;
            _mqttClient.DisconnectedAsync += OnDisconnected;

            await _mqttClient.ConnectAsync(options, cancellationToken);
            _logger.LogInformation("Connected to MQTT broker for device subscriptions");
        }

        private async Task SubscribeToDeviceTopics(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Get all devices with their rack and containment information
            var devices = await dbContext.Devices
                .Include(d => d.Rack)
                .ThenInclude(r => r!.Containment)
                .Where(d => d.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var device in devices)
            {
                try
                {
                    // Generate device-specific topic patterns
                    var topics = GenerateDeviceTopics(device);

                    foreach (var topic in topics)
                    {
                        var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                            .WithTopicFilter(topic, MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                            .Build();

                        await _mqttClient!.SubscribeAsync(subscribeOptions, cancellationToken);
                        _logger.LogDebug("Subscribed to topic: {Topic} for device {DeviceId}", topic, device.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to subscribe to topics for device {DeviceId}", device.Id);
                }
            }

            _logger.LogInformation("Subscribed to topics for {DeviceCount} devices", devices.Count);
        }

        private List<string> GenerateDeviceTopics(Backend.Models.Device device)
        {
            var topics = new List<string>();
            var containmentId = device.Rack?.Containment?.Id ?? 0;
            var rackId = device.Rack?.Id ?? 0;
            var deviceId = device.Id;

            // Various topic patterns for device data
            topics.AddRange(new[]
            {
                // Standard patterns
                $"sensors/containment/{containmentId}/rack/{rackId}/device/{deviceId}",
                $"sensors/containment/{containmentId}/rack/{rackId}/device/{deviceId}/+",
                $"sensors/device/{deviceId}",
                $"sensors/device/{deviceId}/+",
                
                // Data-specific topics  
                $"sensors/containment/{containmentId}/rack/{rackId}/device/{deviceId}/temperature",
                $"sensors/containment/{containmentId}/rack/{rackId}/device/{deviceId}/humidity",
                $"sensors/containment/{containmentId}/rack/{rackId}/device/{deviceId}/data",
                
                // Legacy patterns (if using different naming conventions)
                $"IOT/Containment/{containmentId}/Rack/{rackId}/Device/{deviceId}",
                $"IOT/Containment/{containmentId}/Rack/{rackId}/Device/{deviceId}/+",
                
                // Device name-based patterns (if available)
                $"sensors/{device.Name?.Replace(" ", "_").ToLower()}",
                $"sensors/{device.Name?.Replace(" ", "_").ToLower()}/+",
            });

            return topics.Where(t => !string.IsNullOrEmpty(t)).Distinct().ToList();
        }

        private async Task OnMessageReceived(MqttApplicationMessageReceivedEventArgs e)
        {
            try
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = e.ApplicationMessage.ConvertPayloadToString();

                _logger.LogDebug("Received message on topic: {Topic}, Payload: {Payload}", topic, payload);

                // Parse device ID from topic
                var deviceId = ExtractDeviceIdFromTopic(topic);
                if (deviceId == null)
                {
                    _logger.LogWarning("Could not extract device ID from topic: {Topic}", topic);
                    return;
                }

                // Process and potentially store sensor data based on interval configuration
                using var scope = _serviceProvider.CreateScope();
                var intervalService = scope.ServiceProvider.GetService<ISensorDataIntervalService>();
                var deviceSensorDataService = scope.ServiceProvider.GetService<IDeviceSensorDataService>();

                if (intervalService != null && deviceSensorDataService != null)
                {
                    // Parse timestamp from payload
                    var timestamp = ParseTimestampFromPayload(payload);
                    
                    // Check if we should save this data based on interval configuration
                    var shouldSave = await intervalService.ShouldSaveByIntervalAsync(deviceId.Value, timestamp);
                    
                    if (shouldSave)
                    {
                        try
                        {
                            await deviceSensorDataService.ParseAndStoreSensorDataAsync(deviceId.Value, topic, payload);
                            _logger.LogInformation("MQTT Data Saved - Device {DeviceId}, Topic: {Topic}, Timestamp: {Timestamp}", 
                                deviceId.Value, topic, timestamp);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to store sensor data for device {DeviceId}", deviceId);
                        }
                    }
                    else
                    {
                        _logger.LogDebug("MQTT Data Skipped - Device {DeviceId}, Topic: {Topic}, Timestamp: {Timestamp} (not at scheduled interval)", 
                            deviceId.Value, topic, timestamp);
                    }
                }
                else
                {
                    // Fallback: Just log the MQTT message
                    _logger.LogInformation("MQTT Data - Device {DeviceId}, Topic: {Topic}, Payload: {Payload}", deviceId, topic, payload);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MQTT message from topic: {Topic}", e.ApplicationMessage.Topic);
            }
        }

        private DateTime ParseTimestampFromPayload(string payload)
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(payload);
                var root = doc.RootElement;

                // Try to parse timestamp from various field names
                var timestampFields = new[] { "timestamp", "Timestamp", "time", "Time", "datetime", "DateTime" };
                
                foreach (var field in timestampFields)
                {
                    if (root.TryGetProperty(field, out var timestampElement))
                    {
                        if (timestampElement.TryGetDateTime(out var timestampValue))
                        {
                            return timestampValue;
                        }
                        else if (timestampElement.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            var timestampString = timestampElement.GetString();
                            if (DateTime.TryParse(timestampString, out var parsedTimestamp))
                            {
                                return parsedTimestamp;
                            }
                        }
                    }
                }

                return DateTime.UtcNow;
            }
            catch (System.Text.Json.JsonException)
            {
                return DateTime.UtcNow;
            }
        }

        private int? ExtractDeviceIdFromTopic(string topic)
        {
            try
            {
                // Try different topic patterns to extract device ID
                var patterns = new[]
                {
                    @"sensors/containment/\d+/rack/\d+/device/(\d+)",
                    @"sensors/device/(\d+)",
                    @"IOT/Containment/\d+/Rack/\d+/Device/(\d+)",
                };

                foreach (var pattern in patterns)
                {
                    var match = System.Text.RegularExpressions.Regex.Match(topic, pattern);
                    if (match.Success && int.TryParse(match.Groups[1].Value, out var deviceId))
                    {
                        return deviceId;
                    }
                }

                // Try to find device by name in topic
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var devices = dbContext.Devices.Where(d => d.IsActive).ToList();
                foreach (var device in devices)
                {
                    if (!string.IsNullOrEmpty(device.Name))
                    {
                        var deviceNamePattern = device.Name.Replace(" ", "_").ToLower();
                        if (topic.ToLower().Contains(deviceNamePattern))
                        {
                            return device.Id;
                        }
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting device ID from topic: {Topic}", topic);
                return null;
            }
        }

        private async Task OnDisconnected(MqttClientDisconnectedEventArgs e)
        {
            _logger.LogWarning("MQTT client disconnected: {Reason}", e.Reason);

            if (!e.ClientWasConnected)
            {
                _logger.LogError("Failed to connect to MQTT broker");
            }

            // Attempt to reconnect after a delay
            await Task.Delay(TimeSpan.FromSeconds(5));
        }

        private async Task DisconnectAsync()
        {
            if (_mqttClient?.IsConnected == true)
            {
                await _mqttClient.DisconnectAsync();
                _logger.LogInformation("Disconnected from MQTT broker");
            }
        }



        public override void Dispose()
        {
            _mqttClient?.Dispose();
            base.Dispose();
        }
    }
}