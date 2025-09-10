using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using System.Text.Json;

namespace Backend.Services
{
    /// <summary>
    /// Enhanced device sensor data service with configuration integration
    /// </summary>
    public class EnhancedDeviceSensorDataService : DeviceSensorDataService, IEnhancedDeviceSensorDataService
    {
        private readonly ISensorDataConfigurationService _configService;
        private readonly ISensorDataIntervalService _intervalService;
        private readonly ILogger<EnhancedDeviceSensorDataService> _enhancedLogger;

        public EnhancedDeviceSensorDataService(
            AppDbContext context,
            ILogger<EnhancedDeviceSensorDataService> logger,
            ISensorDataConfigurationService configService,
            ISensorDataIntervalService intervalService)
            : base(context, logger)
        {
            _configService = configService;
            _intervalService = intervalService;
            _enhancedLogger = logger;
        }

        // Enhanced storage with configuration checking
        public async Task<DeviceSensorData> StoreWithConfigurationCheckAsync(DeviceSensorData sensorData)
        {
            // Store the sensor data first
            var storedData = await StoreSensorDataAsync(sensorData);

            // Check thresholds after storage
            await CheckAndHandleThresholdsAsync(storedData);

            return storedData;
        }

        public async Task<DeviceSensorData> ParseAndStoreWithConfigurationAsync(int deviceId, string topic, string payload)
        {
            // Parse and store sensor data
            var sensorData = await ParseAndStoreSensorDataAsync(deviceId, topic, payload);

            // Check thresholds for auto-save
            await CheckAndHandleThresholdsAsync(sensorData);

            return sensorData;
        }

        // Enhanced interval-based storage with dynamic configuration
        public async Task<bool> ShouldSaveByIntervalAsync(int deviceId, DateTime timestamp)
        {
            try
            {
                // Use the injected interval service for dynamic configuration
                var shouldSave = await _intervalService.ShouldSaveByIntervalAsync(deviceId, timestamp);
                
                _enhancedLogger.LogDebug("Dynamic interval check for device {DeviceId} at {Timestamp}: {ShouldSave}", 
                    deviceId, timestamp, shouldSave);
                    
                return shouldSave;
            }
            catch (Exception ex)
            {
                _enhancedLogger.LogError(ex, "Error checking if should save by interval for device {DeviceId}, falling back to legacy method", deviceId);
                
                // Fallback to legacy config service
                try
                {
                    var config = await _configService.GetEffectiveConfigurationAsync(deviceId);
                    if (config == null || !config.IsIntervalEnabled)
                        return false;

                    // Get the last saved data for this device
                    var lastData = await GetLatestSensorDataByDeviceAsync(deviceId);
                    if (lastData == null)
                        return true; // First data point, always save

                    var timeSinceLastSave = timestamp - lastData.Timestamp;
                    var intervalSeconds = config.SaveIntervalSeconds;
                    var shouldSave = timeSinceLastSave.TotalSeconds >= intervalSeconds;

                    _enhancedLogger.LogDebug("Legacy config check for device {DeviceId}: Time since last save: {TimeSince} seconds, Interval: {Interval} seconds, Should save: {ShouldSave}",
                        deviceId, timeSinceLastSave.TotalSeconds, intervalSeconds, shouldSave);

                    return shouldSave;
                }
                catch (Exception fallbackEx)
                {
                    _enhancedLogger.LogError(fallbackEx, "Both dynamic and legacy interval checks failed for device {DeviceId}", deviceId);
                    return false;
                }
            }
        }

        public async Task<IEnumerable<DeviceSensorData>> GetDataByIntervalConfigAsync(int intervalMinutes)
        {
            try
            {
                // Use the new interval service
                var configs = await _intervalService.GetConfigurationsByIntervalAsync(intervalMinutes);
                var deviceIds = configs.Where(c => c.DeviceId.HasValue).Select(c => c.DeviceId!.Value).ToList();

                if (!deviceIds.Any())
                    return new List<DeviceSensorData>();

                var cutoffTime = DateTime.UtcNow.AddMinutes(-intervalMinutes);

                return await _context.DeviceSensorData
                    .Include(d => d.Device)
                    .Include(d => d.Rack)
                    .Include(d => d.Containment)
                    .Where(d => deviceIds.Contains(d.DeviceId) && d.Timestamp >= cutoffTime)
                    .OrderByDescending(d => d.Timestamp)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _enhancedLogger.LogError(ex, "Error getting data by interval config for {IntervalMinutes} minutes", intervalMinutes);
                return new List<DeviceSensorData>();
            }
        }

