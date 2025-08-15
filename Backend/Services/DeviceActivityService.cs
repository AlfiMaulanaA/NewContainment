using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class DeviceActivityService : IDeviceActivityService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DeviceActivityService> _logger;
        private readonly int _activeThresholdMinutes;
        private readonly int _offlineThresholdMinutes;

        public DeviceActivityService(
            AppDbContext context, 
            ILogger<DeviceActivityService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            
            // Default thresholds - device considered active if data within last 5 minutes
            // Device considered offline if no data for 10 minutes
            _activeThresholdMinutes = configuration.GetValue("DeviceActivity:ActiveThresholdMinutes", 5);
            _offlineThresholdMinutes = configuration.GetValue("DeviceActivity:OfflineThresholdMinutes", 10);
        }

        public async Task UpdateDeviceActivityStatusAsync()
        {
            try
            {
                _logger.LogInformation("Starting device activity status update...");
                
                // Get all sensor devices (only sensor devices send MQTT data)
                var sensorDevices = await _context.Devices
                    .Where(d => d.Type.ToLower() == "sensor")
                    .ToListAsync();

                var now = DateTime.UtcNow;
                var updatedCount = 0;

                foreach (var device in sensorDevices)
                {
                    var wasUpdated = await UpdateSingleDeviceActivityInternalAsync(device, now);
                    if (wasUpdated) updatedCount++;
                }

                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Device activity status update completed. Updated {updatedCount} devices.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating device activity status");
                throw;
            }
        }

        public async Task<bool> IsDeviceActiveAsync(int deviceId)
        {
            try
            {
                var device = await _context.Devices.FindAsync(deviceId);
                if (device == null || device.Type.ToLower() != "sensor")
                {
                    // Non-sensor devices are considered active based on their manual status
                    return device?.IsActive ?? false;
                }

                // For sensor devices, check recent MQTT data
                var now = DateTime.UtcNow;
                var thresholdTime = now.AddMinutes(-_activeThresholdMinutes);

                var hasRecentData = await _context.DeviceSensorData
                    .Where(d => d.DeviceId == deviceId && d.ReceivedAt >= thresholdTime)
                    .AnyAsync();

                return hasRecentData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking if device {deviceId} is active");
                return false;
            }
        }

        public async Task<DeviceActivityInfo> GetDeviceActivityAsync(int deviceId)
        {
            try
            {
                var device = await _context.Devices.FindAsync(deviceId);
                if (device == null)
                {
                    throw new ArgumentException($"Device with ID {deviceId} not found");
                }

                var activityInfo = new DeviceActivityInfo
                {
                    DeviceId = device.Id,
                    DeviceName = device.Name,
                    DeviceType = device.Type,
                    IsActive = device.IsActive
                };

                // Only check MQTT data for sensor devices
                if (device.Type.ToLower() == "sensor")
                {
                    var latestData = await _context.DeviceSensorData
                        .Where(d => d.DeviceId == deviceId)
                        .OrderByDescending(d => d.ReceivedAt)
                        .FirstOrDefaultAsync();

                    if (latestData != null)
                    {
                        activityInfo.LastSeenAt = latestData.ReceivedAt;
                        activityInfo.TimeSinceLastSeen = DateTime.UtcNow - latestData.ReceivedAt;
                        activityInfo.MinutesSinceLastData = (int)activityInfo.TimeSinceLastSeen.Value.TotalMinutes;
                        
                        if (activityInfo.MinutesSinceLastData <= _activeThresholdMinutes)
                        {
                            activityInfo.ActivityStatus = "Online";
                            activityInfo.HasRecentData = true;
                        }
                        else if (activityInfo.MinutesSinceLastData <= _offlineThresholdMinutes)
                        {
                            activityInfo.ActivityStatus = "Warning";
                            activityInfo.HasRecentData = false;
                        }
                        else
                        {
                            activityInfo.ActivityStatus = "Offline";
                            activityInfo.HasRecentData = false;
                        }
                    }
                    else
                    {
                        activityInfo.ActivityStatus = "Never Seen";
                        activityInfo.HasRecentData = false;
                        activityInfo.MinutesSinceLastData = int.MaxValue;
                    }
                }
                else
                {
                    // Non-sensor devices status based on manual setting
                    activityInfo.ActivityStatus = device.IsActive ? "Active" : "Inactive";
                    activityInfo.HasRecentData = device.IsActive;
                }

                return activityInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting device activity for device {deviceId}");
                throw;
            }
        }

        public async Task UpdateSingleDeviceActivityAsync(int deviceId)
        {
            try
            {
                var device = await _context.Devices.FindAsync(deviceId);
                if (device == null)
                {
                    throw new ArgumentException($"Device with ID {deviceId} not found");
                }

                var now = DateTime.UtcNow;
                var wasUpdated = await UpdateSingleDeviceActivityInternalAsync(device, now);
                
                if (wasUpdated)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Updated activity status for device {deviceId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating single device activity for device {deviceId}");
                throw;
            }
        }

        public async Task<List<DeviceActivityInfo>> GetAllDevicesActivityAsync()
        {
            try
            {
                var devices = await _context.Devices.ToListAsync();
                var activityInfoList = new List<DeviceActivityInfo>();

                foreach (var device in devices)
                {
                    var activityInfo = await GetDeviceActivityAsync(device.Id);
                    activityInfoList.Add(activityInfo);
                }

                return activityInfoList.OrderBy(a => a.DeviceName).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all devices activity");
                throw;
            }
        }

        private async Task<bool> UpdateSingleDeviceActivityInternalAsync(Device device, DateTime now)
        {
            // Only update sensor devices automatically
            if (device.Type.ToLower() != "sensor")
            {
                return false;
            }

            var thresholdTime = now.AddMinutes(-_offlineThresholdMinutes);
            
            var hasRecentData = await _context.DeviceSensorData
                .Where(d => d.DeviceId == device.Id && d.ReceivedAt >= thresholdTime)
                .AnyAsync();

            // Update device status based on MQTT data activity
            var shouldBeActive = hasRecentData;
            
            if (device.IsActive != shouldBeActive)
            {
                var previousStatus = device.IsActive ? "Active" : "Inactive";
                var newStatus = shouldBeActive ? "Active" : "Inactive";
                
                device.IsActive = shouldBeActive;
                device.Status = shouldBeActive ? "Active" : "Offline";
                device.UpdatedAt = now;
                
                _logger.LogInformation(
                    $"Device {device.Name} (ID: {device.Id}) status changed from {previousStatus} to {newStatus} based on MQTT data activity"
                );
                
                return true;
            }

            return false;
        }
    }
}