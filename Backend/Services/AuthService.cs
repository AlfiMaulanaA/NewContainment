using Backend.Data;
using Backend.Models;
using Backend.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Backend.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;

        public AuthService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> AuthenticateAsync(string email, string password)
        {
            var user = await _context.Users
                .Include(u => u.DatabaseRole)
                .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

            if (user == null || !VerifyPassword(password, user.PasswordHash))
                return null;

            return user;
        }

        public async Task<User> RegisterAsync(string name, string email, string password, string? phoneNumber = null)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existingUser != null)
                throw new InvalidOperationException("User with this email already exists");

            // Get default user role from database
            var defaultRole = await _context.Roles.FirstOrDefaultAsync(r => r.Level == 1 && r.IsActive);

            var user = new User
            {
                Name = name,
                Email = email,
                PhoneNumber = phoneNumber,
                PasswordHash = HashPassword(password),
                Role = UserRole.User, // Keep for backward compatibility
                RoleId = defaultRole?.Id, // Use database role
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Load the role relationship
            await _context.Entry(user).Reference(u => u.DatabaseRole).LoadAsync();

            return user;
        }

        public string HashPassword(string password)
        {
            using var rng = RandomNumberGenerator.Create();
            var salt = new byte[16];
            rng.GetBytes(salt);

            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(32);

            var hashBytes = new byte[48];
            Array.Copy(salt, 0, hashBytes, 0, 16);
            Array.Copy(hash, 0, hashBytes, 16, 32);

            return Convert.ToBase64String(hashBytes);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            try
            {
                var hashBytes = Convert.FromBase64String(hashedPassword);
                var salt = new byte[16];
                Array.Copy(hashBytes, 0, salt, 0, 16);

                using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
                var hash = pbkdf2.GetBytes(32);

                for (int i = 0; i < 32; i++)
                {
                    if (hashBytes[i + 16] != hash[i])
                        return false;
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<User?> FindUserForPasswordResetAsync(string email, string name)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email.ToLower() == email.ToLower() &&
                u.Name.ToLower() == name.ToLower() &&
                u.IsActive);

            return user;
        }

        public async Task<bool> ResetPasswordAsync(int userId, string newPassword)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
                if (user == null)
                    return false;

                user.PasswordHash = HashPassword(newPassword);
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}