        // Enhanced method to store sensor data with interval checking
        public async Task<DeviceSensorData?> StoreIfIntervalAllowsAsync(int deviceId, string topic, string payload)
        {
            try
            {
                var timestamp = DateTime.UtcNow;
                var shouldSave = await ShouldSaveByIntervalAsync(deviceId, timestamp);
                
                if (!shouldSave)
                {
                    _enhancedLogger.LogDebug("Skipping sensor data storage for device {DeviceId} due to interval configuration", deviceId);
                    return null;
                }

                _enhancedLogger.LogDebug("Storing sensor data for device {DeviceId} based on interval configuration", deviceId);
                return await ParseAndStoreSensorDataAsync(deviceId, topic, payload);
            }
            catch (Exception ex)
            {
                _enhancedLogger.LogError(ex, "Error storing sensor data with interval check for device {DeviceId}", deviceId);
                throw;
            }
        }

        // Get effective interval configuration for a device
        public async Task<SensorDataIntervalConfig?> GetEffectiveIntervalConfigAsync(int deviceId)
        {
            try
            {
                return await _intervalService.GetEffectiveConfigurationAsync(deviceId);
            }
            catch (Exception ex)
            {
                _enhancedLogger.LogError(ex, "Error getting effective interval config for device {DeviceId}", deviceId);
                return null;
            }
        }

        // Threshold-based storage (Task 9)
        public async Task<bool> CheckAndHandleThresholdsAsync(DeviceSensorData sensorData)
        {
            try
            {
                // Get device configuration
                var config = await _configService.GetEffectiveConfigurationAsync(sensorData.DeviceId);
                if (config == null || !config.IsTemperatureThresholdEnabled || !config.AutoSaveOnThresholdExceed)
                    return false;

                // Extract temperature from sensor data
                var temperature = ExtractTemperatureFromSensorData(sensorData);
                if (!temperature.HasValue)
                    return false;

                // Check if threshold is exceeded
                var isExceeded = config.IsThresholdExceeded(temperature.Value);
                if (!isExceeded)
                    return false;

                // Determine the violation type and threshold value
                string violationType = "";
                decimal? thresholdValue = null;

                if (config.TemperatureUpperThreshold.HasValue && temperature.Value > config.TemperatureUpperThreshold.Value && config.AutoSaveOnUpperThreshold)
                {
                    violationType = "UpperThreshold";
                    thresholdValue = config.TemperatureUpperThreshold.Value;
                }
                else if (config.TemperatureLowerThreshold.HasValue && temperature.Value < config.TemperatureLowerThreshold.Value && config.AutoSaveOnLowerThreshold)
                {
                    violationType = "LowerThreshold";
                    thresholdValue = config.TemperatureLowerThreshold.Value;
                }

                if (string.IsNullOrEmpty(violationType))
                    return false;

                // Log the auto-save event
                var autoSaveLog = await _configService.LogAutoSaveAsync(
                    sensorData.DeviceId,
                    sensorData.Id,
                    config.Id,
                    violationType,
                    temperature.Value,
                    thresholdValue
                );

                // Send notification if enabled
                if (config.EnableNotifications && autoSaveLog.ShouldSendNotification())
                {
                    await _configService.SendThresholdNotificationAsync(autoSaveLog);
                }

                _enhancedLogger.LogInformation($"Threshold violation detected and logged: Device {sensorData.DeviceId}, Temperature {temperature.Value}°C, Threshold {thresholdValue}°C");

                return true;
            }
            catch (Exception ex)
            {
                _enhancedLogger.LogError(ex, $"Error checking thresholds for sensor data {sensorData.Id}");
                return false;
            }
        }

        public async Task<IEnumerable<AutoSensorDataLog>> GetThresholdViolationsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null)
        {
            return await _configService.GetAutoSaveLogsAsync(1, 1000, deviceId, startDate, endDate);
        }

        // Enhanced data retrieval with configuration
        public async Task<IEnumerable<object>> GetEnhancedSensorDataAsync(int deviceId, int page = 1, int pageSize = 50)
        {
            var (data, _) = await GetSensorDataAsync(page, pageSize, deviceId);
            var config = await _configService.GetEffectiveConfigurationAsync(deviceId);

            return data.Select(d =>
            {
                var temperature = ExtractTemperatureFromSensorData(d);
                var humidity = ExtractHumidityFromSensorData(d);

                return new
                {
                    d.Id,
                    d.DeviceId,
                    Device = d.Device?.Name,
                    d.Timestamp,
                    d.ReceivedAt,
                    Temperature = temperature,
                    Humidity = humidity,
                    TemperatureColor = temperature.HasValue && config != null
                        ? config.GetTemperatureColor(temperature.Value)
                        : null,
                    TemperatureStatus = temperature.HasValue && config != null
                        ? config.GetTemperatureStatus(temperature.Value)
                        : null,
                    ThresholdViolation = temperature.HasValue && config != null
                        ? config.GetThresholdViolationType(temperature.Value)
                        : null,
                    d.RawPayload
                };
            });
        }

        public async Task<object> GetTemperatureDataWithColorsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = ((AppDbContext)_context).DeviceSensorData
                .Where(d => d.DeviceId == deviceId);

            if (startDate.HasValue)
                query = query.Where(d => d.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(d => d.Timestamp <= endDate.Value);

            var data = await query
                .OrderByDescending(d => d.Timestamp)
                .Take(1000) // Limit for performance
                .ToListAsync();

            var config = await _configService.GetEffectiveConfigurationAsync(deviceId);

            var temperatureData = data.Select(d =>
            {
                var temperature = ExtractTemperatureFromSensorData(d);
                if (!temperature.HasValue) return null;

                return new
                {
                    Timestamp = d.Timestamp,
                    Temperature = temperature.Value,
                    Color = config?.GetTemperatureColor(temperature.Value) ?? "#10B981",
                    Status = config?.GetTemperatureStatus(temperature.Value) ?? "Normal",
                    ThresholdViolation = config?.GetThresholdViolationType(temperature.Value)
                };
            }).Where(x => x != null).ToList();

            return new
            {
                DeviceId = deviceId,
                DataPoints = temperatureData,
                ColorRanges = config != null ? new
                {
                    Cold = new { Max = config.TemperatureColdMax, Color = config.TemperatureColdColor },
                    Normal = new { Min = config.TemperatureNormalMin, Max = config.TemperatureNormalMax, Color = config.TemperatureNormalColor },
                    Warm = new { Min = config.TemperatureWarmMin, Max = config.TemperatureWarmMax, Color = config.TemperatureWarmColor },
                    Hot = new { Min = config.TemperatureHotMin, Max = config.TemperatureHotMax, Color = config.TemperatureHotColor },
                    Critical = new { Min = config.TemperatureCriticalMin, Color = config.TemperatureCriticalColor }
                } : null,
                Thresholds = config != null ? new
                {
                    Upper = config.TemperatureUpperThreshold,
                    Lower = config.TemperatureLowerThreshold,
                    Enabled = config.IsTemperatureThresholdEnabled
                } : null,
                DateRange = new { Start = startDate, End = endDate }
            };
        }

        public async Task<object> GetLatestSensorDataWithStatusAsync(int deviceId)
        {
            var latestData = await GetLatestSensorDataByDeviceAsync(deviceId);
            if (latestData == null)
                return new { DeviceId = deviceId, Message = "No data available" };

            var config = await _configService.GetEffectiveConfigurationAsync(deviceId);
            var temperature = ExtractTemperatureFromSensorData(latestData);
            var humidity = ExtractHumidityFromSensorData(latestData);

            return new
            {
                DeviceId = deviceId,
                Device = latestData.Device?.Name,
                Timestamp = latestData.Timestamp,
                ReceivedAt = latestData.ReceivedAt,
                Temperature = temperature,
                Humidity = humidity,
                TemperatureColor = temperature.HasValue && config != null
                    ? config.GetTemperatureColor(temperature.Value)
                    : null,
                TemperatureStatus = temperature.HasValue && config != null
                    ? config.GetTemperatureStatus(temperature.Value)
                    : null,
                ThresholdViolation = temperature.HasValue && config != null
                    ? config.GetThresholdViolationType(temperature.Value)
                    : null,
                IsThresholdExceeded = temperature.HasValue && config != null
                    ? config.IsThresholdExceeded(temperature.Value)
                    : false,
                Configuration = config != null ? new
                {
                    config.SaveIntervalSeconds,
                    config.IsIntervalEnabled,
                    config.IsTemperatureThresholdEnabled,
                    config.TemperatureUpperThreshold,
                    config.TemperatureLowerThreshold,
                    config.AutoSaveOnThresholdExceed
                } : null
            };
        }

