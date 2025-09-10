using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Service interface for managing sensor data configuration including intervals, thresholds, and color ranges
    /// </summary>
    public interface ISensorDataConfigurationService
    {
        // Configuration Management
        Task<IEnumerable<SensorDataConfiguration>> GetAllConfigurationsAsync();
        Task<SensorDataConfiguration?> GetConfigurationByIdAsync(int id);
        Task<SensorDataConfiguration?> GetGlobalConfigurationAsync();
        Task<SensorDataConfiguration?> GetConfigurationByDeviceIdAsync(int deviceId);
        Task<SensorDataConfiguration?> GetConfigurationByContainmentIdAsync(int containmentId);
        Task<SensorDataConfiguration> CreateConfigurationAsync(SensorDataConfiguration configuration);
        Task<SensorDataConfiguration> UpdateConfigurationAsync(SensorDataConfiguration configuration);
        Task<bool> DeleteConfigurationAsync(int id);

        // Interval Management (Task 7)
        Task<bool> UpdateSaveIntervalAsync(int configurationId, int intervalSeconds, int userId);
        Task<IEnumerable<SensorDataConfiguration>> GetConfigurationsByIntervalAsync(int intervalSeconds);
        Task<bool> EnableDisableIntervalAsync(int configurationId, bool isEnabled, int userId);

        // Temperature Threshold Management (Task 8)
        Task<bool> UpdateTemperatureThresholdsAsync(int configurationId, decimal? upperThreshold, decimal? lowerThreshold, int userId);
        Task<bool> EnableDisableThresholdsAsync(int configurationId, bool isEnabled, int userId);

        // Color Range Management (Task 8)
        Task<bool> UpdateTemperatureColorsAsync(int configurationId, string coldColor, string normalColor, string warmColor, string hotColor, string criticalColor, int userId);
        Task<bool> UpdateTemperatureRangesAsync(int configurationId, decimal coldMax, decimal normalMin, decimal normalMax, decimal warmMin, decimal warmMax, decimal hotMin, decimal hotMax, decimal criticalMin, int userId);

        // Auto-save Configuration (Task 9)
        Task<bool> UpdateAutoSaveSettingsAsync(int configurationId, bool autoSaveOnThreshold, bool onUpper, bool onLower, int userId);

        // Helper Methods
        Task<string> GetTemperatureColorAsync(decimal temperature, int? deviceId = null, int? containmentId = null);
        Task<string> GetTemperatureStatusAsync(decimal temperature, int? deviceId = null, int? containmentId = null);
        Task<bool> ShouldAutoSaveAsync(decimal temperature, int? deviceId = null, int? containmentId = null);
        Task<SensorDataConfiguration?> GetEffectiveConfigurationAsync(int? deviceId = null, int? containmentId = null);

        // Auto Sensor Data Log Management
        Task<IEnumerable<AutoSensorDataLog>> GetAutoSaveLogsAsync(int page = 1, int pageSize = 50, int? deviceId = null, DateTime? startDate = null, DateTime? endDate = null);
        Task<AutoSensorDataLog> LogAutoSaveAsync(int deviceId, int sensorDataId, int configurationId, string triggerReason, decimal? temperature = null, decimal? threshold = null);
        Task<object> GetAutoSaveStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null);

        // Notification Management
        Task<bool> SendThresholdNotificationAsync(AutoSensorDataLog log);
        Task<IEnumerable<AutoSensorDataLog>> GetPendingNotificationsAsync();
    }
}