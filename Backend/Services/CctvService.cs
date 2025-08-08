using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class CctvService : ICctvService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CctvService> _logger;

    public CctvService(AppDbContext context, ILogger<CctvService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<CctvCameraDto>> GetAllAsync()
    {
        try
        {
            var cameras = await _context.CctvCameras
                .Include(c => c.Containment)
                .OrderBy(c => c.Name)
                .Select(c => new CctvCameraDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Ip = c.Ip,
                    Port = c.Port,
                    Username = c.Username,
                    Password = c.Password,
                    StreamUrl = c.StreamUrl,
                    ContainmentId = c.ContainmentId,
                    ContainmentName = c.Containment != null ? c.Containment.Name : null,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();

            return cameras;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving CCTV cameras");
            throw;
        }
    }

    public async Task<CctvCameraDto?> GetByIdAsync(int id)
    {
        try
        {
            var camera = await _context.CctvCameras
                .Include(c => c.Containment)
                .Where(c => c.Id == id)
                .Select(c => new CctvCameraDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Ip = c.Ip,
                    Port = c.Port,
                    Username = c.Username,
                    Password = c.Password,
                    StreamUrl = c.StreamUrl,
                    ContainmentId = c.ContainmentId,
                    ContainmentName = c.Containment != null ? c.Containment.Name : null,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .FirstOrDefaultAsync();

            return camera;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving CCTV camera with ID {CameraId}", id);
            throw;
        }
    }

    public async Task<List<CctvCameraDto>> GetByContainmentIdAsync(int containmentId)
    {
        try
        {
            var cameras = await _context.CctvCameras
                .Include(c => c.Containment)
                .Where(c => c.ContainmentId == containmentId)
                .OrderBy(c => c.Name)
                .Select(c => new CctvCameraDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Ip = c.Ip,
                    Port = c.Port,
                    Username = c.Username,
                    Password = c.Password,
                    StreamUrl = c.StreamUrl,
                    ContainmentId = c.ContainmentId,
                    ContainmentName = c.Containment != null ? c.Containment.Name : null,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();

            return cameras;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving CCTV cameras for containment {ContainmentId}", containmentId);
            throw;
        }
    }

    public async Task<CctvCameraDto> CreateAsync(CreateUpdateCctvCameraDto dto)
    {
        try
        {
            var camera = new CctvCamera
            {
                Name = dto.Name,
                Ip = dto.Ip,
                Port = dto.Port,
                Username = dto.Username,
                Password = dto.Password,
                StreamUrl = dto.StreamUrl,
                ContainmentId = dto.ContainmentId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.CctvCameras.Add(camera);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new CCTV camera: {CameraName} with ID {CameraId}", camera.Name, camera.Id);

            return await GetByIdAsync(camera.Id) ?? throw new InvalidOperationException("Failed to retrieve created camera");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating CCTV camera: {CameraName}", dto.Name);
            throw;
        }
    }

    public async Task<CctvCameraDto?> UpdateAsync(int id, CreateUpdateCctvCameraDto dto)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null)
            {
                return null;
            }

            camera.Name = dto.Name;
            camera.Ip = dto.Ip;
            camera.Port = dto.Port;
            camera.Username = dto.Username;
            camera.Password = dto.Password;
            camera.StreamUrl = dto.StreamUrl;
            camera.ContainmentId = dto.ContainmentId;
            camera.UpdatedAt = DateTime.UtcNow;

            _context.CctvCameras.Update(camera);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated CCTV camera with ID {CameraId}", id);

            return await GetByIdAsync(id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating CCTV camera with ID {CameraId}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        try
        {
            var camera = await _context.CctvCameras.FindAsync(id);
            if (camera == null)
            {
                return false;
            }

            _context.CctvCameras.Remove(camera);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted CCTV camera with ID {CameraId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting CCTV camera with ID {CameraId}", id);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(int id)
    {
        try
        {
            return await _context.CctvCameras.AnyAsync(c => c.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if CCTV camera exists with ID {CameraId}", id);
            throw;
        }
    }
}