        // Batch operations
        public async Task<int> ProcessBatchSensorDataAsync(IEnumerable<DeviceSensorData> sensorDataList)
        {
            var processedCount = 0;
            var violationCount = 0;

            foreach (var sensorData in sensorDataList)
            {
                try
                {
                    // Store the data
                    await StoreSensorDataAsync(sensorData);
                    processedCount++;

                    // Check thresholds
                    var hasViolation = await CheckAndHandleThresholdsAsync(sensorData);
                    if (hasViolation) violationCount++;
                }
                catch (Exception ex)
                {
                    _enhancedLogger.LogError(ex, $"Error processing sensor data for device {sensorData.DeviceId}");
                }
            }

            _enhancedLogger.LogInformation($"Batch processing completed: {processedCount} records processed, {violationCount} threshold violations detected");

            return processedCount;
        }

        public async Task<object> GetBatchProcessingStatisticsAsync()
        {
            var last24Hours = DateTime.UtcNow.AddHours(-24);

            var totalRecords = await ((AppDbContext)_context).DeviceSensorData
                .Where(d => d.ReceivedAt >= last24Hours)
                .CountAsync();

            var violations = await ((AppDbContext)_context).AutoSensorDataLogs
                .Where(l => l.TriggerTime >= last24Hours)
                .CountAsync();

            var deviceActivity = await ((AppDbContext)_context).DeviceSensorData
                .Where(d => d.ReceivedAt >= last24Hours)
                .GroupBy(d => d.DeviceId)
                .Select(g => new
                {
                    DeviceId = g.Key,
                    Count = g.Count(),
                    LatestTimestamp = g.Max(x => x.Timestamp)
                })
                .ToListAsync();

            return new
            {
                Period = "Last 24 Hours",
                TotalRecordsProcessed = totalRecords,
                ThresholdViolations = violations,
                ActiveDevices = deviceActivity.Count,
                DeviceActivity = deviceActivity,
                GeneratedAt = DateTime.UtcNow
            };
        }

        // Configuration integration
        public async Task<object> GetSensorDataWithConfigurationAsync(int deviceId)
        {
            var config = await _configService.GetEffectiveConfigurationAsync(deviceId);
            var latestData = await GetLatestSensorDataWithStatusAsync(deviceId);
            var recentViolations = await GetThresholdViolationsAsync(deviceId, DateTime.UtcNow.AddHours(-24));

            return new
            {
                DeviceId = deviceId,
                Configuration = config,
                LatestData = latestData,
                RecentViolations = recentViolations,
                ConfigurationType = config?.DeviceId.HasValue == true ? "Device-Specific" :
                                  config?.ContainmentId.HasValue == true ? "Containment-Specific" :
                                  config?.IsGlobalConfiguration == true ? "Global" : "None"
            };
        }

        public async Task<bool> ValidateConfigurationForDeviceAsync(int deviceId)
        {
            var config = await _configService.GetEffectiveConfigurationAsync(deviceId);
            if (config == null)
            {
                _enhancedLogger.LogWarning($"No configuration found for device {deviceId}");
                return false;
            }

            // Validate thresholds
            if (config.IsTemperatureThresholdEnabled)
            {
                if (config.TemperatureUpperThreshold.HasValue && config.TemperatureLowerThreshold.HasValue)
                {
                    if (config.TemperatureUpperThreshold.Value <= config.TemperatureLowerThreshold.Value)
                    {
                        _enhancedLogger.LogWarning($"Invalid threshold configuration for device {deviceId}: Upper threshold must be greater than lower threshold");
                        return false;
                    }
                }
            }

            // Validate interval
            if (config.IsIntervalEnabled && config.SaveIntervalSeconds <= 0)
            {
                _enhancedLogger.LogWarning($"Invalid interval configuration for device {deviceId}: Interval must be greater than 0");
                return false;
            }

            return true;
        }

        // Helper methods
        private decimal? ExtractTemperatureFromSensorData(DeviceSensorData sensorData)
        {
            try
            {
                var temperature = sensorData.GetValue<decimal>("temp");
                if (temperature.HasValue) return temperature.Value;

                // Try alternative property names
                temperature = sensorData.GetValue<decimal>("temperature");
                if (temperature.HasValue) return temperature.Value;

                temperature = sensorData.GetValue<decimal>("Temperature");
                return temperature;
            }
            catch
            {
                return null;
            }
        }

        private decimal? ExtractHumidityFromSensorData(DeviceSensorData sensorData)
        {
            try
            {
                var humidity = sensorData.GetValue<decimal>("hum");
                if (humidity.HasValue) return humidity.Value;

                // Try alternative property names
                humidity = sensorData.GetValue<decimal>("humidity");
                if (humidity.HasValue) return humidity.Value;

                humidity = sensorData.GetValue<decimal>("Humidity");
                return humidity;
            }
            catch
            {
                return null;
            }
        }
    }
}