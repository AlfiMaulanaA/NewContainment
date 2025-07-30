using Backend.Models;

namespace Backend.Services
{
    public interface IRackService
    {
        Task<IEnumerable<Rack>> GetAllRacksAsync();
        Task<IEnumerable<Rack>> GetRacksByContainmentIdAsync(int containmentId);
        Task<Rack?> GetRackByIdAsync(int id);
        Task<Rack> CreateRackAsync(Rack rack, int userId);
        Task<Rack?> UpdateRackAsync(int id, Rack rack, int userId);
        Task<bool> DeleteRackAsync(int id);
    }
}