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
        private readonly IMqttConfigurationChangeNotificationService? _notificationService;
        private readonly IWebHostEnvironment _environment;

        public MqttConfigurationService(AppDbContext context, IConfiguration configuration, ILogger<MqttConfigurationService> logger, IWebHostEnvironment environment, IMqttConfigurationChangeNotificationService? notificationService = null)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _environment = environment;
            _notificationService = notificationService;
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

            // Notify about configuration change
            if (_notificationService != null)
            {
                _ = Task.Run(async () => await _notificationService.NotifyConfigurationChangedAsync(configuration.Id));
            }

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

            // Notify about configuration change
            if (_notificationService != null)
            {
                _ = Task.Run(async () => await _notificationService.NotifyConfigurationChangedAsync(id));
            }

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
            
            // Notify about configuration change
            if (_notificationService != null)
            {
                _ = Task.Run(async () => await _notificationService.NotifyConfigurationChangedAsync(id));
            }
            
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
            
            // Notify about configuration change
            if (_notificationService != null)
            {
                _ = Task.Run(async () => await _notificationService.NotifyConfigurationChangedAsync(id));
            }
            
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
            
            // Notify about configuration change
            if (_notificationService != null)
            {
                _ = Task.Run(async () => await _notificationService.NotifyConfigurationChangedAsync(activeConfig.Id));
            }
            
            return true;
        }

        public async Task<Dictionary<string, object>> GetEffectiveConfigurationAsync()
        {
            var effectiveConfig = new Dictionary<string, object>();
            var activeConfig = await GetActiveConfigurationAsync();

            // Configuration Priority (simplified):
            // 1. Database configuration (if exists and not set to use environment)
            // 2. Environment variables
            // 3. Default values

            string source = "Default";

            // Log current configuration state
            _logger.LogInformation("=== MQTT Configuration Analysis ===");
            
            // Log environment information
            var serverHostname = Environment.MachineName;
            var isProduction = _environment.IsProduction();
            var isDevelopment = _environment.IsDevelopment();
            
            _logger.LogInformation("Environment: {Environment} (Production: {IsProduction}, Development: {IsDevelopment})", 
                _environment.EnvironmentName, isProduction, isDevelopment);
            _logger.LogInformation("Server Hostname: {ServerHostname}", serverHostname);
            
            _logger.LogInformation("Active Database Config Exists: {Exists}", activeConfig != null);
            if (activeConfig != null)
            {
                _logger.LogInformation("Database Config - ID: {Id}, Enabled: {Enabled}, UseEnv: {UseEnv}, Host: {Host}",
                    activeConfig.Id, activeConfig.IsEnabled, activeConfig.UseEnvironmentConfig, activeConfig.BrokerHost);
            }

            // Log environment variables
            var envHost = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST");
            var envPort = Environment.GetEnvironmentVariable("MQTT_BROKER_PORT");
            var envEnabled = Environment.GetEnvironmentVariable("MQTT_ENABLE");
            _logger.LogInformation("Environment Variables - Host: {Host}, Port: {Port}, Enabled: {Enabled}",
                envHost ?? "null", envPort ?? "null", envEnabled ?? "null");


            if (activeConfig != null && !activeConfig.UseEnvironmentConfig && activeConfig.IsEnabled)
            {
                // Use database configuration
                _logger.LogInformation("Using DATABASE configuration (not using environment fallback)");
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
                // Use environment variables or defaults (localhost for production environment config)
                _logger.LogInformation("Using ENVIRONMENT variables or defaults");
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
                source = activeConfig?.UseEnvironmentConfig == true ? "Environment" : "Environment/Defaults";
            }

            // Log final effective configuration
            _logger.LogInformation("=== FINAL MQTT CONFIGURATION ===");
            _logger.LogInformation("Source: {Source}", source);
            _logger.LogInformation("Host: {Host}", effectiveConfig["BrokerHost"]);
            _logger.LogInformation("Port: {Port}", effectiveConfig["BrokerPort"]);
            _logger.LogInformation("Enabled: {Enabled}", effectiveConfig["IsEnabled"]);
            _logger.LogInformation("ClientId: {ClientId}", effectiveConfig["ClientId"]);
            _logger.LogInformation("UseSSL: {UseSsl}", effectiveConfig["UseSsl"]);
            _logger.LogInformation("=================================");

            effectiveConfig["Source"] = source;
            effectiveConfig["ConfigurationId"] = (object?)(activeConfig?.Id);
            effectiveConfig["LastUpdated"] = activeConfig?.UpdatedAt ?? DateTime.UtcNow;

            return effectiveConfig;
        }

        private T GetFallbackValue<T>(string key, T defaultValue)
        {
            var envKey = $"MQTT_{key.ToUpper()}";
            try
            {
                // Only use environment variables, no more AppSettings fallback
                var envValue = Environment.GetEnvironmentVariable(envKey);
                if (!string.IsNullOrEmpty(envValue))
                {
                    return (T)Convert.ChangeType(envValue, typeof(T));
                }

                // Special logic for BrokerHost: use localhost for environment config
                if (key == "BrokerHost")
                {
                    return (T)(object)GetProductionBrokerHost(defaultValue?.ToString() ?? "localhost");
                }

                // Use default value if no environment variable is set
                return defaultValue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse environment variable {EnvKey}, using default", envKey);
                return defaultValue;
            }
        }

        private string GetProductionBrokerHost(string fallbackHost)
        {
            try
            {
                // Use .NET's built-in environment detection (more reliable than manual detection)
                var isProduction = _environment.IsProduction();
                var isDevelopment = _environment.IsDevelopment();

                if (isProduction)
                {
                    // In production with environment config, use localhost as MQTT broker
                    // This ensures the backend connects to local MQTT broker running on the same server
                    // instead of trying to use the server's hostname which might not resolve correctly
                    var brokerHost = "localhost";
                    _logger.LogInformation("PRODUCTION environment detected. Using localhost as MQTT broker for environment configuration (local broker assumed)");
                    return brokerHost;
                }
                else if (isDevelopment)
                {
                    // In development, use environment variable or fallback
                    var envBrokerHost = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST");
                    if (!string.IsNullOrEmpty(envBrokerHost))
                    {
                        _logger.LogInformation("DEVELOPMENT environment detected. Using environment variable MQTT_BROKER_HOST: '{BrokerHost}'", envBrokerHost);
                        return envBrokerHost;
                    }
                    
                    _logger.LogInformation("DEVELOPMENT environment detected. Using fallback broker host: '{BrokerHost}'", fallbackHost);
                    return fallbackHost;
                }
                else
                {
                    // Staging or other environment - use environment variable or fallback
                    var envBrokerHost = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST");
                    if (!string.IsNullOrEmpty(envBrokerHost))
                    {
                        _logger.LogInformation("{EnvironmentName} environment detected. Using environment variable MQTT_BROKER_HOST: '{BrokerHost}'", _environment.EnvironmentName, envBrokerHost);
                        return envBrokerHost;
                    }
                    
                    _logger.LogInformation("{EnvironmentName} environment detected. Using fallback broker host: '{BrokerHost}'", _environment.EnvironmentName, fallbackHost);
                    return fallbackHost;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to determine broker host, using fallback: {FallbackHost}", fallbackHost);
                return fallbackHost;
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

        public async Task<Dictionary<string, object>> GetDetailedMqttStatusAsync()
        {
            var status = new Dictionary<string, object>();

            try
            {
                // Get current effective configuration
                var effectiveConfig = await GetEffectiveConfigurationAsync();

                status["ConfigurationSource"] = effectiveConfig["Source"];
                status["BrokerHost"] = effectiveConfig["BrokerHost"];
                status["BrokerPort"] = effectiveConfig["BrokerPort"];
                status["IsEnabled"] = effectiveConfig["IsEnabled"];
                status["ClientId"] = effectiveConfig["ClientId"];
                status["UseSsl"] = effectiveConfig["UseSsl"];
                status["UseWebSocket"] = effectiveConfig["UseWebSocket"];

                // Get database configuration details
                var activeConfig = await GetActiveConfigurationAsync();
                if (activeConfig != null)
                {
                    status["DatabaseConfigId"] = activeConfig.Id;
                    status["DatabaseConfigName"] = activeConfig.Description ?? "No description";
                    status["DatabaseUseEnvironment"] = activeConfig.UseEnvironmentConfig;
                    status["DatabaseLastUpdated"] = activeConfig.UpdatedAt;
                }
                else
                {
                    status["DatabaseConfigId"] = null;
                    status["DatabaseConfigName"] = "No active database configuration";
                    status["DatabaseUseEnvironment"] = null;
                    status["DatabaseLastUpdated"] = null;
                }

                // Get environment variables
                status["EnvironmentVariables"] = new Dictionary<string, string?>
                {
                    ["MQTT_BROKER_HOST"] = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST"),
                    ["MQTT_BROKER_PORT"] = Environment.GetEnvironmentVariable("MQTT_BROKER_PORT"),
                    ["MQTT_CLIENT_ID"] = Environment.GetEnvironmentVariable("MQTT_CLIENT_ID"),
                    ["MQTT_USERNAME"] = Environment.GetEnvironmentVariable("MQTT_USERNAME"),
                    ["MQTT_PASSWORD"] = Environment.GetEnvironmentVariable("MQTT_PASSWORD"),
                    ["MQTT_USE_TLS"] = Environment.GetEnvironmentVariable("MQTT_USE_TLS"),
                    ["MQTT_ENABLE"] = Environment.GetEnvironmentVariable("MQTT_ENABLE")
                };


                // Test connection if enabled
                if ((bool)effectiveConfig["IsEnabled"])
                {
                    try
                    {
                        var testConfig = new MqttConfiguration
                        {
                            BrokerHost = (string)effectiveConfig["BrokerHost"],
                            BrokerPort = (int)effectiveConfig["BrokerPort"],
                            ClientId = (string)effectiveConfig["ClientId"],
                            Username = (string)effectiveConfig["Username"],
                            Password = (string)effectiveConfig["Password"],
                            UseSsl = (bool)effectiveConfig["UseSsl"],
                            KeepAliveInterval = (int)effectiveConfig["KeepAliveInterval"]
                        };

                        var connectionTest = await TestConnectionAsync(testConfig);
                        status["ConnectionTestResult"] = connectionTest;
                        status["ConnectionTestTimestamp"] = DateTime.UtcNow;

                        if (connectionTest)
                        {
                            status["ConnectionStatus"] = "✅ Can connect to broker";
                        }
                        else
                        {
                            status["ConnectionStatus"] = "❌ Cannot connect to broker";
                        }
                    }
                    catch (Exception ex)
                    {
                        status["ConnectionTestResult"] = false;
                        status["ConnectionTestError"] = ex.Message;
                        status["ConnectionStatus"] = $"❌ Connection test failed: {ex.Message}";
                        status["ConnectionTestTimestamp"] = DateTime.UtcNow;
                    }
                }
                else
                {
                    status["ConnectionTestResult"] = null;
                    status["ConnectionStatus"] = "⚠️ MQTT is disabled";
                }

                status["Timestamp"] = DateTime.UtcNow;
                status["Status"] = "Success";

                _logger.LogInformation("=== DETAILED MQTT STATUS LOG ===");
                _logger.LogInformation("Source: {Source}", status["ConfigurationSource"]);
                _logger.LogInformation("Broker: {Host}:{Port}", status["BrokerHost"], status["BrokerPort"]);
                _logger.LogInformation("Status: {Status}", status["ConnectionStatus"]);
                _logger.LogInformation("Enabled: {Enabled}", status["IsEnabled"]);
                _logger.LogInformation("==================================");

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get detailed MQTT status");
                status["Status"] = "Error";
                status["Error"] = ex.Message;
                status["Timestamp"] = DateTime.UtcNow;
            }

            return status;
        }
    }
}
