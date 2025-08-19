using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Enums;
using Backend.Models;

namespace Backend.Services
{
    public interface IRoleMigrationService
    {
        Task MigrateExistingUsersToNewRoleSystemAsync();
        Task<bool> CheckMigrationStatusAsync();
        Task<int> GetUnmigratedUsersCountAsync();
    }

    public class RoleMigrationService : IRoleMigrationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RoleMigrationService> _logger;

        public RoleMigrationService(AppDbContext context, ILogger<RoleMigrationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> CheckMigrationStatusAsync()
        {
            try
            {
                // Check if there are users without RoleId set but with enum Role
                var unmigratedCount = await GetUnmigratedUsersCountAsync();
                return unmigratedCount == 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking migration status");
                return false;
            }
        }

        public async Task<int> GetUnmigratedUsersCountAsync()
        {
            return await _context.Users
                .Where(u => u.RoleId == null && u.IsActive)
                .CountAsync();
        }

        public async Task MigrateExistingUsersToNewRoleSystemAsync()
        {
            try
            {
                _logger.LogInformation("Starting migration of existing users to new role system...");

                // Get all users without RoleId
                var unmigratedUsers = await _context.Users
                    .Where(u => u.RoleId == null && u.IsActive)
                    .ToListAsync();

                if (!unmigratedUsers.Any())
                {
                    _logger.LogInformation("No users need migration. All users already have database roles assigned.");
                    return;
                }

                _logger.LogInformation("Found {Count} users that need migration", unmigratedUsers.Count);

                // Get all roles for mapping
                var roles = await _context.Roles
                    .Where(r => r.IsActive)
                    .ToDictionaryAsync(r => r.Level, r => r);

                int migratedCount = 0;
                int failedCount = 0;

                foreach (var user in unmigratedUsers)
                {
                    try
                    {
                        var userRoleLevel = (int)user.Role;
                        
                        if (roles.ContainsKey(userRoleLevel))
                        {
                            user.RoleId = roles[userRoleLevel].Id;
                            user.UpdatedAt = DateTime.UtcNow;
                            migratedCount++;
                            
                            _logger.LogDebug("Migrated user {UserId} ({UserName}) from enum role {EnumRole} to database role {DatabaseRoleId}", 
                                user.Id, user.Name, user.Role, user.RoleId);
                        }
                        else
                        {
                            _logger.LogWarning("No database role found for user {UserId} with role level {RoleLevel}. Assigning default User role.", 
                                user.Id, userRoleLevel);
                            
                            // Assign default User role (level 1) if no matching role found
                            var defaultRole = roles.Values.FirstOrDefault(r => r.Level == 1);
                            if (defaultRole != null)
                            {
                                user.RoleId = defaultRole.Id;
                                user.UpdatedAt = DateTime.UtcNow;
                                migratedCount++;
                            }
                            else
                            {
                                _logger.LogError("No default User role found for user {UserId}", user.Id);
                                failedCount++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to migrate user {UserId} ({UserName})", user.Id, user.Name);
                        failedCount++;
                    }
                }

                // Save all changes
                if (migratedCount > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully migrated {MigratedCount} users to new role system", migratedCount);
                }

                if (failedCount > 0)
                {
                    _logger.LogWarning("Failed to migrate {FailedCount} users", failedCount);
                }

                _logger.LogInformation("User role migration completed. Migrated: {MigratedCount}, Failed: {FailedCount}", 
                    migratedCount, failedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical error during user role migration");
                throw;
            }
        }
    }
}