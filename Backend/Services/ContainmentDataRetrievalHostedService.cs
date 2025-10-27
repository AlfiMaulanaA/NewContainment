using Microsoft.EntityFrameworkCore;
using Backend.Data;
using System.Text.Json;

namespace Backend.Services
{
    public class ContainmentDataRetrievalHostedService : BackgroundService
    {
        private readonly ILogger<ContainmentDataRetrievalHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IMqttService _mqttService;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(5); // Every 5 minutes
        private readonly string _controlTopic = "IOT/Containment/Control";

        public ContainmentDataRetrievalHostedService(
            ILogger<ContainmentDataRetrievalHostedService> logger,
            IServiceProvider serviceProvider,
            IMqttService mqttService)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _mqttService = mqttService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ContainmentDataRetrievalHostedService starting...");

            try
            {
                // Wait for MQTT connection to be ready
                await WaitForMqttConnectionAsync(stoppingToken);

                // Start the periodic data retrieval
                using var timer = new PeriodicTimer(_interval);

                while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
                {
                    try
                    {
                        await PublishGetDataCommandAsync();
                        _logger.LogInformation("Successfully published Get Data command to containment devices");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error publishing Get Data command to containment devices");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("ContainmentDataRetrievalHostedService stopping due to cancellation");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ContainmentDataRetrievalHostedService");
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
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
            }

            if (!_mqttService.IsConnected)
            {
                _logger.LogError("Failed to establish MQTT connection for data retrieval service");
                throw new Exception("Failed to establish MQTT connection after maximum attempts");
            }

            _logger.LogInformation("MQTT connection established for ContainmentDataRetrievalHostedService");
        }

        private async Task PublishGetDataCommandAsync()
        {
            try
            {
                // Get all active containments to request data from
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<Backend.Data.AppDbContext>();

                var activeContainments = await dbContext.Containments
                    .Where(c => c.IsActive)
                    .ToListAsync();

                if (activeContainments.Count == 0)
                {
                    _logger.LogInformation("No active containments found. Skipping data retrieval.");
                    return;
                }

                // Prepare the Get Data command payload
                var getDataPayload = new
                {
                    data = "Get Data"
                };

                var jsonPayload = JsonSerializer.Serialize(getDataPayload);

                // Publish to MQTT control topic
                await _mqttService.PublishAsync(_controlTopic, jsonPayload);

                _logger.LogInformation(
                    "Published Get Data command to {Count} active containments (topic: {Topic}, payload: {Payload})",
                    activeContainments.Count,
                    _controlTopic,
                    jsonPayload);

                // Log the request for auditing
                foreach (var containment in activeContainments)
                {
                    _logger.LogInformation(
                        "Requested data update for Containment '{Name}' (ID: {Id}, Type: {Type})",
                        containment.Name,
                        containment.Id,
                        containment.Type);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing Get Data command");
                throw;
            }
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ContainmentDataRetrievalHostedService is stopping...");

            await base.StopAsync(stoppingToken);
        }
    }
}
