using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class DeviceStatusMonitoringService : IDeviceStatusMonitoringService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DeviceStatusMonitoringService> _logger;
        private readonly IConfiguration _configuration;

        // Configurable timeouts (in minutes)
        private readonly int _onlineTimeoutMinutes;
        private readonly int _offlineTimeoutMinutes;

        public DeviceStatusMonitoringService(
            AppDbContext context,
            ILogger<DeviceStatusMonitoringService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;

            // Load timeout configurations
            _onlineTimeoutMinutes = _configuration.GetValue<int>("DeviceMonitoring:OnlineTimeoutMinutes", 5);
            _offlineTimeoutMinutes = _configuration.GetValue<int>("DeviceMonitoring:OfflineTimeoutMinutes", 10);
        }

        public async Task<DeviceActivityStatus?> GetDeviceActivityStatusAsync(int deviceId)
        {
            return await _context.DeviceActivityStatuses
                .Include(das => das.Device)
                .FirstOrDefaultAsync(das => das.DeviceId == deviceId);
        }

        public async Task<IEnumerable<DeviceActivityStatus>> GetAllDeviceActivityStatusAsync()
        {
            return await _context.DeviceActivityStatuses
                .Include(das => das.Device)
                .OrderByDescending(das => das.LastSeen)
                .ToListAsync();
        }

        public async Task UpdateDeviceActivityAsync(int deviceId, string? topic, string? message)
        {
            try
            {
                var now = DateTime.UtcNow;
                var activityStatus = await _context.DeviceActivityStatuses
                    .FirstOrDefaultAsync(das => das.DeviceId == deviceId);

                if (activityStatus == null)
                {
                    // Create new activity status record
                    activityStatus = new DeviceActivityStatus
                    {
                        DeviceId = deviceId,
                        Topic = topic,
                        Status = "Online",
                        LastSeen = now,
                        LastStatusChange = now,
                        LastMessage = message,
                        ConsecutiveFailures = 0,
                        CreatedAt = now,
                        UpdatedAt = now
                    };

                    _context.DeviceActivityStatuses.Add(activityStatus);
                }
                else
                {
                    // Update existing record
                    var previousStatus = activityStatus.Status;

                    activityStatus.LastSeen = now;
                    activityStatus.UpdatedAt = now;
                    activityStatus.Topic = topic ?? activityStatus.Topic;
                    activityStatus.LastMessage = message;
                    activityStatus.ConsecutiveFailures = 0;

                    // Update status to Online if it was Offline
                    if (activityStatus.Status != "Online")
                    {
                        activityStatus.Status = "Online";
                        activityStatus.LastStatusChange = now;

                        // Update device status as well
                        await UpdateDeviceStatusInDatabaseAsync(deviceId, "Active");

                        _logger.LogInformation($"Device {deviceId} status changed from {previousStatus} to Online");
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating device activity for device {deviceId}");
            }
        }

        public async Task CheckAndUpdateDeviceStatusesAsync()
        {
            try
            {
                var now = DateTime.UtcNow;
                var onlineTimeout = TimeSpan.FromMinutes(_onlineTimeoutMinutes);
                var offlineTimeout = TimeSpan.FromMinutes(_offlineTimeoutMinutes);

                // Get all devices with topics (only monitor devices that have MQTT topics)
                var devicesWithTopics = await _context.Devices
                    .Where(d => d.IsActive && !string.IsNullOrEmpty(d.Topic))
                    .Select(d => new { d.Id, d.Topic, d.Status })
                    .ToListAsync();

                foreach (var device in devicesWithTopics)
                {
                    var activityStatus = await _context.DeviceActivityStatuses
                        .FirstOrDefaultAsync(das => das.DeviceId == device.Id);

                    if (activityStatus == null)
                    {
                        // Create initial activity status for devices that don't have one
                        activityStatus = new DeviceActivityStatus
                        {
                            DeviceId = device.Id,
                            Topic = device.Topic,
                            Status = "Unknown",
                            LastSeen = now.AddMinutes(-(_onlineTimeoutMinutes + 1)), // Set to past time
                            LastStatusChange = now,
                            ConsecutiveFailures = 0,
                            CreatedAt = now,
                            UpdatedAt = now
                        };

                        _context.DeviceActivityStatuses.Add(activityStatus);
                        continue;
                    }

                    var timeSinceLastSeen = now - activityStatus.LastSeen;
                    var previousStatus = activityStatus.Status;

                    if (timeSinceLastSeen > offlineTimeout && activityStatus.Status != "Offline")
                    {
                        // Device should be marked as Offline
                        activityStatus.Status = "Offline";
                        activityStatus.LastStatusChange = now;
                        activityStatus.UpdatedAt = now;
                        activityStatus.ConsecutiveFailures++;

                        // Update device status as well
                        await UpdateDeviceStatusInDatabaseAsync(device.Id, "Inactive");

                        _logger.LogWarning($"Device {device.Id} marked as Offline after {timeSinceLastSeen.TotalMinutes:F1} minutes of inactivity");
                    }
                    else if (timeSinceLastSeen <= onlineTimeout && activityStatus.Status == "Offline")
                    {
                        // Device came back online recently
                        activityStatus.Status = "Online";
                        activityStatus.LastStatusChange = now;
                        activityStatus.UpdatedAt = now;
                        activityStatus.ConsecutiveFailures = 0;

                        // Update device status as well
                        await UpdateDeviceStatusInDatabaseAsync(device.Id, "Active");

                        _logger.LogInformation($"Device {device.Id} came back Online");
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogDebug($"Checked status for {devicesWithTopics.Count} devices with MQTT topics");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during device status check");
            }
        }

        public async Task<bool> IsDeviceOnlineAsync(int deviceId)
        {
            var activityStatus = await _context.DeviceActivityStatuses
                .FirstOrDefaultAsync(das => das.DeviceId == deviceId);

            if (activityStatus == null)
                return false;

            return activityStatus.Status == "Online";
        }

        public async Task<Dictionary<int, bool>> GetDevicesOnlineStatusAsync(IEnumerable<int> deviceIds)
        {
            var statuses = await _context.DeviceActivityStatuses
                .Where(das => deviceIds.Contains(das.DeviceId))
                .ToDictionaryAsync(das => das.DeviceId, das => das.Status == "Online");

            // Add false for devices that don't have status records
            foreach (var deviceId in deviceIds)
            {
                if (!statuses.ContainsKey(deviceId))
                {
                    statuses[deviceId] = false;
                }
            }

            return statuses;
        }

        public async Task InitializeDeviceMonitoringAsync()
        {
            try
            {
                var now = DateTime.UtcNow;

                // Get all active devices with topics that don't have activity status
                var devicesWithoutStatus = await _context.Devices
                    .Where(d => d.IsActive && !string.IsNullOrEmpty(d.Topic))
                    .Where(d => !_context.DeviceActivityStatuses.Any(das => das.DeviceId == d.Id))
                    .ToListAsync();

                foreach (var device in devicesWithoutStatus)
                {
                    var activityStatus = new DeviceActivityStatus
                    {
                        DeviceId = device.Id,
                        Topic = device.Topic,
                        Status = "Unknown",
                        LastSeen = now.AddMinutes(-(_onlineTimeoutMinutes + 1)), // Set to past time
                        LastStatusChange = now,
                        ConsecutiveFailures = 0,
                        CreatedAt = now,
                        UpdatedAt = now
                    };

                    _context.DeviceActivityStatuses.Add(activityStatus);
                }

                if (devicesWithoutStatus.Any())
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Initialized monitoring for {devicesWithoutStatus.Count} devices");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing device monitoring");
            }
        }

        private async Task UpdateDeviceStatusInDatabaseAsync(int deviceId, string status)
        {
            try
            {
                var device = await _context.Devices.FindAsync(deviceId);
                if (device != null)
                {
                    device.Status = status;
                    device.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating device {deviceId} status to {status}");
            }
        }
    }
}