using Backend.Models;

namespace Backend.Services
{
    public interface ICameraConfigsService
    {
        Task<IEnumerable<CameraConfig>> GetAllCameraConfigsAsync();
        Task<CameraConfig?> GetCameraConfigByIdAsync(int id);
        Task<CameraConfig> CreateCameraConfigAsync(CameraConfig cameraConfig);
        Task<CameraConfig?> UpdateCameraConfigAsync(int id, CameraConfig cameraConfig);
        Task<bool> DeleteCameraConfigAsync(int id);
        Task<bool> CameraConfigExistsAsync(int id);
    }
}