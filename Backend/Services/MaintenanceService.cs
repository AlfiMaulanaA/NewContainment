using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.Enums;

namespace Backend.Services
{
    public class MaintenanceService : IMaintenanceService
    {
        private readonly AppDbContext _context;

        public MaintenanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Maintenance>> GetAllMaintenancesAsync()
        {
            return await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Include(m => m.TargetDevice)
                .Include(m => m.TargetRack)
                    .ThenInclude(r => r!.Containment)
                .Include(m => m.TargetContainment)
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Maintenance>> GetMaintenancesByTargetAsync(MaintenanceTarget targetType, int targetId)
        {
            return await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Include(m => m.TargetDevice)
                .Include(m => m.TargetRack)
                    .ThenInclude(r => r!.Containment)
                .Include(m => m.TargetContainment)
                .Where(m => m.TargetType == targetType && m.TargetId == targetId && m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Maintenance>> GetMaintenancesByAssigneeAsync(int userId)
        {
            return await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Include(m => m.TargetDevice)
                .Include(m => m.TargetRack)
                    .ThenInclude(r => r!.Containment)
                .Include(m => m.TargetContainment)
                .Where(m => m.AssignTo == userId && m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<Maintenance?> GetMaintenanceByIdAsync(int id)
        {
            return await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Include(m => m.TargetDevice)
                .Include(m => m.TargetRack)
                    .ThenInclude(r => r!.Containment)
                .Include(m => m.TargetContainment)
                .FirstOrDefaultAsync(m => m.Id == id && m.IsActive);
        }

        public async Task<Maintenance> CreateMaintenanceAsync(Maintenance maintenance, int userId)
        {
            maintenance.CreatedBy = userId;
            maintenance.CreatedAt = DateTime.UtcNow;
            maintenance.UpdatedAt = DateTime.UtcNow;
            maintenance.IsActive = true;
            maintenance.Status = "Scheduled";

            _context.Maintenances.Add(maintenance);
            await _context.SaveChangesAsync();

            return await GetMaintenanceByIdAsync(maintenance.Id) ?? maintenance;
        }

        public async Task<Maintenance?> UpdateMaintenanceAsync(int id, Maintenance maintenance, int userId)
        {
            var existingMaintenance = await _context.Maintenances.FindAsync(id);
            if (existingMaintenance == null || !existingMaintenance.IsActive)
            {
                return null;
            }

            existingMaintenance.Name = maintenance.Name;
            existingMaintenance.Description = maintenance.Description;
            existingMaintenance.StartTask = maintenance.StartTask;
            existingMaintenance.EndTask = maintenance.EndTask;
            existingMaintenance.AssignTo = maintenance.AssignTo;
            existingMaintenance.TargetType = maintenance.TargetType;
            existingMaintenance.TargetId = maintenance.TargetId;
            existingMaintenance.Status = maintenance.Status;
            existingMaintenance.UpdatedBy = userId;
            existingMaintenance.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetMaintenanceByIdAsync(id);
        }

        public async Task<bool> UpdateMaintenanceStatusAsync(int id, string status, int userId)
        {
            var maintenance = await _context.Maintenances.FindAsync(id);
            if (maintenance == null || !maintenance.IsActive)
            {
                return false;
            }

            maintenance.Status = status;
            maintenance.UpdatedBy = userId;
            maintenance.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteMaintenanceAsync(int id)
        {
            var maintenance = await _context.Maintenances.FindAsync(id);
            if (maintenance == null || !maintenance.IsActive)
            {
                return false;
            }

            maintenance.IsActive = false;
            maintenance.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
    }
}