using Backend.Models;

namespace Backend.Services
{
    public interface IDeviceService
    {
        Task<IEnumerable<Device>> GetAllDevicesAsync();
        Task<IEnumerable<Device>> GetDevicesByRackIdAsync(int rackId);
        Task<Device?> GetDeviceByIdAsync(int id);
        Task<Device> CreateDeviceAsync(Device device, int userId);
        Task<Device?> UpdateDeviceAsync(int id, Device device, int userId);
        Task<bool> DeleteDeviceAsync(int id);
    }
}