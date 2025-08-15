using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class RackService : IRackService
    {
        private readonly AppDbContext _context;

        public RackService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Rack>> GetAllRacksAsync()
        {
            return await _context.Racks
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.CreatedByUser)
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.UpdatedByUser)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .Include(r => r.Devices)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rack>> GetRacksByContainmentIdAsync(int containmentId)
        {
            return await _context.Racks
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.CreatedByUser)
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.UpdatedByUser)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .Include(r => r.Devices)
                .Where(r => r.ContainmentId == containmentId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<Rack?> GetRackByIdAsync(int id)
        {
            return await _context.Racks
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.CreatedByUser)
                .Include(r => r.Containment)
                    .ThenInclude(c => c!.UpdatedByUser)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .Include(r => r.Devices)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<Rack> CreateRackAsync(Rack rack, int userId)
        {
            rack.CreatedBy = userId;
            rack.CreatedAt = DateTime.UtcNow;
            rack.UpdatedAt = DateTime.UtcNow;
            rack.IsActive = true;

            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            return await GetRackByIdAsync(rack.Id) ?? rack;
        }

        public async Task<Rack?> UpdateRackAsync(int id, Rack rack, int userId)
        {
            var existingRack = await _context.Racks.FindAsync(id);
            if (existingRack == null)
            {
                return null;
            }

            existingRack.Name = rack.Name;
            existingRack.ContainmentId = rack.ContainmentId;
            existingRack.Description = rack.Description;
            existingRack.CapacityU = rack.CapacityU;
            existingRack.UpdatedBy = userId;
            existingRack.UpdatedAt = DateTime.UtcNow;
            existingRack.IsActive = true; // Reactivate if updating

            await _context.SaveChangesAsync();

            return await GetRackByIdAsync(id);
        }

        public async Task<bool> DeleteRackAsync(int id)
        {
            var rack = await _context.Racks
                .Include(r => r.Devices)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (rack == null)
            {
                return false;
            }

            // First delete all devices in this rack
            foreach (var device in rack.Devices)
            {
                _context.Devices.Remove(device);
            }

            // Then delete the rack
            _context.Racks.Remove(rack);
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> DeleteRacksByContainmentIdAsync(int containmentId)
        {
            var racks = await _context.Racks
                .Include(r => r.Devices)
                .Where(r => r.ContainmentId == containmentId)
                .ToListAsync();

            var deletedCount = racks.Count;
            
            foreach (var rack in racks)
            {
                // First delete all devices in this rack
                foreach (var device in rack.Devices)
                {
                    _context.Devices.Remove(device);
                }
                
                // Then remove the rack
                _context.Racks.Remove(rack);
            }

            await _context.SaveChangesAsync();
            return deletedCount;
        }
    }
}