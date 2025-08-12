using MQTTnet;
using System.Text;

namespace Backend.Services
{
    public class MqttService : IMqttService, IDisposable
    {
        private readonly ILogger<MqttService> _logger;
        private readonly IConfiguration _configuration;
        private IMqttClient? _mqttClient;
        private readonly Dictionary<string, Func<string, string, Task>> _messageHandlers;
        private readonly bool _mqttEnabled;

        public bool IsConnected => _mqttClient?.IsConnected ?? false;
        public event EventHandler<string>? ConnectionStatusChanged;

        public MqttService(ILogger<MqttService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            _messageHandlers = new Dictionary<string, Func<string, string, Task>>();
            _mqttEnabled = bool.Parse(Environment.GetEnvironmentVariable("MQTT_ENABLE") ?? configuration["Mqtt:EnableMqtt"] ?? "true");
            
            if (!_mqttEnabled)
            {
                _logger.LogInformation("MQTT service is disabled in configuration");
            }
        }

        public async Task ConnectAsync()
        {
            if (!_mqttEnabled)
            {
                _logger.LogInformation("MQTT is disabled, skipping connection");
                return;
            }

            try
            {
                if (_mqttClient?.IsConnected == true)
                {
                    _logger.LogInformation("MQTT client is already connected");
                    return;
                }

                var mqttFactory = new MqttClientFactory();
                _mqttClient = mqttFactory.CreateMqttClient();

                var host = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST") ?? _configuration["Mqtt:BrokerHost"] ?? "localhost";
                var port = int.Parse(Environment.GetEnvironmentVariable("MQTT_BROKER_PORT") ?? _configuration["Mqtt:BrokerPort"] ?? "1883");
                var baseClientId = Environment.GetEnvironmentVariable("MQTT_CLIENT_ID") ?? _configuration["Mqtt:ClientId"] ?? "Backend_Client";
                var clientId = $"{baseClientId}_{Guid.NewGuid().ToString("N")[..8]}";
                var username = Environment.GetEnvironmentVariable("MQTT_USERNAME") ?? _configuration["Mqtt:Username"];
                var password = Environment.GetEnvironmentVariable("MQTT_PASSWORD") ?? _configuration["Mqtt:Password"];
                var useTls = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_TLS") ?? _configuration["Mqtt:UseTls"] ?? "false");
                var useWebSocket = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_WEBSOCKET") ?? _configuration["Mqtt:UseWebSocket"] ?? "false");
                var webSocketUri = Environment.GetEnvironmentVariable("MQTT_WEBSOCKET_URI") ?? _configuration["Mqtt:WebSocketUri"];
                var webSocketPath = Environment.GetEnvironmentVariable("MQTT_WEBSOCKET_PATH") ?? _configuration["Mqtt:WebSocketPath"] ?? "/mqtt";

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

                await _mqttClient.ConnectAsync(clientOptions);
                
                if (useWebSocket && !string.IsNullOrEmpty(webSocketUri))
                {
                    _logger.LogInformation("Successfully connected to MQTT broker via WebSocket: {Uri}", webSocketUri);
                }
                else
                {
                    _logger.LogInformation("Successfully connected to MQTT broker via TCP: {Host}:{Port}", host, port);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to MQTT broker");
                throw;
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

                _logger.LogInformation("Received message from topic {Topic}: {Payload}", topic, payload);

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