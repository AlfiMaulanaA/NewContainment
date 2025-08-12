using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using MQTTnet;
using MQTTnet.Protocol;

namespace Backend.Services
{
    public class MqttConfigurationService : IMqttConfigurationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MqttConfigurationService> _logger;

        public MqttConfigurationService(AppDbContext context, IConfiguration configuration, ILogger<MqttConfigurationService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<MqttConfiguration?> GetActiveConfigurationAsync()
        {
            return await _context.MqttConfigurations
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.UpdatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<MqttConfiguration>> GetAllConfigurationsAsync()
        {
            return await _context.MqttConfigurations
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .OrderByDescending(m => m.UpdatedAt)
                .ToListAsync();
        }

        public async Task<MqttConfiguration?> GetConfigurationByIdAsync(int id)
        {
            return await _context.MqttConfigurations
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<MqttConfiguration> CreateConfigurationAsync(MqttConfiguration configuration, int userId)
        {
            configuration.CreatedBy = userId;
            configuration.CreatedAt = DateTime.UtcNow;
            configuration.UpdatedAt = DateTime.UtcNow;
            configuration.IsActive = true;

            // If this is the first configuration or if it's set as active, deactivate others
            var existingConfigs = await _context.MqttConfigurations.ToListAsync();
            if (existingConfigs.Count == 0 || configuration.IsActive)
            {
                foreach (var config in existingConfigs)
                {
                    config.IsActive = false;
                }
            }

            _context.MqttConfigurations.Add(configuration);
            await _context.SaveChangesAsync();

            return await GetConfigurationByIdAsync(configuration.Id) ?? configuration;
        }

        public async Task<MqttConfiguration?> UpdateConfigurationAsync(int id, MqttConfiguration configuration, int userId)
        {
            var existingConfiguration = await _context.MqttConfigurations.FindAsync(id);
            if (existingConfiguration == null)
            {
                return null;
            }

            existingConfiguration.IsEnabled = configuration.IsEnabled;
            existingConfiguration.UseEnvironmentConfig = configuration.UseEnvironmentConfig;
            existingConfiguration.BrokerHost = configuration.BrokerHost;
            existingConfiguration.BrokerPort = configuration.BrokerPort;
            existingConfiguration.Username = configuration.Username;
            existingConfiguration.Password = configuration.Password;
            existingConfiguration.ClientId = configuration.ClientId;
            existingConfiguration.UseSsl = configuration.UseSsl;
            existingConfiguration.KeepAliveInterval = configuration.KeepAliveInterval;
            existingConfiguration.ReconnectDelay = configuration.ReconnectDelay;
            existingConfiguration.TopicPrefix = configuration.TopicPrefix;
            existingConfiguration.Description = configuration.Description;
            existingConfiguration.UpdatedBy = userId;
            existingConfiguration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetConfigurationByIdAsync(id);
        }

        public async Task<bool> DeleteConfigurationAsync(int id)
        {
            var configuration = await _context.MqttConfigurations.FindAsync(id);
            if (configuration == null)
            {
                return false;
            }

            _context.MqttConfigurations.Remove(configuration);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetActiveConfigurationAsync(int id, int userId)
        {
            var configuration = await _context.MqttConfigurations.FindAsync(id);
            if (configuration == null)
            {
                return false;
            }

            // Deactivate all configurations
            var allConfigurations = await _context.MqttConfigurations.ToListAsync();
            foreach (var config in allConfigurations)
            {
                config.IsActive = false;
            }

            // Activate the selected configuration
            configuration.IsActive = true;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleMqttAsync(bool enabled, int userId)
        {
            var activeConfig = await GetActiveConfigurationAsync();
            if (activeConfig == null)
            {
                return false;
            }

            activeConfig.IsEnabled = enabled;
            activeConfig.UpdatedBy = userId;
            activeConfig.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Dictionary<string, object>> GetEffectiveConfigurationAsync()
        {
            var activeConfig = await GetActiveConfigurationAsync();
            var effectiveConfig = new Dictionary<string, object>();

            if (activeConfig == null || activeConfig.UseEnvironmentConfig)
            {
                // Use environment variables
                effectiveConfig["IsEnabled"] = bool.Parse(Environment.GetEnvironmentVariable("MQTT_ENABLE") ?? _configuration["Mqtt:EnableMqtt"] ?? "true");
                effectiveConfig["BrokerHost"] = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST") ?? _configuration["Mqtt:BrokerHost"] ?? "localhost";
                effectiveConfig["BrokerPort"] = int.Parse(Environment.GetEnvironmentVariable("MQTT_BROKER_PORT") ?? _configuration["Mqtt:BrokerPort"] ?? "1883");
                effectiveConfig["Username"] = Environment.GetEnvironmentVariable("MQTT_USERNAME") ?? _configuration["Mqtt:Username"] ?? "";
                effectiveConfig["Password"] = Environment.GetEnvironmentVariable("MQTT_PASSWORD") ?? _configuration["Mqtt:Password"] ?? "";
                effectiveConfig["ClientId"] = Environment.GetEnvironmentVariable("MQTT_CLIENT_ID") ?? _configuration["Mqtt:ClientId"] ?? "ContainmentSystem";
                effectiveConfig["UseSsl"] = bool.Parse(Environment.GetEnvironmentVariable("MQTT_USE_SSL") ?? _configuration["Mqtt:UseSsl"] ?? "false");
                effectiveConfig["KeepAliveInterval"] = int.Parse(Environment.GetEnvironmentVariable("MQTT_KEEP_ALIVE") ?? _configuration["Mqtt:KeepAliveInterval"] ?? "60");
                effectiveConfig["ReconnectDelay"] = int.Parse(Environment.GetEnvironmentVariable("MQTT_RECONNECT_DELAY") ?? _configuration["Mqtt:ReconnectDelay"] ?? "5");
                effectiveConfig["TopicPrefix"] = Environment.GetEnvironmentVariable("MQTT_TOPIC_PREFIX") ?? _configuration["Mqtt:TopicPrefix"] ?? "containment";
                effectiveConfig["Source"] = "Environment/Config";
            }
            else
            {
                // Use database configuration
                effectiveConfig["IsEnabled"] = activeConfig.IsEnabled;
                effectiveConfig["BrokerHost"] = activeConfig.BrokerHost ?? "localhost";
                effectiveConfig["BrokerPort"] = activeConfig.BrokerPort ?? 1883;
                effectiveConfig["Username"] = activeConfig.Username ?? "";
                effectiveConfig["Password"] = activeConfig.Password ?? "";
                effectiveConfig["ClientId"] = activeConfig.ClientId ?? "ContainmentSystem";
                effectiveConfig["UseSsl"] = activeConfig.UseSsl;
                effectiveConfig["KeepAliveInterval"] = activeConfig.KeepAliveInterval;
                effectiveConfig["ReconnectDelay"] = activeConfig.ReconnectDelay;
                effectiveConfig["TopicPrefix"] = activeConfig.TopicPrefix ?? "containment";
                effectiveConfig["Source"] = "Database";
            }

            return effectiveConfig;
        }

        public async Task<Dictionary<int, bool>> GetAllConnectionStatusAsync()
        {
            var configurations = await GetAllConfigurationsAsync();
            var statusDict = new Dictionary<int, bool>();

            foreach (var config in configurations)
            {
                if (config.IsEnabled)
                {
                    try
                    {
                        var connectionStatus = await TestConnectionAsync(config);
                        statusDict[config.Id] = connectionStatus;
                    }
                    catch
                    {
                        statusDict[config.Id] = false;
                    }
                }
                else
                {
                    statusDict[config.Id] = false; // Disabled = not connected
                }
            }

            return statusDict;
        }

        public async Task<bool> TestConnectionAsync(MqttConfiguration configuration)
        {
            try
            {
                var factory = new MqttClientFactory();
                var client = factory.CreateMqttClient();

                var optionsBuilder = new MqttClientOptionsBuilder()
                    .WithTcpServer(configuration.BrokerHost, configuration.BrokerPort)
                    .WithClientId(configuration.ClientId ?? "TestClient")
                    .WithKeepAlivePeriod(TimeSpan.FromSeconds(configuration.KeepAliveInterval));

                if (!string.IsNullOrEmpty(configuration.Username))
                {
                    optionsBuilder.WithCredentials(configuration.Username, configuration.Password);
                }

                if (configuration.UseSsl)
                {
                    optionsBuilder.WithTlsOptions(o => o.UseTls());
                }

                var options = optionsBuilder.Build();

                var connectResult = await client.ConnectAsync(options, CancellationToken.None);
                
                if (connectResult.ResultCode == MqttClientConnectResultCode.Success)
                {
                    await client.DisconnectAsync();
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT connection test failed");
                return false;
            }
        }
    }
}