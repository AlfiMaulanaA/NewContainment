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
            if (existingDevice == null || !existingDevice.IsActive)
            {
                return null;
            }

            existingDevice.Name = device.Name;
            existingDevice.Type = device.Type;
            existingDevice.RackId = device.RackId;
            existingDevice.Description = device.Description;
            existingDevice.SerialNumber = device.SerialNumber;
            existingDevice.Status = device.Status;
            existingDevice.Topic = device.Topic;
            existingDevice.UpdatedBy = userId;
            existingDevice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetDeviceByIdAsync(id);
        }

        public async Task<bool> DeleteDeviceAsync(int id)
        {
            var device = await _context.Devices.FindAsync(id);
            if (device == null || !device.IsActive)
            {
                return false;
            }

            device.IsActive = false;
            device.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
    }
}