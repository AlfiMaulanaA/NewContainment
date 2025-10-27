using Backend.Models;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class CameraConfigService : ICameraConfigsService
    {
        private readonly AppDbContext _context;

        public CameraConfigService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CameraConfig>> GetAllCameraConfigsAsync()
        {
            return await _context.CameraConfigs.ToListAsync();
        }

        public async Task<CameraConfig?> GetCameraConfigByIdAsync(int id)
        {
            return await _context.CameraConfigs.FindAsync(id);
        }

        public async Task<CameraConfig> CreateCameraConfigAsync(CameraConfig cameraConfig)
        {
            cameraConfig.CreatedAt = DateTime.UtcNow;
            cameraConfig.UpdatedAt = DateTime.UtcNow;
            cameraConfig.IsActive = true;

            _context.CameraConfigs.Add(cameraConfig);
            await _context.SaveChangesAsync();
            return cameraConfig;
        }

        public async Task<CameraConfig?> UpdateCameraConfigAsync(int id, CameraConfig updatedCameraConfig)
        {
            var existingConfig = await _context.CameraConfigs.FindAsync(id);
            if (existingConfig == null || !existingConfig.IsActive)
                return null;

            existingConfig.Name = updatedCameraConfig.Name;
            existingConfig.IpAddress = updatedCameraConfig.IpAddress;
            existingConfig.Port = updatedCameraConfig.Port;
            existingConfig.Group = updatedCameraConfig.Group;
            existingConfig.ApiKey = updatedCameraConfig.ApiKey;
            existingConfig.UpdatedAt = DateTime.UtcNow;
            existingConfig.IsActive = updatedCameraConfig.IsActive;

            await _context.SaveChangesAsync();
            return existingConfig;
        }

        public async Task<bool> DeleteCameraConfigAsync(int id)
        {
            var cameraConfig = await _context.CameraConfigs.FindAsync(id);
            if (cameraConfig == null || !cameraConfig.IsActive)
                return false;
            cameraConfig.IsActive = false;
            cameraConfig.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CameraConfigExistsAsync(int id)
        {
            return await _context.CameraConfigs.AnyAsync(c => c.Id == id && c.IsActive);
        }
    }
}