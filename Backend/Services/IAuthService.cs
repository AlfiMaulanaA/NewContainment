using Backend.Models;

namespace Backend.Services
{
    public interface IAuthService
    {
        Task<User?> AuthenticateAsync(string email, string password);
        Task<User> RegisterAsync(string name, string email, string password, string? phoneNumber = null);
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
        Task<User?> FindUserForPasswordResetAsync(string email, string name);
        Task<bool> ResetPasswordAsync(int userId, string newPassword);
    }
}