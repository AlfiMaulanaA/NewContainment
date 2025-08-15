using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly AppDbContext _context;

        public DeviceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Device>> GetAllDevicesAsync()
        {
            return await _context.Devices
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Device>> GetDevicesByRackIdAsync(int rackId)
        {
            return await _context.Devices
                .Where(d => d.RackId == rackId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
        }

        public async Task<Device?> GetDeviceByIdAsync(int id)
        {
            return await _context.Devices
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<Device> CreateDeviceAsync(Device device, int userId)
        {
            device.CreatedBy = userId;
            device.CreatedAt = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;
            device.IsActive = true;

            _context.Devices.Add(device);
            await _context.SaveChangesAsync();

            return await GetDeviceByIdAsync(device.Id) ?? device;
        }

        public async Task<Device?> UpdateDeviceAsync(int id, Device device, int userId)
        {
            var existingDevice = await _context.Devices.FindAsync(id);
            if (existingDevice == null)
            {
                return null;
            }

            existingDevice.Name = device.Name;
            existingDevice.Type = device.Type;
            existingDevice.RackId = device.RackId;
            existingDevice.Description = device.Description;
            existingDevice.SerialNumber = device.SerialNumber;
            existingDevice.Topic = device.Topic;
            existingDevice.SensorType = device.SensorType;
            existingDevice.UCapacity = device.UCapacity;
            existingDevice.UpdatedBy = userId;
            existingDevice.UpdatedAt = DateTime.UtcNow;
            
            // For sensor devices, status is managed by DeviceActivityService based on MQTT data
            // For non-sensor devices, set default status if not provided
            if (device.Type.ToLower() != "sensor")
            {
                existingDevice.Status = device.Status ?? "Active";
            }

            await _context.SaveChangesAsync();

            return await GetDeviceByIdAsync(id);
        }

        public async Task<bool> DeleteDeviceAsync(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var device = await _context.Devices.FindAsync(id);
                if (device == null)
                {
                    return false;
                }

                // Debug: Check what references this device
                var existingSensorData = await _context.DeviceSensorData.CountAsync(d => d.DeviceId == id);
                var existingMaintenance = await _context.Maintenances
                    .CountAsync(m => m.TargetType == Backend.Enums.MaintenanceTarget.Device && m.TargetId == id);
                
                Console.WriteLine($"Device {id} references: SensorData={existingSensorData}, Maintenance={existingMaintenance}");

                // Delete all sensor data related to this device first
                var sensorDataCount = await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM DeviceSensorData WHERE DeviceId = {0}", id);
                Console.WriteLine($"Deleted {sensorDataCount} sensor data records for device {id}");

                // Delete all maintenance tasks that target this device
                var maintenanceCount = await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM Maintenances WHERE TargetType = {0} AND TargetId = {1}", 
                    (int)Backend.Enums.MaintenanceTarget.Device, id);
                Console.WriteLine($"Deleted {maintenanceCount} maintenance records for device {id}");

                // Try to delete the device - if this fails, we'll know the exact issue
                Console.WriteLine($"Attempting to delete device {id}");
                try 
                {
                    _context.Devices.Remove(device);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Successfully deleted device {id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to delete device {id}: {ex.Message}");
                    throw;
                }
                
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}