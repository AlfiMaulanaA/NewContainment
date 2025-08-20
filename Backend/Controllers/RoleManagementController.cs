using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RoleManagementController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IRoleMappingService _roleMappingService;
        private readonly IRoleMigrationService _roleMigrationService;
        private readonly ILogger<RoleManagementController> _logger;

        public RoleManagementController(
            AppDbContext context,
            IRoleMappingService roleMappingService,
            IRoleMigrationService roleMigrationService,
            ILogger<RoleManagementController> logger)
        {
            _context = context;
            _roleMappingService = roleMappingService;
            _roleMigrationService = roleMigrationService;
            _logger = logger;
        }

        [HttpGet("roles")]
        public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
        {
            try
            {
                var roles = await _context.Roles
                    .Where(r => r.IsActive)
                    .Include(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                    .OrderBy(r => r.Level)
                    .ToListAsync();

                var roleDtos = roles.Select(role => new RoleDto
                {
                    Id = role.Id,
                    Name = role.Name,
                    DisplayName = role.DisplayName,
                    Description = role.Description,
                    Level = role.Level,
                    Color = role.Color,
                    IsActive = role.IsActive,
                    Permissions = role.RolePermissions
                        .Where(rp => rp.Permission.IsActive)
                        .Select(rp => rp.Permission.Name)
                        .ToList()
                }).ToList();

                return Ok(roleDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving roles");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("migration/status")]
        public async Task<ActionResult> GetMigrationStatus()
        {
            try
            {
                var isCompleted = await _roleMigrationService.CheckMigrationStatusAsync();
                var unmigratedCount = await _roleMigrationService.GetUnmigratedUsersCountAsync();

                return Ok(new
                {
                    IsCompleted = isCompleted,
                    UnmigratedUsersCount = unmigratedCount,
                    Message = isCompleted 
                        ? "All users are using the new role system" 
                        : $"{unmigratedCount} users need migration"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking migration status");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("migration/execute")]
        [Authorize(Roles = "Developer,Admin")]
        public async Task<ActionResult> ExecuteMigration()
        {
            try
            {
                var unmigratedCount = await _roleMigrationService.GetUnmigratedUsersCountAsync();
                if (unmigratedCount == 0)
                {
                    return Ok(new { Message = "No migration needed. All users are already using the new role system." });
                }

                await _roleMigrationService.MigrateExistingUsersToNewRoleSystemAsync();

                var finalUnmigratedCount = await _roleMigrationService.GetUnmigratedUsersCountAsync();
                var migratedCount = unmigratedCount - finalUnmigratedCount;

                return Ok(new
                {
                    Message = $"Migration completed successfully. Migrated {migratedCount} users.",
                    MigratedUsersCount = migratedCount,
                    RemainingUnmigratedCount = finalUnmigratedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing migration");
                return StatusCode(500, "Migration failed: " + ex.Message);
            }
        }

        [HttpGet("users/{userId}/permissions")]
        public async Task<ActionResult<IEnumerable<string>>> GetUserPermissions(int userId)
        {
            try
            {
                var permissions = await _roleMappingService.GetUserPermissionNamesAsync(userId);
                return Ok(permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user permissions for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("users/{userId}/role")]
        public async Task<ActionResult<RoleDto>> GetUserRole(int userId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.DatabaseRole!)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                    .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

                if (user == null)
                {
                    return NotFound("User not found");
                }

                if (user.DatabaseRole == null)
                {
                    // User still using enum role, map it
                    var databaseRole = await _roleMappingService.GetDatabaseRoleFromEnumAsync(user.Role);
                    if (databaseRole == null)
                    {
                        return NotFound("Role not found");
                    }

                    return Ok(new RoleDto
                    {
                        Id = databaseRole.Id,
                        Name = databaseRole.Name,
                        DisplayName = databaseRole.DisplayName,
                        Description = databaseRole.Description,
                        Level = databaseRole.Level,
                        Color = databaseRole.Color,
                        IsActive = databaseRole.IsActive,
                        Permissions = new List<string>()
                    });
                }

                var roleDto = new RoleDto
                {
                    Id = user.DatabaseRole.Id,
                    Name = user.DatabaseRole.Name,
                    DisplayName = user.DatabaseRole.DisplayName,
                    Description = user.DatabaseRole.Description,
                    Level = user.DatabaseRole.Level,
                    Color = user.DatabaseRole.Color,
                    IsActive = user.DatabaseRole.IsActive,
                    Permissions = user.DatabaseRole.RolePermissions
                        .Where(rp => rp.Permission.IsActive)
                        .Select(rp => rp.Permission.Name)
                        .ToList()
                };

                return Ok(roleDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user role for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("initialize")]
        [Authorize(Roles = "Developer")]
        public async Task<ActionResult> InitializeRoles()
        {
            try
            {
                await _roleMappingService.InitializeDefaultRolesAsync();
                return Ok(new { Message = "Roles initialized successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing roles");
                return StatusCode(500, "Failed to initialize roles: " + ex.Message);
            }
        }

        [HttpGet("test/current-user")]
        public async Task<ActionResult> GetCurrentUserWithRole()
        {
            try
            {
                var userIdClaim = User.FindFirst("UserId")?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized("Invalid user ID in token");
                }

                var user = await _context.Users
                    .Include(u => u.DatabaseRole)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound("User not found");
                }

                return Ok(new
                {
                    UserId = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    EnumRole = user.Role.ToString(),
                    DatabaseRole = user.DatabaseRole != null ? new
                    {
                        Id = user.DatabaseRole.Id,
                        Name = user.DatabaseRole.Name,
                        DisplayName = user.DatabaseRole.DisplayName,
                        Level = user.DatabaseRole.Level,
                        Color = user.DatabaseRole.Color
                    } : null,
                    EffectiveRoleName = user.RoleName,
                    EffectiveRoleLevel = user.RoleLevel,
                    HasDatabaseRole = user.DatabaseRole != null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving current user with role information");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}