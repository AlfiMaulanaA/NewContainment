using Backend.Models;

namespace Backend.Services
{
    public interface IDeviceSensorDataService
    {
        // Data retrieval
        Task<IEnumerable<DeviceSensorData>> GetAllSensorDataAsync();
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByDeviceIdAsync(int deviceId);
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByRackIdAsync(int rackId);
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByContainmentIdAsync(int containmentId);
        Task<IEnumerable<DeviceSensorData>> GetLatestSensorDataAsync(int limit = 100);
        Task<DeviceSensorData?> GetLatestSensorDataByDeviceAsync(int deviceId);

        // Data storage
        Task<DeviceSensorData> StoreSensorDataAsync(DeviceSensorData sensorData);
        Task<DeviceSensorData> ParseAndStoreSensorDataAsync(int deviceId, string topic, string payload);

        // Statistics
        Task<object> GetSensorStatisticsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null);
        Task<IEnumerable<object>> GetTemperatureHistoryAsync(int deviceId, TimeSpan timeRange);
        Task<IEnumerable<object>> GetHumidityHistoryAsync(int deviceId, TimeSpan timeRange);

        // Topic management
        Task<IEnumerable<string>> GetActiveTopicsAsync();
        Task<IEnumerable<string>> GetTopicsByContainmentAsync(int containmentId);
    }
}