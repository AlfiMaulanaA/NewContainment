using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Models;

namespace Backend.Services
{
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
            _secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? _configuration["Jwt:SecretKey"] ?? "your-very-secret-key-that-is-at-least-256-bits-long-for-jwt-security";
            _issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? _configuration["Jwt:Issuer"] ?? "Backend";
            _audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? _configuration["Jwt:Audience"] ?? "BackendUsers";
        }

        public string GenerateToken(User user, bool rememberMe = false)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.RoleName), // Use RoleName property for compatibility
                new Claim("UserId", user.Id.ToString()),
                new Claim("RoleLevel", user.RoleLevel.ToString()), // Add role level for frontend
                new Claim("RememberMe", rememberMe.ToString()) // Add remember me claim for tracking
            };

            // Add database role information if available
            if (user.DatabaseRole != null)
            {
                claims.Add(new Claim("DatabaseRoleId", user.DatabaseRole.Id.ToString()));
                claims.Add(new Claim("DatabaseRoleName", user.DatabaseRole.Name));
                claims.Add(new Claim("DatabaseRoleDisplayName", user.DatabaseRole.DisplayName));
                claims.Add(new Claim("RoleColor", user.DatabaseRole.Color));
            }

            // Set token expiration based on rememberMe flag
            var expiry = rememberMe
                ? DateTime.UtcNow.AddDays(365) // 1 year for remember me
                : DateTime.UtcNow.AddHours(24); // 24 hours for normal login

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expiry,
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public bool ValidateToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_secretKey);

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}