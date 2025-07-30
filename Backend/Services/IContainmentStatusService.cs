using Backend.Models;

namespace Backend.Services
{
    public interface IContainmentStatusService
    {
        Task<ContainmentStatus?> GetLatestStatusByContainmentIdAsync(int containmentId);
        Task<IEnumerable<ContainmentStatus>> GetStatusHistoryByContainmentIdAsync(int containmentId, int limit = 100);
        Task<ContainmentStatus> CreateOrUpdateStatusAsync(ContainmentStatus status);
        Task<ContainmentStatus> ProcessMqttPayloadAsync(int containmentId, string jsonPayload);
        Task<IEnumerable<ContainmentStatus>> GetAllLatestStatusesAsync();
        Task<bool> DeleteOldStatusesAsync(DateTime cutoffDate);
    }
}