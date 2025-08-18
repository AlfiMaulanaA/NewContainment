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
            var effectiveConfig = new Dictionary<string, object>();
            var activeConfig = await GetActiveConfigurationAsync();
            
            // Configuration Priority:
            // 1. Database configuration (if exists and not set to use environment)
            // 2. Environment variables
            // 3. appsettings.json
            // 4. Default values

            string source = "Default";

            if (activeConfig != null && !activeConfig.UseEnvironmentConfig && activeConfig.IsEnabled)
            {
                // Use database configuration
                effectiveConfig["IsEnabled"] = activeConfig.IsEnabled;
                effectiveConfig["BrokerHost"] = activeConfig.BrokerHost ?? GetFallbackValue("BrokerHost", "localhost");
                effectiveConfig["BrokerPort"] = activeConfig.BrokerPort ?? GetFallbackValue("BrokerPort", 1883);
                effectiveConfig["Username"] = activeConfig.Username ?? GetFallbackValue("Username", "");
                effectiveConfig["Password"] = activeConfig.Password ?? GetFallbackValue("Password", "");
                effectiveConfig["ClientId"] = activeConfig.ClientId ?? GetFallbackValue("ClientId", "ContainmentSystem");
                effectiveConfig["UseSsl"] = activeConfig.UseSsl;
                effectiveConfig["KeepAliveInterval"] = activeConfig.KeepAliveInterval;
                effectiveConfig["ReconnectDelay"] = activeConfig.ReconnectDelay;
                effectiveConfig["TopicPrefix"] = activeConfig.TopicPrefix ?? GetFallbackValue("TopicPrefix", "containment");
                effectiveConfig["UseWebSocket"] = GetFallbackValue("UseWebSocket", false);
                effectiveConfig["WebSocketUri"] = GetFallbackValue("WebSocketUri", "");
                source = "Database";
            }
            else
            {
                // Use environment/config fallback
                effectiveConfig["IsEnabled"] = GetFallbackValue("IsEnabled", true);
                effectiveConfig["BrokerHost"] = GetFallbackValue("BrokerHost", "localhost");
                effectiveConfig["BrokerPort"] = GetFallbackValue("BrokerPort", 1883);
                effectiveConfig["Username"] = GetFallbackValue("Username", "");
                effectiveConfig["Password"] = GetFallbackValue("Password", "");
                effectiveConfig["ClientId"] = GetFallbackValue("ClientId", "ContainmentSystem");
                effectiveConfig["UseSsl"] = GetFallbackValue("UseSsl", false);
                effectiveConfig["KeepAliveInterval"] = GetFallbackValue("KeepAliveInterval", 60);
                effectiveConfig["ReconnectDelay"] = GetFallbackValue("ReconnectDelay", 5);
                effectiveConfig["TopicPrefix"] = GetFallbackValue("TopicPrefix", "containment");
                effectiveConfig["UseWebSocket"] = GetFallbackValue("UseWebSocket", false);
                effectiveConfig["WebSocketUri"] = GetFallbackValue("WebSocketUri", "");
                source = activeConfig?.UseEnvironmentConfig == true ? "Environment/Config" : "Environment/Config (Fallback)";
            }

            effectiveConfig["Source"] = source;
            effectiveConfig["ConfigurationId"] = activeConfig?.Id ?? (object?)null;
            effectiveConfig["LastUpdated"] = activeConfig?.UpdatedAt ?? DateTime.UtcNow;

            _logger.LogInformation("MQTT Configuration loaded from: {Source}", source);
            return effectiveConfig;
        }

        private T GetFallbackValue<T>(string key, T defaultValue)
        {
            try
            {
                // Environment variables have priority
                var envKey = $"MQTT_{key.ToUpper()}";
                var envValue = Environment.GetEnvironmentVariable(envKey);
                if (!string.IsNullOrEmpty(envValue))
                {
                    return (T)Convert.ChangeType(envValue, typeof(T));
                }

                // Then appsettings.json
                var configKey = $"Mqtt:{key}";
                var configValue = _configuration[configKey];
                if (!string.IsNullOrEmpty(configValue))
                {
                    return (T)Convert.ChangeType(configValue, typeof(T));
                }

                // Finally default value
                return defaultValue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse configuration value for {Key}, using default", key);
                return defaultValue;
            }
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