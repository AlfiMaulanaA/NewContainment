using Backend.Models;

namespace Backend.Services
{
    public interface IDeviceSensorDataService
    {
        // Data retrieval with pagination and filtering
        Task<(IEnumerable<DeviceSensorData> Data, int Total)> GetSensorDataAsync(
            int page = 1, 
            int pageSize = 50, 
            int? deviceId = null, 
            int? rackId = null, 
            int? containmentId = null,
            string? sensorType = null,
            DateTime? startDate = null, 
            DateTime? endDate = null);
        
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByDeviceIdAsync(int deviceId);
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByRackIdAsync(int rackId);
        Task<IEnumerable<DeviceSensorData>> GetSensorDataByContainmentIdAsync(int containmentId);
        Task<IEnumerable<DeviceSensorData>> GetLatestSensorDataAsync(int limit = 100);
        Task<DeviceSensorData?> GetLatestSensorDataByDeviceAsync(int deviceId);

        // Data storage
        Task<DeviceSensorData> StoreSensorDataAsync(DeviceSensorData sensorData);
        Task<DeviceSensorData> ParseAndStoreSensorDataAsync(int deviceId, string topic, string payload);

        // Statistics and aggregation
        Task<object> GetSensorStatisticsAsync(int deviceId, DateTime? startDate = null, DateTime? endDate = null);
        Task<IEnumerable<object>> GetDataHistoryAsync(int deviceId, string dataKey, TimeSpan timeRange);
        Task<IEnumerable<object>> GetAggregatedDataAsync(int deviceId, string dataKey, string interval, DateTime startDate, DateTime endDate);
        Task<IEnumerable<string>> GetAvailableSensorTypesAsync();
        Task<object> GetSensorDataSummaryAsync(DateTime? startDate = null, DateTime? endDate = null);

        // Topic management
        Task<IEnumerable<string>> GetActiveTopicsAsync();
        Task<IEnumerable<string>> GetTopicsByContainmentAsync(int containmentId);
    }
}