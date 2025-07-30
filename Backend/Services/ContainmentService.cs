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
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<Containment?> GetContainmentByIdAsync(int id)
        {
            return await _context.Containments
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
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
            if (existingContainment == null || !existingContainment.IsActive)
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
            var containment = await _context.Containments.FindAsync(id);
            if (containment == null || !containment.IsActive)
            {
                return false;
            }

            containment.IsActive = false;
            containment.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
    }
}