using Backend.Models;

namespace Backend.Services
{
    public interface IContainmentControlService
    {
        Task<ContainmentControlResponse> SendToggleCommandAsync(ToggleControlRequest request, int userId);
        Task<IEnumerable<ContainmentControl>> GetControlHistoryAsync(int containmentId, int limit = 50);
        Task<IEnumerable<ContainmentControl>> GetAllControlHistoryAsync(int limit = 100);
        Task<string> GetMqttTogglePayload(string controlType, bool isEnabled);
    }
}