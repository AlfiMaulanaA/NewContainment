using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services;
using Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IJwtService _jwtService;

        public AuthController(IAuthService authService, IJwtService jwtService)
        {
            _authService = authService;
            _jwtService = jwtService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _authService.AuthenticateAsync(request.Email, request.Password);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password" });

            var token = _jwtService.GenerateToken(user);

            return Ok(new LoginResponse
            {
                Token = token,
                User = new UserInfo
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role,
                    PhoneNumber = user.PhoneNumber
                }
            });
        }

        [HttpPost("register")]
        public async Task<ActionResult<LoginResponse>> Register(RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _authService.RegisterAsync(
                    request.Name, 
                    request.Email, 
                    request.Password, 
                    request.PhoneNumber
                );

                var token = _jwtService.GenerateToken(user);

                return Ok(new LoginResponse
                {
                    Token = token,
                    User = new UserInfo
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        Role = user.Role,
                        PhoneNumber = user.PhoneNumber
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            var userId = User.FindFirst("UserId")?.Value;
            var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            return Ok(new
            {
                Id = userId,
                Name = userName,
                Email = userEmail,
                Role = userRole
            });
        }
    }

    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [StringLength(20)]
        public string? PhoneNumber { get; set; }
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserInfo User { get; set; } = new();
    }

    public class UserInfo
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public string? PhoneNumber { get; set; }
    }
}