using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Services
{
    public class ContainmentService : IContainmentService
    {
        private readonly AppDbContext _context;

        public ContainmentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Containment>> GetAllContainmentsAsync()
        {
            return await _context.Containments
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<Containment?> GetContainmentByIdAsync(int id)
        {
            return await _context.Containments
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<Containment> CreateContainmentAsync(Containment containment, int userId)
        {
            containment.CreatedBy = userId;
            containment.CreatedAt = DateTime.UtcNow;
            containment.UpdatedAt = DateTime.UtcNow;
            containment.IsActive = true;

            _context.Containments.Add(containment);
            await _context.SaveChangesAsync();

            return await GetContainmentByIdAsync(containment.Id) ?? containment;
        }

        public async Task<Containment?> UpdateContainmentAsync(int id, Containment containment, int userId)
        {
            var existingContainment = await _context.Containments.FindAsync(id);
            if (existingContainment == null)
            {
                return null;
            }

            existingContainment.Name = containment.Name;
            existingContainment.Type = containment.Type;
            existingContainment.Description = containment.Description;
            existingContainment.Location = containment.Location;
            existingContainment.UpdatedBy = userId;
            existingContainment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetContainmentByIdAsync(id);
        }

        public async Task<bool> DeleteContainmentAsync(int id)
        {
            var containment = await _context.Containments
                .Include(c => c.Racks)
                    .ThenInclude(r => r.Devices)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (containment == null)
            {
                return false;
            }

            // Cascade hard delete: remove all related devices first
            foreach (var rack in containment.Racks)
            {
                foreach (var device in rack.Devices)
                {
                    _context.Devices.Remove(device);
                }

                // Then remove the rack
                _context.Racks.Remove(rack);
            }

            // Finally remove the containment
            _context.Containments.Remove(containment);

            await _context.SaveChangesAsync();
            return true;
        }
    }
}