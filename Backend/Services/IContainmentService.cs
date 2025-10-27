using Backend.Models;

namespace Backend.Services
{
    public interface IContainmentService
    {
        Task<IEnumerable<Containment>> GetAllContainmentsAsync();
        Task<Containment?> GetContainmentByIdAsync(int id);
        Task<Containment> CreateContainmentAsync(Containment containment, int userId);
        Task<Containment?> UpdateContainmentAsync(int id, Containment containment, int userId);
        Task<bool> DeleteContainmentAsync(int id);
    }
}