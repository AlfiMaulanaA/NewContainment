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
            return await _context.Users.Where(u => u.IsActive).ToListAsync();
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
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
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
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
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
            if (user == null)
                return false;

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UserExistsAsync(int id)
        {
            return await _context.Users.AnyAsync(u => u.Id == id && u.IsActive);
        }
    }
}