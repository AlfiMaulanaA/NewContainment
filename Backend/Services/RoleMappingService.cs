// Services/RoleMappingService.cs
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Enums;
using Backend.Models;

namespace Backend.Services
{
    public interface IRoleMappingService
    {
        Task<Role?> GetDatabaseRoleFromEnumAsync(UserRole userRole);
        Task<List<Permission>> GetPermissionsForUserAsync(int userId);
        Task<List<string>> GetUserPermissionNamesAsync(int userId);
        Task<bool> HasPermissionAsync(int userId, string permissionName);
        Task InitializeDefaultRolesAsync();
    }

    public class RoleMappingService : IRoleMappingService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RoleMappingService> _logger;

        public RoleMappingService(AppDbContext context, ILogger<RoleMappingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Role?> GetDatabaseRoleFromEnumAsync(UserRole userRole)
        {
            try
            {
                // Map enum to database role by level
                var roleLevel = (int)userRole;
                var role = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Level == roleLevel && r.IsActive);

                return role;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error mapping UserRole enum {UserRole} to database role", userRole);
                return null;
            }
        }

        public async Task<List<Permission>> GetPermissionsForUserAsync(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return new List<Permission>();

                var databaseRole = await GetDatabaseRoleFromEnumAsync(user.Role);
                if (databaseRole == null) return new List<Permission>();

                var permissions = await _context.RolePermissions
                    .Where(rp => rp.RoleId == databaseRole.Id)
                    .Include(rp => rp.Permission)
                    .Select(rp => rp.Permission)
                    .Where(p => p.IsActive)
                    .ToListAsync();

                return permissions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for user {UserId}", userId);
                return new List<Permission>();
            }
        }

        public async Task<List<string>> GetUserPermissionNamesAsync(int userId)
        {
            var permissions = await GetPermissionsForUserAsync(userId);
            return permissions.Select(p => p.Name).ToList();
        }

        public async Task<bool> HasPermissionAsync(int userId, string permissionName)
        {
            var permissions = await GetUserPermissionNamesAsync(userId);
            return permissions.Contains(permissionName, StringComparer.OrdinalIgnoreCase);
        }

        public async Task InitializeDefaultRolesAsync()
        {
            try
            {
                // Ensure database schema exists before checking roles
                await _context.Database.EnsureCreatedAsync();

                // Check if roles already exist
                if (await _context.Roles.AnyAsync()) return;

                _logger.LogInformation("Initializing default roles...");

                var roles = new[]
                {
                    new Role
                    {
                        Name = "User",
                        DisplayName = "User",
                        Description = "Standard user with basic permissions",
                        Level = 1, // Maps to UserRole.User
                        Color = "text-gray-600 bg-gray-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "Admin",
                        DisplayName = "Administrator",
                        Description = "Administrator with elevated permissions",
                        Level = 2, // Maps to UserRole.Admin
                        Color = "text-blue-600 bg-blue-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "Developer",
                        DisplayName = "Developer",
                        Description = "Developer with full system access",
                        Level = 3, // Maps to UserRole.Developer
                        Color = "text-green-600 bg-green-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await _context.Roles.AddRangeAsync(roles);
                await _context.SaveChangesAsync();

                // Initialize default permissions
                await InitializeDefaultPermissionsAsync();

                _logger.LogInformation("Default roles and permissions initialized successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default roles");
                throw;
            }
        }

        private async Task InitializeDefaultPermissionsAsync()
        {
            var permissions = new[]
            {
                // Menu permissions
                new Permission { Name = "menu.dashboard", Description = "Access to dashboard", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "menu.management", Description = "Access to management section", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "menu.security", Description = "Access to security section", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "menu.analytics", Description = "Access to analytics section", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "menu.configuration", Description = "Access to configuration section", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "menu.developer", Description = "Access to developer tools", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                
                // Action permissions
                new Permission { Name = "users.create", Description = "Create new users", Category = "action", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "users.edit", Description = "Edit user information", Category = "action", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "users.delete", Description = "Delete users", Category = "action", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "devices.manage", Description = "Manage devices", Category = "action", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "system.configure", Description = "Configure system settings", Category = "action", IsActive = true, CreatedAt = DateTime.UtcNow },
                
                // Data permissions
                new Permission { Name = "data.view", Description = "View system data", Category = "data", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Permission { Name = "data.export", Description = "Export system data", Category = "data", IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            await _context.Permissions.AddRangeAsync(permissions);
            await _context.SaveChangesAsync();

            // Assign permissions to roles
            await AssignPermissionsToRolesAsync();
        }

        private async Task AssignPermissionsToRolesAsync()
        {
            var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Level == 1);
            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Level == 2);
            var developerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Level == 3);

            if (userRole == null || adminRole == null || developerRole == null) return;

            var allPermissions = await _context.Permissions.ToListAsync();

            // User permissions - basic access
            var userPermissions = allPermissions.Where(p =>
                p.Name.StartsWith("menu.dashboard") ||
                p.Name.StartsWith("menu.management") ||
                p.Name == "data.view"
            ).ToList();

            // Admin permissions - all except developer tools
            var adminPermissions = allPermissions.Where(p =>
                !p.Name.StartsWith("menu.developer")
            ).ToList();

            // Developer permissions - all permissions
            var developerPermissions = allPermissions.ToList();

            // Create role permission assignments
            var rolePermissions = new List<RolePermission>();

            foreach (var permission in userPermissions)
            {
                rolePermissions.Add(new RolePermission
                {
                    RoleId = userRole.Id,
                    PermissionId = permission.Id,
                    AssignedAt = DateTime.UtcNow
                });
            }

            foreach (var permission in adminPermissions)
            {
                rolePermissions.Add(new RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = permission.Id,
                    AssignedAt = DateTime.UtcNow
                });
            }

            foreach (var permission in developerPermissions)
            {
                rolePermissions.Add(new RolePermission
                {
                    RoleId = developerRole.Id,
                    PermissionId = permission.Id,
                    AssignedAt = DateTime.UtcNow
                });
            }

            await _context.RolePermissions.AddRangeAsync(rolePermissions);
            await _context.SaveChangesAsync();
        }
    }
}