namespace Backend.Services
{
    public class MqttConfigurationChangeNotificationService : IMqttConfigurationChangeNotificationService
    {
        private readonly ILogger<MqttConfigurationChangeNotificationService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public event EventHandler<MqttConfigurationChangedEventArgs>? ConfigurationChanged;

        public MqttConfigurationChangeNotificationService(
            ILogger<MqttConfigurationChangeNotificationService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public async Task NotifyConfigurationChangedAsync(int? configurationId = null)
        {
            try
            {
                _logger.LogInformation("MQTT configuration changed notification triggered for config ID: {ConfigurationId}", configurationId);
                
                var eventArgs = new MqttConfigurationChangedEventArgs(configurationId, "Updated");
                ConfigurationChanged?.Invoke(this, eventArgs);

                // Automatically reload all MQTT services
                await ReloadAllMqttServicesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error notifying MQTT configuration change");
            }
        }

        public async Task ReloadAllMqttServicesAsync()
        {
            try
            {
                _logger.LogInformation("=== MQTT Configuration Reload Started ===");

                using var scope = _serviceProvider.CreateScope();
                
                // Get the main MQTT service (singleton)
                var mqttService = scope.ServiceProvider.GetService<IMqttService>();
                if (mqttService != null)
                {
                    _logger.LogInformation("Reloading main MQTT service connection...");
                    await mqttService.ReconnectWithNewConfigAsync();
                    _logger.LogInformation("✅ Main MQTT service reloaded successfully");
                }
                else
                {
                    _logger.LogWarning("Main MQTT service not found - it may not be registered");
                }

                _logger.LogInformation("=== MQTT Configuration Reload Completed ===");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to reload MQTT services");
                throw;
            }
        }
    }
}