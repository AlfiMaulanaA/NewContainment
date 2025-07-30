using Backend.Models;

namespace Backend.Services
{
    public interface IAuthService
    {
        Task<User?> AuthenticateAsync(string email, string password);
        Task<User> RegisterAsync(string name, string email, string password, string? phoneNumber = null);
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
    }
}