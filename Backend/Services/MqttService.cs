using MQTTnet;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class MqttService : IMqttService, IDisposable
    {
        private readonly ILogger<MqttService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private IMqttClient? _mqttClient;
        private readonly Dictionary<string, Func<string, string, Task>> _messageHandlers;
        private bool _mqttEnabled;
        private readonly SemaphoreSlim _connectionLock = new SemaphoreSlim(1, 1);
        private bool _isConnecting = false;

        public bool IsConnected => _mqttClient?.IsConnected ?? false;
        public event EventHandler<string>? ConnectionStatusChanged;

        public MqttService(ILogger<MqttService> logger, IConfiguration configuration, IServiceScopeFactory serviceScopeFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _serviceScopeFactory = serviceScopeFactory;
            _messageHandlers = new Dictionary<string, Func<string, string, Task>>();
            _mqttEnabled = true; // Will be checked dynamically from database

            _logger.LogInformation("MQTT service initialized with dynamic configuration via scope factory");
        }

        public async Task ConnectAsync()
        {
            // Use semaphore to ensure only one connection attempt at a time
            await _connectionLock.WaitAsync();
            try
            {
                if (_isConnecting)
                {
                    _logger.LogInformation("MQTT connection attempt already in progress, waiting...");
                    return;
                }

                _isConnecting = true;

                // Get effective configuration from database or environment using scoped service
                Dictionary<string, object> effectiveConfig;
                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    var mqttConfigService = scope.ServiceProvider.GetRequiredService<IMqttConfigurationService>();
                    effectiveConfig = await mqttConfigService.GetEffectiveConfigurationAsync();
                }

                _mqttEnabled = (bool)effectiveConfig["IsEnabled"];

                if (!_mqttEnabled)
                {
                    _logger.LogInformation("MQTT is disabled in configuration, skipping connection");
                    return;
                }

                if (_mqttClient?.IsConnected == true)
                {
                    _logger.LogInformation("MQTT client is already connected");
                    return;
                }

                var mqttFactory = new MqttClientFactory();
                _mqttClient = mqttFactory.CreateMqttClient();

                var host = (string)effectiveConfig["BrokerHost"];
                var port = (int)effectiveConfig["BrokerPort"];
                var baseClientId = (string)effectiveConfig["ClientId"];
                var clientId = $"{baseClientId}_{Guid.NewGuid().ToString("N")[..8]}";
                var username = (string)effectiveConfig["Username"];
                var password = (string)effectiveConfig["Password"];
                var useTls = (bool)effectiveConfig["UseSsl"];
                var useWebSocket = (bool)effectiveConfig["UseWebSocket"];
                var webSocketUri = (string)effectiveConfig["WebSocketUri"];
                var source = (string)effectiveConfig["Source"];

                // WebSocket path for backward compatibility
                var webSocketPath = Environment.GetEnvironmentVariable("MQTT_WEBSOCKET_PATH") ?? "/mqtt";

                // Log MQTT connection attempt details
                _logger.LogInformation("=== MQTT CONNECTION ATTEMPT ===");
                _logger.LogInformation("Configuration Source: {Source}", source);
                _logger.LogInformation("Broker Host: {Host}", host);
                _logger.LogInformation("Broker Port: {Port}", port);
                _logger.LogInformation("Client ID: {ClientId}", clientId);
                _logger.LogInformation("Use TLS: {UseTls}", useTls);
                _logger.LogInformation("Use WebSocket: {UseWebSocket}", useWebSocket);
                _logger.LogInformation("WebSocket URI: {WebSocketUri}", webSocketUri ?? "N/A");
                _logger.LogInformation("Has Credentials: {HasCredentials}", !string.IsNullOrEmpty(username));
                _logger.LogInformation("===============================");

                var clientOptionsBuilder = new MqttClientOptionsBuilder()
                    .WithClientId(clientId);

                // Configure WebSocket or TCP connection
                if (useWebSocket && !string.IsNullOrEmpty(webSocketUri))
                {
                    // Parse WebSocket URI
                    if (Uri.TryCreate(webSocketUri, UriKind.Absolute, out var uri))
                    {
                        var wsPort = uri.Port == -1 ? (uri.Scheme == "wss" ? 443 : 80) : uri.Port;
                        var useTlsForWs = uri.Scheme == "wss";

                        clientOptionsBuilder.WithWebSocketServer(options =>
                        {
                            options.WithUri($"{uri.Scheme}://{uri.Host}:{wsPort}{webSocketPath}");
                        });

                        // Configure TLS at the client level for WebSocket Secure (WSS)
                        if (useTlsForWs)
                        {
                            clientOptionsBuilder.WithTlsOptions(o =>
                            {
                                o.UseTls();
                                o.WithAllowUntrustedCertificates(false);
                                o.WithIgnoreCertificateChainErrors(false);
                                o.WithIgnoreCertificateRevocationErrors(false);
                            });
                        }

                        _logger.LogInformation("Configuring MQTT over WebSocket: {Uri}", $"{uri.Scheme}://{uri.Host}:{wsPort}{webSocketPath}");
                    }
                    else
                    {
                        _logger.LogError("Invalid WebSocket URI: {Uri}", webSocketUri);
                        throw new ArgumentException($"Invalid WebSocket URI: {webSocketUri}");
                    }
                }
                else
                {
                    // Traditional TCP connection
                    clientOptionsBuilder.WithTcpServer(host, port);

                    if (useTls)
                    {
                        clientOptionsBuilder.WithTlsOptions(o => o.UseTls());
                    }

                    _logger.LogInformation("Configuring MQTT over TCP: {Host}:{Port} (TLS: {UseTls})", host, port, useTls);
                }

                // Add credentials if provided
                if (!string.IsNullOrEmpty(username))
                {
                    clientOptionsBuilder.WithCredentials(username, password);
                }

                var clientOptions = clientOptionsBuilder.Build();

                _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceived;
                _mqttClient.ConnectedAsync += OnConnected;
                _mqttClient.DisconnectedAsync += OnDisconnected;

                // Attempt connection with detailed logging
                _logger.LogInformation("Attempting to connect to MQTT broker...");
                var connectResult = await _mqttClient.ConnectAsync(clientOptions);

                if (connectResult.ResultCode == MqttClientConnectResultCode.Success)
                {
                    if (useWebSocket && !string.IsNullOrEmpty(webSocketUri))
                    {
                        _logger.LogInformation("✅ SUCCESSFULLY CONNECTED to MQTT broker via WebSocket: {Uri}", webSocketUri);
                    }
                    else
                    {
                        _logger.LogInformation("✅ SUCCESSFULLY CONNECTED to MQTT broker via TCP: {Host}:{Port}", host, port);
                    }

                    // Log connection status
                    _logger.LogInformation("=== MQTT CONNECTION STATUS ===");
                    _logger.LogInformation("Connected: {Connected}", _mqttClient.IsConnected);
                    _logger.LogInformation("Broker: {Host}:{Port}", host, port);
                    _logger.LogInformation("Client ID: {ClientId}", clientId);
                    _logger.LogInformation("Configuration Source: {Source}", source);
                    _logger.LogInformation("============================");
                }
                else
                {
                    _logger.LogError("❌ FAILED to connect to MQTT broker. Result: {ResultCode}", connectResult.ResultCode);
                    if (connectResult.ReasonString != null)
                    {
                        _logger.LogError("Connection failed reason: {Reason}", connectResult.ReasonString);
                    }
                    throw new Exception($"MQTT connection failed with result: {connectResult.ResultCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ CRITICAL: Failed to connect to MQTT broker");
                _logger.LogError("Error Details: {Message}", ex.Message);
                if (ex.InnerException != null)
                {
                    _logger.LogError("Inner Exception: {InnerMessage}", ex.InnerException.Message);
                }
                throw;
            }
            finally
            {
                _isConnecting = false;  // Always reset connecting flag
                _connectionLock.Release();  // Always release the semaphore
            }
        }

        public async Task DisconnectAsync()
        {
            try
            {
                if (_mqttClient?.IsConnected == true)
                {
                    await _mqttClient.DisconnectAsync();
                    _logger.LogInformation("Disconnected from MQTT broker");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting from MQTT broker");
                throw;
            }
        }

        public async Task ReconnectWithNewConfigAsync()
        {
            _logger.LogInformation("Reconnecting MQTT with new configuration");

            try
            {
                // Disconnect current client (ignore exceptions to allow reconnection)
                try
                {
                    await DisconnectAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error during MQTT disconnection, proceeding with reconnection anyway");
                }

                // Dispose current client
                _mqttClient?.Dispose();
                _mqttClient = null;

                // Connect with new configuration
                await ConnectAsync();

                _logger.LogInformation("Successfully reconnected with new MQTT configuration");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reconnect with new MQTT configuration");
                throw;
            }
        }

        public async Task PublishAsync(string topic, string payload)
        {
            if (!_mqttEnabled)
            {
                _logger.LogInformation("MQTT is disabled, cannot publish message to topic {Topic}", topic);
                return;
            }

            try
            {
                if (_mqttClient?.IsConnected != true)
                {
                    throw new InvalidOperationException("MQTT client is not connected");
                }

                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(topic)
                    .WithPayload(Encoding.UTF8.GetBytes(payload))
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                    .WithRetainFlag(false)
                    .Build();

                await _mqttClient.PublishAsync(message);
                _logger.LogInformation("Published message to topic {Topic}: {Payload}", topic, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish message to topic {Topic}", topic);
                throw;
            }
        }

        public async Task SubscribeAsync(string topic, Func<string, string, Task> messageHandler)
        {
            if (!_mqttEnabled)
            {
                _logger.LogInformation("MQTT is disabled, cannot subscribe to topic {Topic}", topic);
                return;
            }

            try
            {
                if (_mqttClient?.IsConnected != true)
                {
                    throw new InvalidOperationException("MQTT client is not connected");
                }

                _messageHandlers[topic] = messageHandler;

                var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                    .WithTopicFilter(topic, MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                    .Build();

                await _mqttClient.SubscribeAsync(subscribeOptions);
                _logger.LogInformation("Subscribed to topic: {Topic}", topic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to subscribe to topic {Topic}", topic);
                throw;
            }
        }

        public async Task UnsubscribeAsync(string topic)
        {
            try
            {
                if (_mqttClient?.IsConnected != true)
                {
                    throw new InvalidOperationException("MQTT client is not connected");
                }

                _messageHandlers.Remove(topic);

                var unsubscribeOptions = new MqttClientUnsubscribeOptionsBuilder()
                    .WithTopicFilter(topic)
                    .Build();

                await _mqttClient.UnsubscribeAsync(unsubscribeOptions);
                _logger.LogInformation("Unsubscribed from topic: {Topic}", topic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to unsubscribe from topic {Topic}", topic);
                throw;
            }
        }

        private async Task OnMessageReceived(MqttApplicationMessageReceivedEventArgs e)
        {
            try
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = e.ApplicationMessage.ConvertPayloadToString();

                // Reduce verbosity - only log at Debug level for regular messages
                _logger.LogDebug("Received message from topic {Topic}: {Payload}", topic, payload);

                // Track device activity based on topic
                await TrackDeviceActivityFromTopicAsync(topic, payload);

                // Check for exact topic match first
                if (_messageHandlers.TryGetValue(topic, out var handler))
                {
                    await handler(topic, payload);
                }

                // Check for wildcard pattern matches
                foreach (var kvp in _messageHandlers)
                {
                    var pattern = kvp.Key;
                    var patternHandler = kvp.Value;

                    if (pattern.Contains("+") || pattern.Contains("#"))
                    {
                        if (IsTopicMatch(topic, pattern))
                        {
                            await patternHandler(topic, payload);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing received MQTT message");
            }
        }

        private async Task TrackDeviceActivityFromTopicAsync(string topic, string payload)
        {
            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
                var deviceStatusService = scope.ServiceProvider.GetService<IDeviceStatusMonitoringService>();

                if (deviceStatusService == null)
                    return;

                // Find device(s) that have this topic
                var devices = await context.Devices
                    .Where(d => d.IsActive && d.Topic == topic)
                    .Select(d => d.Id)
                    .ToListAsync();

                foreach (var deviceId in devices)
                {
                    await deviceStatusService.UpdateDeviceActivityAsync(deviceId, topic, payload);
                }

                if (devices.Any())
                {
                    _logger.LogDebug($"Updated activity for {devices.Count} device(s) with topic {topic}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error tracking device activity for topic {topic}");
            }
        }

        private static bool IsTopicMatch(string topic, string pattern)
        {
            var topicLevels = topic.Split('/');
            var patternLevels = pattern.Split('/');

            if (patternLevels.Length > topicLevels.Length && !pattern.EndsWith("#"))
            {
                return false;
            }

            for (int i = 0; i < patternLevels.Length; i++)
            {
                if (patternLevels[i] == "#")
                {
                    return true; // # matches everything from this level on
                }

                if (i >= topicLevels.Length)
                {
                    return false;
                }

                if (patternLevels[i] != "+" && patternLevels[i] != topicLevels[i])
                {
                    return false;
                }
            }

            return patternLevels.Length == topicLevels.Length || pattern.EndsWith("#");
        }

        private Task OnConnected(MqttClientConnectedEventArgs e)
        {
            _logger.LogInformation("MQTT client connected successfully");
            ConnectionStatusChanged?.Invoke(this, "Connected");
            return Task.CompletedTask;
        }

        private Task OnDisconnected(MqttClientDisconnectedEventArgs e)
        {
            _logger.LogWarning("MQTT client disconnected: {Reason}", e.Reason);
            ConnectionStatusChanged?.Invoke(this, $"Disconnected: {e.Reason}");
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            try
            {
                if (_mqttClient?.IsConnected == true)
                {
                    _mqttClient.DisconnectAsync().Wait(TimeSpan.FromSeconds(5));
                }
                _mqttClient?.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disposing MQTT client");
            }
        }
    }
}
