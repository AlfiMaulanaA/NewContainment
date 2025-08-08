using Backend.Models;

namespace Backend.Services;

public interface ICctvService
{
    Task<List<CctvCameraDto>> GetAllAsync();
    Task<CctvCameraDto?> GetByIdAsync(int id);
    Task<List<CctvCameraDto>> GetByContainmentIdAsync(int containmentId);
    Task<CctvCameraDto> CreateAsync(CreateUpdateCctvCameraDto dto);
    Task<CctvCameraDto?> UpdateAsync(int id, CreateUpdateCctvCameraDto dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}