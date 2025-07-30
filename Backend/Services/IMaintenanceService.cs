using Backend.Models;
using Backend.Enums;

namespace Backend.Services
{
    public interface IMaintenanceService
    {
        Task<IEnumerable<Maintenance>> GetAllMaintenancesAsync();
        Task<IEnumerable<Maintenance>> GetMaintenancesByTargetAsync(MaintenanceTarget targetType, int targetId);
        Task<IEnumerable<Maintenance>> GetMaintenancesByAssigneeAsync(int userId);
        Task<Maintenance?> GetMaintenanceByIdAsync(int id);
        Task<Maintenance> CreateMaintenanceAsync(Maintenance maintenance, int userId);
        Task<Maintenance?> UpdateMaintenanceAsync(int id, Maintenance maintenance, int userId);
        Task<bool> DeleteMaintenanceAsync(int id);
        Task<bool> UpdateMaintenanceStatusAsync(int id, string status, int userId);
    }
}