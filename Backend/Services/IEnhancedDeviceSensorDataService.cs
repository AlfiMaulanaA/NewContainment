using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Enhanced interface for device sensor data service with configuration support
    /// </summary>
    public interface IEnhancedDeviceSensorDataService : IDeviceSensorDataService
    {
        // Enhanced storage with configuration checking
        Task<DeviceSensorData> StoreWithConfigurationCheckAsync(DeviceSensorData sensorData);
        Task<DeviceSensorData> ParseAndStoreWithConfigurationAsync(int deviceId, string topic, string payload);

        // Interval-based storage (Task 7)
        Task<bool> ShouldSaveByIntervalAsync(int deviceId, DateTime timestamp);
        Task<IEnumerable<DeviceSensorData>> GetDataByIntervalConfigAsync(int intervalSeconds);

        // Threshold-based storage (Task 9)
        Task<bool> CheckAndHandleThresholdsAsync(DeviceSensorData sensorData);
        Task<IEnumerable<AutoSensorDataLog>> GetThresholdViolationsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null);

        // Enhanced data retrieval with configuration
        Task<IEnumerable<object>> GetEnhancedSensorDataAsync(int deviceId, int page = 1, int pageSize = 50);
        Task<object> GetTemperatureDataWithColorsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null);
        Task<object> GetLatestSensorDataWithStatusAsync(int deviceId);

        // Batch operations
        Task<int> ProcessBatchSensorDataAsync(IEnumerable<DeviceSensorData> sensorDataList);
        Task<object> GetBatchProcessingStatisticsAsync();

        // Configuration integration
        Task<object> GetSensorDataWithConfigurationAsync(int deviceId);
        Task<bool> ValidateConfigurationForDeviceAsync(int deviceId);
    }
}