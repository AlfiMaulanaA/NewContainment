using Backend.Models;

namespace Backend.Services
{
    public interface IContainmentStatusService
    {
        Task<ContainmentStatus?> GetStatusByContainmentIdAsync(int containmentId);
        Task<ContainmentStatus> CreateOrUpdateStatusAsync(ContainmentStatus status);
        Task<ContainmentStatus> ProcessMqttPayloadAsync(int containmentId, string jsonPayload);
        Task<IEnumerable<ContainmentStatus>> GetAllStatusesAsync();
        Task<ContainmentStatus> InitializeDefaultStatusAsync(int containmentId);
    }
}