using Backend.Models;

namespace Backend.Services
{
    public interface IDeviceStatusMonitoringService
    {
        Task<DeviceActivityStatus?> GetDeviceActivityStatusAsync(int deviceId);
        Task<IEnumerable<DeviceActivityStatus>> GetAllDeviceActivityStatusAsync();
        Task UpdateDeviceActivityAsync(int deviceId, string? topic, string? message);
        Task CheckAndUpdateDeviceStatusesAsync();
        Task<bool> IsDeviceOnlineAsync(int deviceId);
        Task<Dictionary<int, bool>> GetDevicesOnlineStatusAsync(IEnumerable<int> deviceIds);
        Task InitializeDeviceMonitoringAsync();
    }
}