using Backend.Models;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;

        public UserService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        public async Task<User> CreateUserAsync(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            user.IsActive = true;
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<User?> UpdateUserAsync(int id, User updatedUser)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (existingUser == null)
                return null;

            existingUser.Name = updatedUser.Name;
            existingUser.Email = updatedUser.Email;
            existingUser.PhoneNumber = updatedUser.PhoneNumber;
            existingUser.Role = updatedUser.Role;
            existingUser.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return existingUser;
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                    return false;

                // First, update all records that reference this user to set foreign keys to null or another user
                // Update Containments created/updated by this user - set to NULL
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Containments SET CreatedBy = NULL WHERE CreatedBy = {0}", id);
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Containments SET UpdatedBy = NULL WHERE UpdatedBy = {0}", id);

                // Update Racks created/updated by this user - set to NULL  
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Racks SET CreatedBy = NULL WHERE CreatedBy = {0}", id);
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Racks SET UpdatedBy = NULL WHERE UpdatedBy = {0}", id);

                // Update Devices created/updated by this user - set to NULL
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Devices SET CreatedBy = NULL WHERE CreatedBy = {0}", id);
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Devices SET UpdatedBy = NULL WHERE UpdatedBy = {0}", id);

                // For Maintenances, we need to handle AssignTo and CreatedBy/UpdatedBy
                // Option 1: Delete all maintenance assigned to this user (if you want to remove tasks)
                await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM Maintenances WHERE AssignTo = {0}", id);
                
                // Option 2: Or reassign to another user (uncomment if preferred)
                // await _context.Database.ExecuteSqlRawAsync(
                //     "UPDATE Maintenances SET AssignTo = 1 WHERE AssignTo = {0}", id); // reassign to admin user
                
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Maintenances SET CreatedBy = NULL WHERE CreatedBy = {0}", id);
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Maintenances SET UpdatedBy = NULL WHERE UpdatedBy = {0}", id);

                // Update ActivityReports that reference this user
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE ActivityReports SET UserId = NULL WHERE UserId = {0}", id);

                // Update ContainmentControls executed by this user
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE ContainmentControls SET ExecutedBy = NULL WHERE ExecutedBy = {0}", id);

                // EmergencyReports don't have user references, so skip them

                // Now safe to delete the user
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> UserExistsAsync(int id)
        {
            return await _context.Users.AnyAsync(u => u.Id == id);
        }
    }
}