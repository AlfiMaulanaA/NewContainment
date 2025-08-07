using Backend.Models;
using Backend.Enums;

namespace Backend.Services
{
    public interface ICctvService
    {
        Task<IEnumerable<CctvCamera>> GetAllCamerasAsync();
        Task<CctvCamera?> GetCameraByIdAsync(int id);
        Task<IEnumerable<CctvCamera>> GetCamerasByContainmentAsync(int containmentId);
        Task<IEnumerable<CctvCamera>> GetCamerasByRackAsync(int rackId);
        Task<CctvCamera> CreateCameraAsync(CctvCamera camera);
        Task<CctvCamera> UpdateCameraAsync(CctvCamera camera);
        Task<bool> DeleteCameraAsync(int id);
        Task<bool> TestCameraConnectionAsync(int id);
        Task<bool> UpdateCameraStatusAsync(int id, CctvStatus status);
        Task<string?> GetCameraSnapshotAsync(int id);
        Task<IEnumerable<CctvCamera>> GetOnlineCamerasAsync();
        Task<IEnumerable<CctvCamera>> GetOfflineCamerasAsync();
    }
}