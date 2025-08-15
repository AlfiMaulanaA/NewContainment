using Backend.Models;

namespace Backend.Services
{
    public interface IDeviceActivityService
    {
        /// <summary>
        /// Updates device status based on MQTT data activity
        /// </summary>
        Task UpdateDeviceActivityStatusAsync();
        
        /// <summary>
        /// Checks if a specific device is active based on MQTT data
        /// </summary>
        Task<bool> IsDeviceActiveAsync(int deviceId);
        
        /// <summary>
        /// Gets device activity info including last seen time
        /// </summary>
        Task<DeviceActivityInfo> GetDeviceActivityAsync(int deviceId);
        
        /// <summary>
        /// Updates single device activity status
        /// </summary>
        Task UpdateSingleDeviceActivityAsync(int deviceId);
        
        /// <summary>
        /// Gets all devices with their activity status
        /// </summary>
        Task<List<DeviceActivityInfo>> GetAllDevicesActivityAsync();
    }

    public class DeviceActivityInfo
    {
        public int DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime? LastSeenAt { get; set; }
        public TimeSpan? TimeSinceLastSeen { get; set; }
        public string ActivityStatus { get; set; } = string.Empty; // Online, Offline, Never Seen
        public bool HasRecentData { get; set; }
        public int MinutesSinceLastData { get; set; }
    }
}