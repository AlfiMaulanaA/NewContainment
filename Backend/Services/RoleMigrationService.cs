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
        Task CleanupDuplicateRolesAsync();
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

                // Check if Roles table exists and has data
                var roleCount = await _context.Roles.CountAsync();
                if (roleCount == 0)
                {
                    _logger.LogError("No roles found in database. Please ensure roles are seeded before migration.");
                    throw new InvalidOperationException("No roles found in database. Migration cannot proceed.");
                }

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

                // Get all roles for mapping - use GroupBy to handle potential duplicate levels
                var rolesQuery = await _context.Roles
                    .Where(r => r.IsActive)
                    .ToListAsync();

                _logger.LogInformation("Found {RoleCount} active roles in database", rolesQuery.Count);

                // Check for duplicate levels and log warnings
                var duplicateLevels = rolesQuery
                    .GroupBy(r => r.Level)
                    .Where(g => g.Count() > 1)
                    .ToList();

                if (duplicateLevels.Any())
                {
                    foreach (var duplicate in duplicateLevels)
                    {
                        _logger.LogWarning("Found duplicate roles with level {Level}: {RoleNames}", 
                            duplicate.Key, string.Join(", ", duplicate.Select(r => $"{r.Name} (ID: {r.Id})")));
                    }
                }

                // Group by Level and take the first role for each level to avoid duplicates
                var roles = rolesQuery
                    .GroupBy(r => r.Level)
                    .ToDictionary(g => g.Key, g => g.First());

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

                // Save all changes in a transaction
                if (migratedCount > 0)
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                        _logger.LogInformation("Successfully migrated {MigratedCount} users to new role system", migratedCount);
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(ex, "Failed to save migration changes. Transaction rolled back.");
                        throw;
                    }
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

        public async Task CleanupDuplicateRolesAsync()
        {
            try
            {
                _logger.LogInformation("Starting cleanup of duplicate roles...");

                // Get all roles grouped by level
                var allRoles = await _context.Roles.ToListAsync();
                var duplicateGroups = allRoles
                    .GroupBy(r => r.Level)
                    .Where(g => g.Count() > 1)
                    .ToList();

                if (!duplicateGroups.Any())
                {
                    _logger.LogInformation("No duplicate roles found");
                    return;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    foreach (var group in duplicateGroups)
                    {
                        var rolesToKeep = group.OrderBy(r => r.CreatedAt).First(); // Keep the oldest one
                        var rolesToDelete = group.Skip(1).ToList();

                        _logger.LogInformation("Keeping role '{RoleName}' (ID: {Id}) for level {Level}, removing {Count} duplicates",
                            rolesToKeep.Name, rolesToKeep.Id, rolesToKeep.Level, rolesToDelete.Count);

                        // Update any users that reference the duplicate roles to use the kept role
                        var usersWithDuplicateRoles = await _context.Users
                            .Where(u => rolesToDelete.Select(r => r.Id).Contains(u.RoleId ?? 0))
                            .ToListAsync();

                        foreach (var user in usersWithDuplicateRoles)
                        {
                            _logger.LogDebug("Updating user {UserId} from duplicate role to kept role {RoleId}",
                                user.Id, rolesToKeep.Id);
                            user.RoleId = rolesToKeep.Id;
                            user.UpdatedAt = DateTime.UtcNow;
                        }

                        // Remove the duplicate roles
                        _context.Roles.RemoveRange(rolesToDelete);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    _logger.LogInformation("Successfully cleaned up duplicate roles");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to cleanup duplicate roles. Transaction rolled back.");
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during duplicate role cleanup");
                throw;
            }
        }
    }
}