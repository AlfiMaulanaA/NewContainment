using Backend.Models;

namespace Backend.Services
{
    public interface IPalmRecognitionDeviceService
    {
        Task<IEnumerable<PalmRecognitionDevice>> GetAllPalmRecognitionDevicesAsync();
        Task<PalmRecognitionDevice?> GetPalmRecognitionDeviceByIdAsync(int id);
        Task<PalmRecognitionDevice> CreatePalmRecognitionDeviceAsync(PalmRecognitionDevice device);
        Task<PalmRecognitionDevice?> UpdatePalmRecognitionDeviceAsync(int id, PalmRecognitionDevice device);
        Task<bool> DeletePalmRecognitionDeviceAsync(int id);
        Task<bool> PalmRecognitionDeviceExistsAsync(int id);
    }
}
