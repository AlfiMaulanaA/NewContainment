using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Interface for sensor data interval configuration service
    /// </summary>
    public interface ISensorDataIntervalService
    {
        // Configuration Management
        Task<IEnumerable<SensorDataIntervalConfig>> GetAllConfigurationsAsync();
        Task<SensorDataIntervalConfig?> GetConfigurationByIdAsync(int id);
        Task<SensorDataIntervalConfig> CreateConfigurationAsync(SensorDataIntervalConfig config);
        Task<SensorDataIntervalConfig> UpdateConfigurationAsync(SensorDataIntervalConfig config);
        Task<bool> DeleteConfigurationAsync(int id);

        // Device/Containment specific configurations
        Task<SensorDataIntervalConfig?> GetDeviceConfigurationAsync(int deviceId);
        Task<SensorDataIntervalConfig?> GetContainmentConfigurationAsync(int containmentId);
        Task<SensorDataIntervalConfig?> GetGlobalConfigurationAsync();

        // Effective configuration (priority: Device -> Containment -> Global)
        Task<SensorDataIntervalConfig?> GetEffectiveConfigurationAsync(int deviceId, int? containmentId = null);

        // Interval checking
        Task<bool> ShouldSaveByIntervalAsync(int deviceId, DateTime timestamp, int? containmentId = null);

        // Get devices by interval
        Task<IEnumerable<SensorDataIntervalConfig>> GetConfigurationsByIntervalAsync(int intervalMinutes);

        // Available intervals
        List<(int Value, string Label)> GetAvailableIntervals();

        // Toggle enable/disable
        Task<bool> ToggleConfigurationAsync(int id, bool enabled);

        // Update interval only
        Task<bool> UpdateIntervalAsync(int id, int intervalMinutes);

        // Bulk operations
        Task<bool> SetGlobalIntervalAsync(int intervalMinutes, int userId);
        Task<bool> SetDeviceIntervalAsync(int deviceId, int intervalMinutes, int userId);
        Task<bool> SetContainmentIntervalAsync(int containmentId, int intervalMinutes, int userId);
    }
}