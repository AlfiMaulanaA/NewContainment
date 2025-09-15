using Backend.Models;

namespace Backend.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user, bool rememberMe = false);
        bool ValidateToken(string token);
    }
}