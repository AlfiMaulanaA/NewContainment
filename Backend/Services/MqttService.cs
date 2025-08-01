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
                var clientId = Environment.GetEnvironmentVariable("MQTT_CLIENT_ID") ?? _configuration["Mqtt:ClientId"] ?? "Backend_Client";
                var username = Environment.GetEnvironmentVariable("MQTT_USERNAME") ?? _configuration["Mqtt:Username"];
                var password = Environment.GetEnvironmentVariable("MQTT_PASSWORD") ?? _configuration["Mqtt:Password"];
                var useTls = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_TLS") ?? _configuration["Mqtt:UseTls"] ?? "false");

                var clientOptionsBuilder = new MqttClientOptionsBuilder()
                    .WithTcpServer(host, port)
                    .WithClientId(clientId);

                if (!string.IsNullOrEmpty(username))
                {
                    clientOptionsBuilder.WithCredentials(username, password);
                }

                if (useTls)
                {
                    clientOptionsBuilder.WithTlsOptions(o => o.UseTls());
                }

                var clientOptions = clientOptionsBuilder.Build();

                _mqttClient.ApplicationMessageReceivedAsync += OnMessageReceived;
                _mqttClient.ConnectedAsync += OnConnected;
                _mqttClient.DisconnectedAsync += OnDisconnected;

                await _mqttClient.ConnectAsync(clientOptions);
                _logger.LogInformation("Connected to MQTT broker at {Host}:{Port}", host, port);
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

                if (_messageHandlers.TryGetValue(topic, out var handler))
                {
                    await handler(topic, payload);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing received MQTT message");
            }
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