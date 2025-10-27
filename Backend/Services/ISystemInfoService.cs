using Backend.Models;

namespace Backend.Services
{
    public interface ISystemInfoService
    {
        Task<SystemInfo> GetSystemInfoAsync();
        void ClearCache();
    }
}