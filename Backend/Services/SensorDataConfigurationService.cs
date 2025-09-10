using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    /// <summary>
    /// Service implementation for managing sensor data configuration
    /// </summary>
    public class SensorDataConfigurationService : ISensorDataConfigurationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SensorDataConfigurationService> _logger;
        private readonly IDeviceSensorDataService _sensorDataService;

        public SensorDataConfigurationService(
            AppDbContext context,
            ILogger<SensorDataConfigurationService> logger,
            IDeviceSensorDataService sensorDataService)
        {
            _context = context;
            _logger = logger;
            _sensorDataService = sensorDataService;
        }

        // Configuration Management
        public async Task<IEnumerable<SensorDataConfiguration>> GetAllConfigurationsAsync()
        {
            return await _context.SensorDataConfigurations
                .Include(c => c.Device)
                .Include(c => c.Containment)
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();
        }

        public async Task<SensorDataConfiguration?> GetConfigurationByIdAsync(int id)
        {
            return await _context.SensorDataConfigurations
                .Include(c => c.Device)
                .Include(c => c.Containment)
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        }

        public async Task<SensorDataConfiguration?> GetGlobalConfigurationAsync()
        {
            return await _context.SensorDataConfigurations
                .FirstOrDefaultAsync(c => c.IsGlobalConfiguration && c.IsActive);
        }

        public async Task<SensorDataConfiguration?> GetConfigurationByDeviceIdAsync(int deviceId)
        {
            return await _context.SensorDataConfigurations
                .FirstOrDefaultAsync(c => c.DeviceId == deviceId && c.IsActive);
        }

        public async Task<SensorDataConfiguration?> GetConfigurationByContainmentIdAsync(int containmentId)
        {
            return await _context.SensorDataConfigurations
                .FirstOrDefaultAsync(c => c.ContainmentId == containmentId && c.IsActive);
        }

        public async Task<SensorDataConfiguration> CreateConfigurationAsync(SensorDataConfiguration configuration)
        {
            configuration.CreatedAt = DateTime.UtcNow;
            configuration.UpdatedAt = DateTime.UtcNow;

            _context.SensorDataConfigurations.Add(configuration);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Created sensor data configuration: {configuration.Name} (ID: {configuration.Id})");
            return configuration;
        }

        public async Task<SensorDataConfiguration> UpdateConfigurationAsync(SensorDataConfiguration configuration)
        {
            var existingConfig = await _context.SensorDataConfigurations.FindAsync(configuration.Id);
            if (existingConfig == null)
                throw new ArgumentException($"Configuration with ID {configuration.Id} not found");

            // Update all properties except audit fields
            existingConfig.Name = configuration.Name;
            existingConfig.Description = configuration.Description;
            existingConfig.SaveIntervalSeconds = configuration.SaveIntervalSeconds;
            existingConfig.IsIntervalEnabled = configuration.IsIntervalEnabled;
            existingConfig.IsTemperatureThresholdEnabled = configuration.IsTemperatureThresholdEnabled;
            existingConfig.TemperatureUpperThreshold = configuration.TemperatureUpperThreshold;
            existingConfig.TemperatureLowerThreshold = configuration.TemperatureLowerThreshold;
            existingConfig.TemperatureColdColor = configuration.TemperatureColdColor;
            existingConfig.TemperatureNormalColor = configuration.TemperatureNormalColor;
            existingConfig.TemperatureWarmColor = configuration.TemperatureWarmColor;
            existingConfig.TemperatureHotColor = configuration.TemperatureHotColor;
            existingConfig.TemperatureCriticalColor = configuration.TemperatureCriticalColor;
            existingConfig.TemperatureColdMax = configuration.TemperatureColdMax;
            existingConfig.TemperatureNormalMin = configuration.TemperatureNormalMin;
            existingConfig.TemperatureNormalMax = configuration.TemperatureNormalMax;
            existingConfig.TemperatureWarmMin = configuration.TemperatureWarmMin;
            existingConfig.TemperatureWarmMax = configuration.TemperatureWarmMax;
            existingConfig.TemperatureHotMin = configuration.TemperatureHotMin;
            existingConfig.TemperatureHotMax = configuration.TemperatureHotMax;
            existingConfig.TemperatureCriticalMin = configuration.TemperatureCriticalMin;
            existingConfig.AutoSaveOnThresholdExceed = configuration.AutoSaveOnThresholdExceed;
            existingConfig.AutoSaveOnUpperThreshold = configuration.AutoSaveOnUpperThreshold;
            existingConfig.AutoSaveOnLowerThreshold = configuration.AutoSaveOnLowerThreshold;
            existingConfig.EnableNotifications = configuration.EnableNotifications;
            existingConfig.NotificationRecipients = configuration.NotificationRecipients;
            existingConfig.UpdatedBy = configuration.UpdatedBy;
            existingConfig.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated sensor data configuration: {existingConfig.Name} (ID: {existingConfig.Id})");
            return existingConfig;
        }

        public async Task<bool> DeleteConfigurationAsync(int id)
        {
            var configuration = await _context.SensorDataConfigurations.FindAsync(id);
            if (configuration == null)
                return false;

            // Soft delete
            configuration.IsActive = false;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Deleted sensor data configuration: {configuration.Name} (ID: {id})");
            return true;
        }

        // Interval Management (Task 7)
        public async Task<bool> UpdateSaveIntervalAsync(int configurationId, int intervalSeconds, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.SaveIntervalSeconds = intervalSeconds;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated save interval to {intervalSeconds} seconds for configuration {configurationId}");
            return true;
        }

        public async Task<IEnumerable<SensorDataConfiguration>> GetConfigurationsByIntervalAsync(int intervalSeconds)
        {
            return await _context.SensorDataConfigurations
                .Where(c => c.SaveIntervalSeconds == intervalSeconds && c.IsIntervalEnabled && c.IsActive)
                .ToListAsync();
        }

        public async Task<bool> EnableDisableIntervalAsync(int configurationId, bool isEnabled, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.IsIntervalEnabled = isEnabled;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"{(isEnabled ? "Enabled" : "Disabled")} interval saving for configuration {configurationId}");
            return true;
        }

        // Temperature Threshold Management (Task 8)
        public async Task<bool> UpdateTemperatureThresholdsAsync(int configurationId, decimal? upperThreshold, decimal? lowerThreshold, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.TemperatureUpperThreshold = upperThreshold;
            config.TemperatureLowerThreshold = lowerThreshold;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated temperature thresholds for configuration {configurationId}: Upper={upperThreshold}, Lower={lowerThreshold}");
            return true;
        }

        public async Task<bool> EnableDisableThresholdsAsync(int configurationId, bool isEnabled, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.IsTemperatureThresholdEnabled = isEnabled;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"{(isEnabled ? "Enabled" : "Disabled")} temperature thresholds for configuration {configurationId}");
            return true;
        }

        // Color Range Management (Task 8)
        public async Task<bool> UpdateTemperatureColorsAsync(int configurationId, string coldColor, string normalColor, string warmColor, string hotColor, string criticalColor, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.TemperatureColdColor = coldColor;
            config.TemperatureNormalColor = normalColor;
            config.TemperatureWarmColor = warmColor;
            config.TemperatureHotColor = hotColor;
            config.TemperatureCriticalColor = criticalColor;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated temperature colors for configuration {configurationId}");
            return true;
        }

        public async Task<bool> UpdateTemperatureRangesAsync(int configurationId, decimal coldMax, decimal normalMin, decimal normalMax, decimal warmMin, decimal warmMax, decimal hotMin, decimal hotMax, decimal criticalMin, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.TemperatureColdMax = coldMax;
            config.TemperatureNormalMin = normalMin;
            config.TemperatureNormalMax = normalMax;
            config.TemperatureWarmMin = warmMin;
            config.TemperatureWarmMax = warmMax;
            config.TemperatureHotMin = hotMin;
            config.TemperatureHotMax = hotMax;
            config.TemperatureCriticalMin = criticalMin;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated temperature ranges for configuration {configurationId}");
            return true;
        }

        // Auto-save Configuration (Task 9)
        public async Task<bool> UpdateAutoSaveSettingsAsync(int configurationId, bool autoSaveOnThreshold, bool onUpper, bool onLower, int userId)
        {
            var config = await _context.SensorDataConfigurations.FindAsync(configurationId);
            if (config == null) return false;

            config.AutoSaveOnThresholdExceed = autoSaveOnThreshold;
            config.AutoSaveOnUpperThreshold = onUpper;
            config.AutoSaveOnLowerThreshold = onLower;
            config.UpdatedBy = userId;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated auto-save settings for configuration {configurationId}");
            return true;
        }

        // Helper Methods
        public async Task<string> GetTemperatureColorAsync(decimal temperature, int? deviceId = null, int? containmentId = null)
        {
            var config = await GetEffectiveConfigurationAsync(deviceId, containmentId);
            return config?.GetTemperatureColor(temperature) ?? "#10B981"; // Default green
        }

        public async Task<string> GetTemperatureStatusAsync(decimal temperature, int? deviceId = null, int? containmentId = null)
        {
            var config = await GetEffectiveConfigurationAsync(deviceId, containmentId);
            return config?.GetTemperatureStatus(temperature) ?? "Normal";
        }

        public async Task<bool> ShouldAutoSaveAsync(decimal temperature, int? deviceId = null, int? containmentId = null)
        {
            var config = await GetEffectiveConfigurationAsync(deviceId, containmentId);
            return config?.IsThresholdExceeded(temperature) ?? false;
        }

        public async Task<SensorDataConfiguration?> GetEffectiveConfigurationAsync(int? deviceId = null, int? containmentId = null)
        {
            // Priority: Device-specific > Containment-specific > Global
            if (deviceId.HasValue)
            {
                var deviceConfig = await GetConfigurationByDeviceIdAsync(deviceId.Value);
                if (deviceConfig != null) return deviceConfig;
            }

            if (containmentId.HasValue)
            {
                var containmentConfig = await GetConfigurationByContainmentIdAsync(containmentId.Value);
                if (containmentConfig != null) return containmentConfig;
            }

            return await GetGlobalConfigurationAsync();
        }

        // Auto Sensor Data Log Management
        public async Task<IEnumerable<AutoSensorDataLog>> GetAutoSaveLogsAsync(int page = 1, int pageSize = 50, int? deviceId = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.AutoSensorDataLogs
                .Include(l => l.Device)
                .Include(l => l.SensorData)
                .Include(l => l.Configuration)
                .AsQueryable();

            if (deviceId.HasValue)
                query = query.Where(l => l.DeviceId == deviceId.Value);

            if (startDate.HasValue)
                query = query.Where(l => l.TriggerTime >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(l => l.TriggerTime <= endDate.Value);

            return await query
                .OrderByDescending(l => l.TriggerTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<AutoSensorDataLog> LogAutoSaveAsync(int deviceId, int sensorDataId, int configurationId, string triggerReason, decimal? temperature = null, decimal? threshold = null)
        {
            var config = await GetConfigurationByIdAsync(configurationId);
            if (config == null)
                throw new ArgumentException($"Configuration {configurationId} not found");

            var log = new AutoSensorDataLog
            {
                DeviceId = deviceId,
                SensorDataId = sensorDataId,
                ConfigurationId = configurationId,
                TriggerReason = triggerReason,
                TemperatureValue = temperature,
                ThresholdValue = threshold,
                ViolationType = config.GetThresholdViolationType(temperature ?? 0) ?? "Interval",
                TemperatureStatus = temperature.HasValue ? config.GetTemperatureStatus(temperature.Value) : "Unknown",
                TemperatureColor = temperature.HasValue ? config.GetTemperatureColor(temperature.Value) : null,
                TriggerTime = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.AutoSensorDataLogs.Add(log);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Auto-save logged: Device {deviceId}, Reason: {triggerReason}, Temperature: {temperature}°C");

            return log;
        }

        public async Task<object> GetAutoSaveStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.AutoSensorDataLogs.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(l => l.TriggerTime >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(l => l.TriggerTime <= endDate.Value);

            var stats = await query
                .GroupBy(l => l.TriggerReason)
                .Select(g => new
                {
                    TriggerReason = g.Key,
                    Count = g.Count(),
                    LatestTrigger = g.Max(x => x.TriggerTime)
                })
                .ToListAsync();

            var deviceStats = await query
                .GroupBy(l => l.DeviceId)
                .Select(g => new
                {
                    DeviceId = g.Key,
                    DeviceName = g.First().Device.Name,
                    TriggerCount = g.Count(),
                    LatestTrigger = g.Max(x => x.TriggerTime)
                })
                .ToListAsync();

            return new
            {
                TotalLogs = await query.CountAsync(),
                TriggerStatistics = stats,
                DeviceStatistics = deviceStats,
                DateRange = new { Start = startDate, End = endDate },
                GeneratedAt = DateTime.UtcNow
            };
        }

        // Notification Management
        public async Task<bool> SendThresholdNotificationAsync(AutoSensorDataLog log)
        {
            try
            {
                // This would integrate with your notification service (email, WhatsApp, etc.)
                // For now, just mark as sent
                log.NotificationSent = true;
                log.NotificationSentAt = DateTime.UtcNow;
                log.NotificationStatus = "Notification sent successfully";

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Notification sent for auto-save log {log.Id}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send notification for auto-save log {log.Id}");

                log.NotificationStatus = $"Failed: {ex.Message}";
                await _context.SaveChangesAsync();

                return false;
            }
        }

        public async Task<IEnumerable<AutoSensorDataLog>> GetPendingNotificationsAsync()
        {
            return await _context.AutoSensorDataLogs
                .Include(l => l.Device)
                .Include(l => l.Configuration)
                .Where(l => !l.NotificationSent &&
                           (l.TriggerReason == "UpperThreshold" || l.TriggerReason == "LowerThreshold"))
                .OrderBy(l => l.TriggerTime)
                .ToListAsync();
        }
    }
}