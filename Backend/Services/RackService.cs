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
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rack>> GetRacksByContainmentIdAsync(int containmentId)
        {
            return await _context.Racks
                .Include(r => r.Containment)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .Where(r => r.ContainmentId == containmentId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<Rack?> GetRackByIdAsync(int id)
        {
            return await _context.Racks
                .Include(r => r.Containment)
                .Include(r => r.CreatedByUser)
                .Include(r => r.UpdatedByUser)
                .FirstOrDefaultAsync(r => r.Id == id && r.IsActive);
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
            if (existingRack == null || !existingRack.IsActive)
            {
                return null;
            }

            existingRack.Name = rack.Name;
            existingRack.ContainmentId = rack.ContainmentId;
            existingRack.Description = rack.Description;
            existingRack.UpdatedBy = userId;
            existingRack.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetRackByIdAsync(id);
        }

        public async Task<bool> DeleteRackAsync(int id)
        {
            var rack = await _context.Racks.FindAsync(id);
            if (rack == null || !rack.IsActive)
            {
                return false;
            }

            rack.IsActive = false;
            rack.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
    }
}