using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.Enums;

namespace Backend.Services
{
    public class MaintenanceService : IMaintenanceService
    {
        private readonly AppDbContext _context;
        private readonly IMaintenanceNotificationService _notificationService;
        private readonly ILogger<MaintenanceService> _logger;

        public MaintenanceService(
            AppDbContext context, 
            IMaintenanceNotificationService notificationService,
            ILogger<MaintenanceService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<IEnumerable<Maintenance>> GetAllMaintenancesAsync()
        {
            var maintenances = await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            // Manually populate navigation properties based on TargetType
            await PopulateTargetNavigationPropertiesAsync(maintenances);
            return maintenances;
        }

        public async Task<IEnumerable<Maintenance>> GetMaintenancesByTargetAsync(MaintenanceTarget targetType, int targetId)
        {
            var maintenances = await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Where(m => m.TargetType == targetType && m.TargetId == targetId && m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            await PopulateTargetNavigationPropertiesAsync(maintenances);
            return maintenances;
        }

        public async Task<IEnumerable<Maintenance>> GetMaintenancesByAssigneeAsync(int userId)
        {
            var maintenances = await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Where(m => m.AssignTo == userId && m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            await PopulateTargetNavigationPropertiesAsync(maintenances);
            return maintenances;
        }

        public async Task<IEnumerable<Maintenance>> GetMaintenancesForCalendarAsync(int currentUserId, bool isAdmin)
        {
            IQueryable<Maintenance> query = _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .Where(m => m.IsActive);

            // If user is not admin, only show maintenance tasks assigned to them
            if (!isAdmin)
            {
                query = query.Where(m => m.AssignTo == currentUserId);
            }

            var maintenances = await query
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            await PopulateTargetNavigationPropertiesAsync(maintenances);
            return maintenances;
        }

        public async Task<Maintenance?> GetMaintenanceByIdAsync(int id)
        {
            var maintenance = await _context.Maintenances
                .Include(m => m.AssignedToUser)
                .Include(m => m.CreatedByUser)
                .Include(m => m.UpdatedByUser)
                .FirstOrDefaultAsync(m => m.Id == id && m.IsActive);

            if (maintenance != null)
            {
                await PopulateTargetNavigationPropertiesAsync(new List<Maintenance> { maintenance });
            }

            return maintenance;
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

            var createdMaintenance = await GetMaintenanceByIdAsync(maintenance.Id) ?? maintenance;

            try
            {
                // Send WhatsApp notification to assigned user
                await _notificationService.SendMaintenanceAssignmentNotificationAsync(createdMaintenance);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send maintenance assignment notification for maintenance {MaintenanceId}", maintenance.Id);
                // Don't fail the creation if notification fails
            }

            return createdMaintenance;
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

        private async Task PopulateTargetNavigationPropertiesAsync(IEnumerable<Maintenance> maintenances)
        {
            var groupedMaintenances = maintenances.GroupBy(m => m.TargetType);

            foreach (var group in groupedMaintenances)
            {
                var targetIds = group.Select(m => m.TargetId).Distinct().ToList();

                switch (group.Key)
                {
                    case MaintenanceTarget.Device:
                        var devices = await _context.Devices
                            .Where(d => targetIds.Contains(d.Id))
                            .ToDictionaryAsync(d => d.Id, d => d);
                        
                        foreach (var maintenance in group)
                        {
                            if (devices.TryGetValue(maintenance.TargetId, out var device))
                            {
                                maintenance.TargetDevice = device;
                            }
                        }
                        break;

                    case MaintenanceTarget.Rack:
                        var racks = await _context.Racks
                            .Include(r => r.Containment)
                            .Where(r => targetIds.Contains(r.Id))
                            .ToDictionaryAsync(r => r.Id, r => r);
                        
                        foreach (var maintenance in group)
                        {
                            if (racks.TryGetValue(maintenance.TargetId, out var rack))
                            {
                                maintenance.TargetRack = rack;
                            }
                        }
                        break;

                    case MaintenanceTarget.Containment:
                        var containments = await _context.Containments
                            .Where(c => targetIds.Contains(c.Id))
                            .ToDictionaryAsync(c => c.Id, c => c);
                        
                        foreach (var maintenance in group)
                        {
                            if (containments.TryGetValue(maintenance.TargetId, out var containment))
                            {
                                maintenance.TargetContainment = containment;
                            }
                        }
                        break;
                }
            }
        }
    }
}