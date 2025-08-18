// Data/MenuSeedData.cs
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public static class MenuSeedData
    {
        public static async Task SeedMenuDataAsync(AppDbContext context)
        {
            // Check if data already exists
            if (await context.Roles.AnyAsync() || await context.MenuGroups.AnyAsync())
            {
                return; // Data already seeded
            }

            await using var transaction = await context.Database.BeginTransactionAsync();
            try
            {
                // Seed Roles
                var roles = new List<Role>
                {
                    new Role
                    {
                        Name = "user",
                        DisplayName = "User",
                        Description = "Standard user with basic access",
                        Level = 1,
                        Color = "text-green-600 bg-green-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "developer",
                        DisplayName = "Developer",
                        Description = "Developer with advanced access",
                        Level = 2,
                        Color = "text-blue-600 bg-blue-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "admin",
                        DisplayName = "Administrator",
                        Description = "Administrator with full access",
                        Level = 3,
                        Color = "text-red-600 bg-red-100",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.Roles.AddRangeAsync(roles);
                await context.SaveChangesAsync();

                // Seed Permissions
                var permissions = new List<Permission>
                {
                    new Permission { Name = "menu.view", Description = "View menu items", Category = "menu", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Permission { Name = "user.manage", Description = "Manage users", Category = "user", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Permission { Name = "system.configure", Description = "Configure system settings", Category = "system", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Permission { Name = "developer.access", Description = "Access developer tools", Category = "developer", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Permission { Name = "admin.access", Description = "Full administrative access", Category = "admin", IsActive = true, CreatedAt = DateTime.UtcNow }
                };

                await context.Permissions.AddRangeAsync(permissions);
                await context.SaveChangesAsync();

                // Seed Menu Groups
                var menuGroups = new List<MenuGroup>
                {
                    new MenuGroup
                    {
                        Title = "Dashboard",
                        Icon = "LayoutDashboard",
                        SortOrder = 1,
                        MinRoleLevel = 0, // Public access
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuGroup
                    {
                        Title = "Infrastructure",
                        Icon = "Server",
                        SortOrder = 2,
                        MinRoleLevel = 1, // User+
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuGroup
                    {
                        Title = "Security",
                        Icon = "Shield",
                        SortOrder = 3,
                        MinRoleLevel = 2, // Developer+
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuGroup
                    {
                        Title = "Analytics",
                        Icon = "BarChart3",
                        SortOrder = 4,
                        MinRoleLevel = 1, // User+
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuGroup
                    {
                        Title = "Configuration",
                        Icon = "Cog",
                        SortOrder = 5,
                        MinRoleLevel = 1, // User+
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuGroup
                    {
                        Title = "Management",
                        Icon = "Settings",
                        SortOrder = 6,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.MenuGroups.AddRangeAsync(menuGroups);
                await context.SaveChangesAsync();

                // Get group IDs for menu items
                var dashboardGroup = menuGroups.First(g => g.Title == "Dashboard");
                var infraGroup = menuGroups.First(g => g.Title == "Infrastructure");
                var securityGroup = menuGroups.First(g => g.Title == "Security");
                var analyticsGroup = menuGroups.First(g => g.Title == "Analytics");
                var configGroup = menuGroups.First(g => g.Title == "Configuration");
                var managementGroup = menuGroups.First(g => g.Title == "Management");

                // Seed Menu Items
                var menuItems = new List<MenuItem>
                {
                    // Dashboard items
                    new MenuItem
                    {
                        Title = "Overview",
                        Url = "/",
                        Icon = "LayoutDashboard",
                        SortOrder = 1,
                        MinRoleLevel = 0,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = dashboardGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Control Panel",
                        Url = "/control/containment",
                        Icon = "SlidersHorizontalIcon",
                        SortOrder = 2,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = dashboardGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },

                    // Infrastructure items
                    new MenuItem
                    {
                        Title = "Users",
                        Url = "/management/users",
                        Icon = "Users",
                        SortOrder = 1,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "User Activity",
                        Url = "/management/user-activity",
                        Icon = "Activity",
                        SortOrder = 2,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Containments",
                        Url = "/management/containments",
                        Icon = "Server",
                        SortOrder = 3,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Racks",
                        Url = "/management/racks",
                        Icon = "Computer",
                        SortOrder = 4,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Devices",
                        Url = "/management/devices",
                        Icon = "Database",
                        SortOrder = 5,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Sensors",
                        Url = "/management/sensors",
                        Icon = "Thermometer",
                        SortOrder = 6,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Maintenance",
                        Url = "/management/maintenance",
                        Icon = "Wrench",
                        SortOrder = 7,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "WhatsApp",
                        Url = "/management/whatsapp",
                        Icon = "MessageCircleMore",
                        SortOrder = 8,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infraGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },

                    // Security items (Developer mode required)
                    new MenuItem
                    {
                        Title = "Camera Setup",
                        Url = "/management/camera",
                        Icon = "Video",
                        SortOrder = 1,
                        MinRoleLevel = 2,
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Access Control",
                        Url = "/access-control",
                        Icon = "FileLock",
                        SortOrder = 2,
                        MinRoleLevel = 2,
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },

                    // Analytics items
                    new MenuItem
                    {
                        Title = "Sensor Data",
                        Url = "/reports/sensor-data",
                        Icon = "BarChart3",
                        SortOrder = 1,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = analyticsGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Access Logs",
                        Url = "/reports/access-log",
                        Icon = "DoorClosedLocked",
                        SortOrder = 2,
                        MinRoleLevel = 2,
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = analyticsGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Emergency Logs",
                        Url = "/reports/emergency",
                        Icon = "AlertTriangle",
                        SortOrder = 3,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = analyticsGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Maintenance Reports",
                        Url = "/reports/maintenance",
                        Icon = "FileText",
                        SortOrder = 4,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = analyticsGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },

                    // Configuration items
                    new MenuItem
                    {
                        Title = "Network Settings",
                        Url = "/network",
                        Icon = "Network",
                        SortOrder = 1,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "MQTT Config",
                        Url = "/mqtt",
                        Icon = "Wifi",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Developer+
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "System Settings",
                        Url = "/settings/setting",
                        Icon = "Cog",
                        SortOrder = 3,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "System Info",
                        Url = "/info",
                        Icon = "InfoIcon",
                        SortOrder = 4,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },

                    // Management items (Admin only)
                    new MenuItem
                    {
                        Title = "Menu Management",
                        Url = "/management/menu",
                        Icon = "Menu",
                        SortOrder = 1,
                        MinRoleLevel = 3, // Admin only
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        BadgeText = "Admin",
                        BadgeVariant = "destructive",
                        MenuGroupId = managementGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Developer Dashboard",
                        Url = "/developer",
                        Icon = "Code",
                        SortOrder = 2,
                        MinRoleLevel = 2,
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        BadgeText = "Dev",
                        BadgeVariant = "secondary",
                        MenuGroupId = managementGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.MenuItems.AddRangeAsync(menuItems);
                await context.SaveChangesAsync();

                // Seed Role Permissions
                var userRole = roles.First(r => r.Name == "user");
                var devRole = roles.First(r => r.Name == "developer");
                var adminRole = roles.First(r => r.Name == "admin");

                var menuViewPermission = permissions.First(p => p.Name == "menu.view");
                var userManagePermission = permissions.First(p => p.Name == "user.manage");
                var systemConfigPermission = permissions.First(p => p.Name == "system.configure");
                var devAccessPermission = permissions.First(p => p.Name == "developer.access");
                var adminAccessPermission = permissions.First(p => p.Name == "admin.access");

                var rolePermissions = new List<RolePermission>
                {
                    // User permissions
                    new RolePermission { RoleId = userRole.Id, PermissionId = menuViewPermission.Id, AssignedAt = DateTime.UtcNow },
                    
                    // Developer permissions (inherits user + additional)
                    new RolePermission { RoleId = devRole.Id, PermissionId = menuViewPermission.Id, AssignedAt = DateTime.UtcNow },
                    new RolePermission { RoleId = devRole.Id, PermissionId = devAccessPermission.Id, AssignedAt = DateTime.UtcNow },
                    
                    // Admin permissions (inherits all)
                    new RolePermission { RoleId = adminRole.Id, PermissionId = menuViewPermission.Id, AssignedAt = DateTime.UtcNow },
                    new RolePermission { RoleId = adminRole.Id, PermissionId = userManagePermission.Id, AssignedAt = DateTime.UtcNow },
                    new RolePermission { RoleId = adminRole.Id, PermissionId = systemConfigPermission.Id, AssignedAt = DateTime.UtcNow },
                    new RolePermission { RoleId = adminRole.Id, PermissionId = devAccessPermission.Id, AssignedAt = DateTime.UtcNow },
                    new RolePermission { RoleId = adminRole.Id, PermissionId = adminAccessPermission.Id, AssignedAt = DateTime.UtcNow }
                };

                await context.RolePermissions.AddRangeAsync(rolePermissions);
                await context.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Exception($"Error seeding menu data: {ex.Message}", ex);
            }
        }

        public static async Task AssignUserRolesAsync(AppDbContext context)
        {
            // Assign roles to existing users based on their current role property
            var users = await context.Users.ToListAsync();
            var roles = await context.Roles.ToListAsync();

            foreach (var user in users)
            {
                // Check if user already has a role assigned
                var existingUserRole = await context.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == user.Id && ur.IsActive);

                if (existingUserRole != null)
                    continue; // User already has a role

                // Map old role enum to new role system
                Role? targetRole = user.Role.ToString().ToLower() switch
                {
                    "admin" => roles.FirstOrDefault(r => r.Name == "admin"),
                    "developer" => roles.FirstOrDefault(r => r.Name == "developer"),
                    "user" => roles.FirstOrDefault(r => r.Name == "user"),
                    _ => roles.FirstOrDefault(r => r.Name == "user") // Default to user
                };

                if (targetRole != null)
                {
                    var userRole = new UserRoleAssignment
                    {
                        UserId = user.Id,
                        RoleId = targetRole.Id,
                        AssignedAt = DateTime.UtcNow,
                        IsActive = true
                    };

                    context.UserRoles.Add(userRole);
                }
            }

            await context.SaveChangesAsync();
        }
    }
}