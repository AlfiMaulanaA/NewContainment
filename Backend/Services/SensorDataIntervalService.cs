using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    /// <summary>
    /// Service for sensor data interval configuration management
    /// </summary>
    public class SensorDataIntervalService : ISensorDataIntervalService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SensorDataIntervalService> _logger;

        public SensorDataIntervalService(
            AppDbContext context,
            ILogger<SensorDataIntervalService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Configuration Management
        public async Task<IEnumerable<SensorDataIntervalConfig>> GetAllConfigurationsAsync()
        {
            return await _context.SensorDataIntervalConfigs
                .Include(c => c.Device)
                .Include(c => c.Containment)
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Where(c => c.IsActive)
                .OrderBy(c => c.IsGlobalConfiguration ? 0 : c.ContainmentId.HasValue ? 1 : 2)
                .ThenBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<SensorDataIntervalConfig?> GetConfigurationByIdAsync(int id)
        {
            return await _context.SensorDataIntervalConfigs
                .Include(c => c.Device)
                .Include(c => c.Containment)
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        }

        public async Task<SensorDataIntervalConfig> CreateConfigurationAsync(SensorDataIntervalConfig config)
        {
            // Validate interval
            if (!config.IsValidInterval())
            {
                throw new ArgumentException($"Invalid interval: {config.SaveIntervalMinutes} minutes. Must be one of: 1, 15, 30, 60, 360, 720, 1440");
            }

            // Check for existing configuration and update if exists (upsert logic)
            var existingConfig = await GetExistingConfigurationAsync(config.DeviceId, config.ContainmentId, config.IsGlobalConfiguration);
            if (existingConfig != null)
            {
                // Update existing configuration instead of throwing error
                existingConfig.Name = config.Name;
                existingConfig.Description = config.Description;
                existingConfig.SaveIntervalMinutes = config.SaveIntervalMinutes;
                existingConfig.IsEnabled = config.IsEnabled;
                existingConfig.UpdatedBy = config.CreatedBy; // Use CreatedBy as UpdatedBy for new configs
                existingConfig.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Updated existing sensor interval configuration {Id} to {Interval} minutes", 
                    existingConfig.Id, config.SaveIntervalMinutes);
                
                return existingConfig;
            }

            config.CreatedAt = DateTime.UtcNow;
            config.UpdatedAt = DateTime.UtcNow;

            _context.SensorDataIntervalConfigs.Add(config);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created sensor interval configuration {Id} with {Interval} minutes interval", 
                config.Id, config.SaveIntervalMinutes);

            return config;
        }

        public async Task<SensorDataIntervalConfig> UpdateConfigurationAsync(SensorDataIntervalConfig config)
        {
            var existingConfig = await GetConfigurationByIdAsync(config.Id);
            if (existingConfig == null)
            {
                throw new ArgumentException($"Configuration with ID {config.Id} not found");
            }

            // Validate interval
            if (!config.IsValidInterval())
            {
                throw new ArgumentException($"Invalid interval: {config.SaveIntervalMinutes} minutes. Must be one of: 1, 15, 30, 60, 360, 720, 1440");
            }

            existingConfig.Name = config.Name;
            existingConfig.Description = config.Description;
            existingConfig.SaveIntervalMinutes = config.SaveIntervalMinutes;
            existingConfig.IsEnabled = config.IsEnabled;
            existingConfig.UpdatedBy = config.UpdatedBy;
            existingConfig.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated sensor interval configuration {Id} to {Interval} minutes", 
                config.Id, config.SaveIntervalMinutes);

            return existingConfig;
        }

        public async Task<bool> DeleteConfigurationAsync(int id)
        {
            var config = await GetConfigurationByIdAsync(id);
            if (config == null)
                return false;

            config.IsActive = false;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted sensor interval configuration {Id}", id);
            return true;
        }

        // Device/Containment specific configurations
        public async Task<SensorDataIntervalConfig?> GetDeviceConfigurationAsync(int deviceId)
        {
            return await _context.SensorDataIntervalConfigs
                .FirstOrDefaultAsync(c => c.DeviceId == deviceId && c.IsActive && c.IsEnabled);
        }

        public async Task<SensorDataIntervalConfig?> GetContainmentConfigurationAsync(int containmentId)
        {
            return await _context.SensorDataIntervalConfigs
                .FirstOrDefaultAsync(c => c.ContainmentId == containmentId && c.IsActive && c.IsEnabled);
        }

        public async Task<SensorDataIntervalConfig?> GetGlobalConfigurationAsync()
        {
            return await _context.SensorDataIntervalConfigs
                .FirstOrDefaultAsync(c => c.IsGlobalConfiguration && c.IsActive && c.IsEnabled);
        }

        // Effective configuration (priority: Device -> Containment -> Global)
        public async Task<SensorDataIntervalConfig?> GetEffectiveConfigurationAsync(int deviceId, int? containmentId = null)
        {
            // 1. Try device-specific configuration
            var deviceConfig = await GetDeviceConfigurationAsync(deviceId);
            if (deviceConfig != null)
                return deviceConfig;

            // 2. Try containment configuration if containmentId provided
            if (containmentId.HasValue)
            {
                var containmentConfig = await GetContainmentConfigurationAsync(containmentId.Value);
                if (containmentConfig != null)
                    return containmentConfig;
            }

            // 3. Get device's containment via rack if not provided
            if (!containmentId.HasValue)
            {
                var device = await _context.Devices
                    .Include(d => d.Rack)
                    .FirstOrDefaultAsync(d => d.Id == deviceId);
                if (device?.Rack != null)
                {
                    var containmentConfig = await GetContainmentConfigurationAsync(device.Rack.ContainmentId);
                    if (containmentConfig != null)
                        return containmentConfig;
                }
            }

            // 4. Fall back to global configuration
            return await GetGlobalConfigurationAsync();
        }

        // Interval checking with precise timestamp scheduling
        public async Task<bool> ShouldSaveByIntervalAsync(int deviceId, DateTime timestamp, int? containmentId = null)
        {
            var config = await GetEffectiveConfigurationAsync(deviceId, containmentId);
            if (config == null || !config.IsEnabled)
                return false;

            var intervalMinutes = config.SaveIntervalMinutes;
            var roundedTimestamp = GetRoundedTime(timestamp, intervalMinutes);
            
            // Get the last saved data for this device
            var lastData = await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId)
                .OrderByDescending(d => d.Timestamp)
                .FirstOrDefaultAsync();

            if (lastData == null)
            {
                // First data point - save if we're at the exact scheduled time
                var shouldSaveFirst = IsTimeForScheduledSave(timestamp, intervalMinutes);
                _logger.LogDebug("Device {DeviceId}: First data point at {Timestamp} (rounded: {RoundedTime}), Mode: {Mode}, Should save: {ShouldSave}", 
                    deviceId, timestamp, roundedTimestamp, config.GetIntervalMode(), shouldSaveFirst);
                return shouldSaveFirst;
            }

            // Check if we already saved data for this exact rounded time
            var timeTolerance = TimeSpan.FromSeconds(5);
            var alreadySavedForThisInterval = await _context.DeviceSensorData
                .Where(d => d.DeviceId == deviceId)
                .AnyAsync(d => Math.Abs((d.Timestamp - roundedTimestamp).TotalSeconds) <= timeTolerance.TotalSeconds);

            if (alreadySavedForThisInterval)
            {
                _logger.LogDebug("Device {DeviceId}: Already saved data for interval {RoundedTime}, skipping", 
                    deviceId, roundedTimestamp);
                return false;
            }

            // Check if enough time has passed since last save AND we're at the exact time
            var timeSinceLastSave = timestamp - lastData.Timestamp;
            var intervalSeconds = config.GetIntervalInSeconds();
            var timeBasedCheck = timeSinceLastSave.TotalSeconds >= (intervalSeconds - 10); // Small buffer for timing
            var scheduledTimeCheck = IsTimeForScheduledSave(timestamp, intervalMinutes);
            
            var shouldSave = timeBasedCheck && scheduledTimeCheck;

            var mode = config.IsDevelopmentMode() ? "DEV" : config.IsProductionMode() ? "PROD" : "CUSTOM";
            _logger.LogDebug("Device {DeviceId} [{Mode}]: Time since last save: {TimeSince}s, Interval: {Interval}s, Exact time check: {ExactTime}, Should save: {ShouldSave}",
                deviceId, mode, Math.Round(timeSinceLastSave.TotalSeconds, 1), intervalSeconds, scheduledTimeCheck, shouldSave);

            return shouldSave;
        }

        // Helper method to check if timestamp is at a scheduled interval (precise timing)
        private bool IsAtScheduledTime(DateTime timestamp, int intervalMinutes)
        {
            return intervalMinutes switch
            {
                1 => timestamp.Second == 0, // Save at exact minute: xx:xx:00
                60 => timestamp.Minute == 0 && timestamp.Second == 0, // Save at exact hour: xx:00:00
                _ => timestamp.Minute % intervalMinutes == 0 && timestamp.Second == 0 // Custom intervals
            };
        }

        // Enhanced method to check if we should save based on exact timing
        private bool IsTimeForScheduledSave(DateTime timestamp, int intervalMinutes)
        {
            var roundedTime = GetRoundedTime(timestamp, intervalMinutes);
            var tolerance = TimeSpan.FromSeconds(5); // 5-second tolerance for network delays
            
            return Math.Abs((timestamp - roundedTime).TotalSeconds) <= tolerance.TotalSeconds;
        }

        // Get the exact rounded time for the interval
        private DateTime GetRoundedTime(DateTime timestamp, int intervalMinutes)
        {
            return intervalMinutes switch
            {
                1 => new DateTime(timestamp.Year, timestamp.Month, timestamp.Day, 
                    timestamp.Hour, timestamp.Minute, 0, DateTimeKind.Utc),
                60 => new DateTime(timestamp.Year, timestamp.Month, timestamp.Day, 
                    timestamp.Hour, 0, 0, DateTimeKind.Utc),
                _ => RoundToNearestInterval(timestamp, intervalMinutes)
            };
        }

        // Helper method to get next scheduled save time
        private DateTime GetNextScheduledSaveTime(DateTime currentTime, int intervalMinutes)
        {
            return intervalMinutes switch
            {
                1 => new DateTime(currentTime.Year, currentTime.Month, currentTime.Day, 
                    currentTime.Hour, currentTime.Minute, 0).AddMinutes(1),
                60 => new DateTime(currentTime.Year, currentTime.Month, currentTime.Day, 
                    currentTime.Hour, 0, 0).AddHours(1),
                _ => RoundToNextInterval(currentTime, intervalMinutes)
            };
        }

        // Round to the nearest interval time
        private DateTime RoundToNearestInterval(DateTime dateTime, int intervalMinutes)
        {
            var roundedMinutes = (dateTime.Minute / intervalMinutes) * intervalMinutes;
            return new DateTime(dateTime.Year, dateTime.Month, dateTime.Day, dateTime.Hour, roundedMinutes, 0);
        }

        // Helper method to round to next interval
        private DateTime RoundToNextInterval(DateTime dateTime, int intervalMinutes)
        {
            var roundedMinutes = ((dateTime.Minute / intervalMinutes) + 1) * intervalMinutes;
            if (roundedMinutes >= 60)
            {
                return new DateTime(dateTime.Year, dateTime.Month, dateTime.Day, dateTime.Hour, 0, 0)
                    .AddHours(1).AddMinutes(roundedMinutes - 60);
            }
            return new DateTime(dateTime.Year, dateTime.Month, dateTime.Day, dateTime.Hour, roundedMinutes, 0);
        }

        // Get devices by interval
        public async Task<IEnumerable<SensorDataIntervalConfig>> GetConfigurationsByIntervalAsync(int intervalMinutes)
        {
            return await _context.SensorDataIntervalConfigs
                .Include(c => c.Device)
                .Include(c => c.Containment)
                .Where(c => c.SaveIntervalMinutes == intervalMinutes && c.IsActive && c.IsEnabled)
                .ToListAsync();
        }

        // Available intervals
        public List<(int Value, string Label)> GetAvailableIntervals()
        {
            return SensorDataIntervalConfig.GetAvailableIntervals()
                .Select(x => (x.Value, x.Label))
                .ToList();
        }

        // Toggle enable/disable
        public async Task<bool> ToggleConfigurationAsync(int id, bool enabled)
        {
            var config = await GetConfigurationByIdAsync(id);
            if (config == null)
                return false;

            config.IsEnabled = enabled;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Toggled sensor interval configuration {Id} to {Status}", 
                id, enabled ? "enabled" : "disabled");

            return true;
        }

        // Update interval only
        public async Task<bool> UpdateIntervalAsync(int id, int intervalMinutes)
        {
            var config = await GetConfigurationByIdAsync(id);
            if (config == null)
                return false;

            // Validate interval
            var tempConfig = new SensorDataIntervalConfig { SaveIntervalMinutes = intervalMinutes };
            if (!tempConfig.IsValidInterval())
            {
                throw new ArgumentException($"Invalid interval: {intervalMinutes} minutes. Must be one of: 1, 15, 30, 60, 360, 720, 1440");
            }

            config.SaveIntervalMinutes = intervalMinutes;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated sensor interval configuration {Id} interval to {Interval} minutes", 
                id, intervalMinutes);

            return true;
        }

        // Initialize default configuration based on environment
        public async Task<bool> InitializeDefaultConfigurationAsync(int userId)
        {
            var existingGlobal = await GetGlobalConfigurationAsync();
            if (existingGlobal != null)
            {
                _logger.LogInformation("Global configuration already exists, skipping initialization");
                return false;
            }

            var defaultInterval = SensorDataIntervalConfig.GetDefaultIntervalForEnvironment();
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
            var mode = defaultInterval == 1 ? "Debug/Development" : "Production";

            var globalConfig = new SensorDataIntervalConfig
            {
                Name = $"Global Sensor Interval ({mode})",
                Description = $"Default sensor data save interval for {environment} environment - saves data every {(defaultInterval == 1 ? "minute" : "hour")} at exact rounded times",
                SaveIntervalMinutes = defaultInterval,
                IsEnabled = true,
                IsGlobalConfiguration = true,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            await CreateConfigurationAsync(globalConfig);
            _logger.LogInformation("Initialized global sensor interval configuration: {Interval} minutes for {Environment} mode", 
                defaultInterval, mode);

            return true;
        }

        // Bulk operations
        public async Task<bool> SetGlobalIntervalAsync(int intervalMinutes, int userId)
        {
            var globalConfig = await GetGlobalConfigurationAsync();

            if (globalConfig == null)
            {
                // Create new global configuration
                var mode = intervalMinutes == 1 ? "Debug/Development" : intervalMinutes == 60 ? "Production" : "Custom";
                globalConfig = new SensorDataIntervalConfig
                {
                    Name = $"Global Sensor Interval ({mode})",
                    Description = $"Global sensor data save interval configuration - saves data every {(intervalMinutes == 1 ? "minute" : intervalMinutes == 60 ? "hour" : intervalMinutes + " minutes")} at exact rounded times",
                    SaveIntervalMinutes = intervalMinutes,
                    IsEnabled = true,
                    IsGlobalConfiguration = true,
                    CreatedBy = userId,
                    UpdatedBy = userId
                };

                await CreateConfigurationAsync(globalConfig);
            }
            else
            {
                var mode = intervalMinutes == 1 ? "Debug/Development" : intervalMinutes == 60 ? "Production" : "Custom";
                globalConfig.Name = $"Global Sensor Interval ({mode})";
                globalConfig.Description = $"Global sensor data save interval configuration - saves data every {(intervalMinutes == 1 ? "minute" : intervalMinutes == 60 ? "hour" : intervalMinutes + " minutes")} at exact rounded times";
                globalConfig.SaveIntervalMinutes = intervalMinutes;
                globalConfig.UpdatedBy = userId;
                await UpdateConfigurationAsync(globalConfig);
            }

            return true;
        }

        public async Task<bool> SetDeviceIntervalAsync(int deviceId, int intervalMinutes, int userId)
        {
            var deviceConfig = await GetDeviceConfigurationAsync(deviceId);

            if (deviceConfig == null)
            {
                // Create new device configuration
                deviceConfig = new SensorDataIntervalConfig
                {
                    Name = $"Device {deviceId} Interval",
                    Description = $"Sensor data save interval for device {deviceId}",
                    SaveIntervalMinutes = intervalMinutes,
                    IsEnabled = true,
                    DeviceId = deviceId,
                    CreatedBy = userId,
                    UpdatedBy = userId
                };

                await CreateConfigurationAsync(deviceConfig);
            }
            else
            {
                deviceConfig.SaveIntervalMinutes = intervalMinutes;
                deviceConfig.UpdatedBy = userId;
                await UpdateConfigurationAsync(deviceConfig);
            }

            return true;
        }

        public async Task<bool> SetContainmentIntervalAsync(int containmentId, int intervalMinutes, int userId)
        {
            var containmentConfig = await GetContainmentConfigurationAsync(containmentId);

            if (containmentConfig == null)
            {
                // Create new containment configuration
                containmentConfig = new SensorDataIntervalConfig
                {
                    Name = $"Containment {containmentId} Interval",
                    Description = $"Sensor data save interval for containment {containmentId}",
                    SaveIntervalMinutes = intervalMinutes,
                    IsEnabled = true,
                    ContainmentId = containmentId,
                    CreatedBy = userId,
                    UpdatedBy = userId
                };

                await CreateConfigurationAsync(containmentConfig);
            }
            else
            {
                containmentConfig.SaveIntervalMinutes = intervalMinutes;
                containmentConfig.UpdatedBy = userId;
                await UpdateConfigurationAsync(containmentConfig);
            }

            return true;
        }

        // Helper methods
        private async Task<SensorDataIntervalConfig?> GetExistingConfigurationAsync(
            int? deviceId, int? containmentId, bool isGlobal)
        {
            if (isGlobal)
            {
                return await _context.SensorDataIntervalConfigs
                    .FirstOrDefaultAsync(c => c.IsGlobalConfiguration && c.IsActive);
            }
            else if (deviceId.HasValue)
            {
                return await _context.SensorDataIntervalConfigs
                    .FirstOrDefaultAsync(c => c.DeviceId == deviceId && c.IsActive);
            }
            else if (containmentId.HasValue)
            {
                return await _context.SensorDataIntervalConfigs
                    .FirstOrDefaultAsync(c => c.ContainmentId == containmentId && c.IsActive);
            }

            return null;
        }
    }
}