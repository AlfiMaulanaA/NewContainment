using Backend.Models;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class PalmRecognitionDeviceService : IPalmRecognitionDeviceService
    {
        private readonly AppDbContext _context;

        public PalmRecognitionDeviceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PalmRecognitionDevice>> GetAllPalmRecognitionDevicesAsync()
        {
            return await _context.PalmRecognitionDevices.ToListAsync();
        }

        public async Task<PalmRecognitionDevice?> GetPalmRecognitionDeviceByIdAsync(int id)
        {
            return await _context.PalmRecognitionDevices.FindAsync(id);
        }

        public async Task<PalmRecognitionDevice> CreatePalmRecognitionDeviceAsync(PalmRecognitionDevice device)
        {
            device.Timestamp = DateTime.UtcNow;

            _context.PalmRecognitionDevices.Add(device);
            await _context.SaveChangesAsync();
            return device;
        }

        public async Task<PalmRecognitionDevice?> UpdatePalmRecognitionDeviceAsync(int id, PalmRecognitionDevice updatedDevice)
        {
            var existingDevice = await _context.PalmRecognitionDevices.FindAsync(id);
            if (existingDevice == null)
                return null;

            existingDevice.Name = updatedDevice.Name;
            existingDevice.IpAddress = updatedDevice.IpAddress;
            existingDevice.IsActive = updatedDevice.IsActive;
            existingDevice.Timestamp = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return existingDevice;
        }

        public async Task<bool> DeletePalmRecognitionDeviceAsync(int id)
        {
            var device = await _context.PalmRecognitionDevices.FindAsync(id);
            if (device == null)
                return false;

            _context.PalmRecognitionDevices.Remove(device);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> PalmRecognitionDeviceExistsAsync(int id)
        {
            return await _context.PalmRecognitionDevices.AnyAsync(d => d.Id == id);
        }
    }
}
