using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class ContainmentMqttHostedService : BackgroundService
    {
        private readonly ILogger<ContainmentMqttHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IMqttService _mqttService;
        private readonly IConfiguration _configuration;
        private readonly string _containmentStatusTopic = "IOT/Containment/Status";
        private readonly Dictionary<int, DateTime> _lastSaveTime = new();
        private readonly int _saveIntervalSeconds;
        private readonly int _minIntervalSeconds;
        private readonly Dictionary<int, (string Topic, string Payload, DateTime ReceivedAt)> _dataBuffer = new();
        private Timer? _batchSaveTimer;
        private readonly Dictionary<int, Timer> _deviceIntervalTimers = new();

        public ContainmentMqttHostedService(
            ILogger<ContainmentMqttHostedService> logger,
            IServiceProvider serviceProvider,
            IMqttService mqttService,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _mqttService = mqttService;
            _configuration = configuration;

            // Load interval configuration from environment variables
            _saveIntervalSeconds = int.Parse(Environment.GetEnvironmentVariable("SENSOR_DATA_SAVE_INTERVAL") ??
                                           _configuration["SensorData:SaveInterval"] ?? "60");
            _minIntervalSeconds = int.Parse(Environment.GetEnvironmentVariable("SENSOR_DATA_MIN_INTERVAL") ??
                                          _configuration["SensorData:MinInterval"] ?? "60");

            _logger.LogInformation("Sensor data save interval: {SaveInterval}s, min interval: {MinInterval}s",
                _saveIntervalSeconds, _minIntervalSeconds);

            // Initialize batch save timer if save interval is configured
            if (_saveIntervalSeconds > _minIntervalSeconds)
            {
                _batchSaveTimer = new Timer(BatchSaveCallback, null,
                    TimeSpan.FromSeconds(_saveIntervalSeconds),
                    TimeSpan.FromSeconds(_saveIntervalSeconds));
                _logger.LogInformation("Batch save timer initialized with {SaveInterval}s interval", _saveIntervalSeconds);
            }
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

                // Subscribe to specific topics from devices with type "Sensor"
                await SubscribeToSensorDeviceTopics();

                _logger.LogInformation("Successfully subscribed to sensor device topics");

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
                            await SubscribeToSensorDeviceTopics();
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

            // Log MQTT configuration source and connection details
            using var scope = _serviceProvider.CreateScope();
            var mqttConfigService = scope.ServiceProvider.GetRequiredService<IMqttConfigurationService>();
            var effectiveConfig = await mqttConfigService.GetEffectiveConfigurationAsync();

            var source = effectiveConfig["Source"].ToString();
            var host = effectiveConfig["BrokerHost"].ToString();
            var port = (int)effectiveConfig["BrokerPort"];
            var isEnabled = (bool)effectiveConfig["IsEnabled"];

            _logger.LogInformation("MQTT Status - Connected: {Connected}, Source: {Source}, Host: {Host}:{Port}, Enabled: {Enabled}",
                _mqttService.IsConnected, source, host, port, isEnabled);
        }

        private async Task HandleContainmentStatusMessage(string topic, string payload)
        {
            _logger.LogInformation("Received containment status message on topic {Topic}", topic);
            _logger.LogInformation("Payload: {Payload}", payload);

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

        private async Task SubscribeToSensorDeviceTopics()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<Backend.Data.AppDbContext>();

                // Get all devices with type "Sensor" (case insensitive)
                var sensorDevices = await dbContext.Devices
                    .Where(d => d.Type.ToLower() == "sensor")
                    .ToListAsync();

                _logger.LogInformation("Found {Count} sensor devices to subscribe", sensorDevices.Count);

                foreach (var device in sensorDevices)
                {
                    if (!string.IsNullOrEmpty(device.Topic))
                    {
                        await _mqttService.SubscribeAsync(device.Topic, HandleSensorMessage);
                        _logger.LogInformation("Subscribed to sensor device topic: {Topic} for device {DeviceName} (ID: {DeviceId})",
                            device.Topic, device.Name, device.Id);
                    }
                    else
                    {
                        _logger.LogWarning("Sensor device {DeviceName} (ID: {DeviceId}) has no topic configured",
                            device.Name, device.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing to sensor device topics");
            }
        }

        private async Task HandleSensorMessage(string topic, string payload)
        {
            _logger.LogDebug("Received sensor message on topic {Topic}: {Payload}", topic, payload);

            try
            {
                // Extract device ID from topic
                var deviceId = ExtractDeviceIdFromTopic(topic);
                if (deviceId == null)
                {
                    _logger.LogWarning("Could not extract device ID from topic: {Topic}", topic);
                    return;
                }

                _logger.LogDebug("Processing sensor data for device {DeviceId} from topic {Topic}", deviceId, topic);

                // Use dynamic interval checking
                var shouldSave = await ShouldSaveWithDynamicInterval(deviceId.Value, DateTime.UtcNow);
                if (shouldSave)
                {
                    _logger.LogDebug("Saving sensor data for device {DeviceId} based on dynamic interval", deviceId);
                    await SaveSensorDataAsync(deviceId.Value, topic, payload);
                    _logger.LogInformation("Successfully stored sensor data for device {DeviceId} from topic {Topic}", deviceId, topic);
                }
                else
                {
                    _logger.LogDebug("Skipping data save for device {DeviceId} due to dynamic interval configuration", deviceId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing sensor message from topic {Topic}: {Payload}", topic, payload);
            }
        }

        private async Task<bool> ShouldSaveWithDynamicInterval(int deviceId, DateTime timestamp)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var intervalService = scope.ServiceProvider.GetRequiredService<ISensorDataIntervalService>();
                
                var shouldSave = await intervalService.ShouldSaveByIntervalAsync(deviceId, timestamp);
                
                _logger.LogDebug("Dynamic interval check for device {DeviceId}: {ShouldSave}", deviceId, shouldSave);
                return shouldSave;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking dynamic interval for device {DeviceId}, falling back to legacy method", deviceId);
                // Fallback to legacy method
                return ShouldSaveData(deviceId);
            }
        }

        private bool ShouldSaveData(int deviceId)
        {
            if (!_lastSaveTime.ContainsKey(deviceId))
            {
                // First time receiving data for this device
                return true;
            }

            var timeSinceLastSave = DateTime.UtcNow - _lastSaveTime[deviceId];
            var shouldSave = timeSinceLastSave.TotalSeconds >= _minIntervalSeconds;

            _logger.LogDebug("Device {DeviceId}: Time since last save: {TimeSinceLastSave:F1}s, Min interval: {MinInterval}s, Should save: {ShouldSave}",
                deviceId, timeSinceLastSave.TotalSeconds, _minIntervalSeconds, shouldSave);

            return shouldSave;
        }

        private bool ShouldBufferData(int deviceId)
        {
            // Always buffer data if we don't have any buffered data for this device yet
            if (!_dataBuffer.ContainsKey(deviceId))
            {
                return true;
            }

            // Check if enough time has passed since last buffer update (to avoid too frequent updates)
            var timeSinceLastBuffer = DateTime.UtcNow - _dataBuffer[deviceId].ReceivedAt;
            return timeSinceLastBuffer.TotalSeconds >= (_minIntervalSeconds / 2); // Update buffer at half the min interval
        }

        private async Task SaveSensorDataAsync(int deviceId, string topic, string payload)
        {
            using var scope = _serviceProvider.CreateScope();
            var sensorDataService = scope.ServiceProvider.GetRequiredService<IDeviceSensorDataService>();

            _logger.LogDebug("Saving sensor data to database for device {DeviceId} at {Timestamp}",
                deviceId, DateTime.UtcNow.ToString("HH:mm:ss.fff"));

            await sensorDataService.ParseAndStoreSensorDataAsync(deviceId, topic, payload);

            // Update last save time
            _lastSaveTime[deviceId] = DateTime.UtcNow;

            _logger.LogDebug("Successfully saved sensor data for device {DeviceId}, next save allowed after {NextSaveTime}",
                deviceId, DateTime.UtcNow.AddSeconds(_minIntervalSeconds).ToString("HH:mm:ss"));
        }

        private async void BatchSaveCallback(object? state)
        {
            if (_dataBuffer.Count == 0)
            {
                return;
            }

            _logger.LogInformation("Starting batch save for {Count} buffered sensor data entries", _dataBuffer.Count);

            var dataToSave = new Dictionary<int, (string Topic, string Payload, DateTime ReceivedAt)>(_dataBuffer);
            _dataBuffer.Clear();

            try
            {
                foreach (var kvp in dataToSave)
                {
                    var deviceId = kvp.Key;
                    var (topic, payload, receivedAt) = kvp.Value;

                    try
                    {
                        await SaveSensorDataAsync(deviceId, topic, payload);
                        _logger.LogTrace("Batch saved sensor data for device {DeviceId}", deviceId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error saving buffered sensor data for device {DeviceId}", deviceId);
                    }
                }

                _logger.LogInformation("Completed batch save for {Count} sensor data entries", dataToSave.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch save operation");
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
                    @"IOT/Containment/([^/]+)/Rack_(\d+)",  // Pattern for IOT/Containment/DeviceName/Rack_X
                };

                foreach (var pattern in patterns)
                {
                    var match = Regex.Match(topic, pattern);
                    if (match.Success && match.Groups.Count > 1 && int.TryParse(match.Groups[1].Value, out var deviceId))
                    {
                        return deviceId;
                    }
                }

                // Try to find device by name or topic match in topic
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<Backend.Data.AppDbContext>();

                var devices = dbContext.Devices.ToList();
                foreach (var device in devices)
                {
                    // First try exact topic match
                    if (!string.IsNullOrEmpty(device.Topic) && device.Topic.Equals(topic, StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogDebug("Found device {DeviceId} by exact topic match: {Topic}", device.Id, topic);
                        return device.Id;
                    }

                    // Then try name-based matching
                    if (!string.IsNullOrEmpty(device.Name))
                    {
                        var deviceNamePattern = device.Name.Replace(" ", "_").ToLower();
                        if (topic.ToLower().Contains(deviceNamePattern))
                        {
                            _logger.LogDebug("Found device {DeviceId} by name pattern: {Name} in topic {Topic}", device.Id, device.Name, topic);
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

            // Dispose timer
            _batchSaveTimer?.Dispose();

            await base.StopAsync(stoppingToken);
        }

        public override void Dispose()
        {
            _batchSaveTimer?.Dispose();
            base.Dispose();
        }
    }
}
