using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    public static class DynamicMenuSeedData
    {
        public static async Task SeedDynamicMenuAsync(AppDbContext context)
        {
            try
            {
                // Check if we already have menu data
                if (await context.MenuGroups.AnyAsync())
                {
                    Console.WriteLine("Dynamic menu data already exists, skipping seed...");
                    return;
                }

                Console.WriteLine("Seeding dynamic menu data...");

                // Create Menu Groups and Items based on existing navigation structure
                var menuGroups = new List<MenuGroup>();

                // 1. Dashboard Group
                var dashboardGroup = new MenuGroup
                {
                    Title = "Dashboard",
                    Icon = "LayoutDashboard",
                    SortOrder = 1,
                    MinRoleLevel = 1, // User and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(dashboardGroup);

                // 2. Infrastructure Group  
                var infrastructureGroup = new MenuGroup
                {
                    Title = "Infrastructure",
                    Icon = "Server",
                    SortOrder = 2,
                    MinRoleLevel = 1, // User and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(infrastructureGroup);

                // 3. Security Group
                var securityGroup = new MenuGroup
                {
                    Title = "Security",
                    Icon = "Shield",
                    SortOrder = 3,
                    MinRoleLevel = 1, // User and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(securityGroup);

                // 4. Analytics Group
                var analyticsGroup = new MenuGroup
                {
                    Title = "Analytics",
                    Icon = "BarChart3",
                    SortOrder = 4,
                    MinRoleLevel = 1, // User and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(analyticsGroup);

                // 5. Security & Access Group (requires higher permissions)
                var securityAccessGroup = new MenuGroup
                {
                    Title = "Security & Access",
                    Icon = "ShieldCheck",
                    SortOrder = 5,
                    MinRoleLevel = 2, // Admin and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(securityAccessGroup);

                // 6. Configuration Group
                var configGroup = new MenuGroup
                {
                    Title = "Configuration",
                    Icon = "Settings",
                    SortOrder = 6,
                    MinRoleLevel = 2, // Admin and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(configGroup);

                // 7. Menu Management Group (for admin)
                var menuManagementGroup = new MenuGroup
                {
                    Title = "Management",
                    Icon = "Menu",
                    SortOrder = 7,
                    MinRoleLevel = 2, // Admin and above
                    IsActive = true,
                    RequiresDeveloperMode = false,
                    CreatedAt = DateTime.UtcNow
                };
                menuGroups.Add(menuManagementGroup);

                // Add all groups to context
                await context.MenuGroups.AddRangeAsync(menuGroups);
                await context.SaveChangesAsync();

                // Now create menu items for each group
                var menuItems = new List<MenuItem>();

                // Dashboard Items
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Overview",
                        Url = "/",
                        Icon = "Home",
                        SortOrder = 1,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = dashboardGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Control Panel",
                        Url = "/control/containment",
                        Icon = "SlidersHorizontal",
                        SortOrder = 2,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = dashboardGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                });

                // Infrastructure Items
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Users",
                        Url = "/management/users",
                        Icon = "Users",
                        SortOrder = 1,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infrastructureGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "User Activity",
                        Url = "/management/user-activity",
                        Icon = "Activity",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infrastructureGroup.Id,
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
                        MenuGroupId = infrastructureGroup.Id,
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
                        MenuGroupId = infrastructureGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Devices",
                        Url = "/management/devices",
                        Icon = "HardDrive",
                        SortOrder = 5,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infrastructureGroup.Id,
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
                        MenuGroupId = infrastructureGroup.Id,
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
                        MenuGroupId = infrastructureGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "WhatsApp",
                        Url = "/management/whatsapp",
                        Icon = "MessageCircle",
                        SortOrder = 8,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = infrastructureGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                });

                // Security Items
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Camera Setup",
                        Url = "/management/camera",
                        Icon = "Video",
                        SortOrder = 1,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = securityGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Access Control",
                        Url = "/access-control",
                        Icon = "Lock",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = true, // Requires developer mode
                        MenuGroupId = securityGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                });

                // Analytics Items
                menuItems.AddRange(new[]
                {
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
                        Icon = "FileText",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = analyticsGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Emergency Logs",
                        Url = "/reports/emergency",
                        Icon = "AlertTriangle",
                        SortOrder = 3,
                        MinRoleLevel = 2, // Admin and above
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
                    }
                });

                // Security & Access Items (High-level admin features)
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Access Overview",
                        Url = "/access-control",
                        Icon = "Shield",
                        SortOrder = 1,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityAccessGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Access Devices",
                        Url = "/access-control/devices",
                        Icon = "Smartphone",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityAccessGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Access Users",
                        Url = "/access-control/users",
                        Icon = "UserCheck",
                        SortOrder = 3,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityAccessGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "Live Access Monitor",
                        Url = "/access-control/monitoring",
                        Icon = "Eye",
                        SortOrder = 4,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = true,
                        MenuGroupId = securityAccessGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                });

                // Configuration Items
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Network Settings",
                        Url = "/network",
                        Icon = "Wifi",
                        SortOrder = 1,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "MQTT Config",
                        Url = "/mqtt",
                        Icon = "Radio",
                        SortOrder = 2,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "System Settings",
                        Url = "/settings/setting",
                        Icon = "Settings",
                        SortOrder = 3,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    },
                    new MenuItem
                    {
                        Title = "System Info",
                        Url = "/info",
                        Icon = "Info",
                        SortOrder = 4,
                        MinRoleLevel = 1,
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = configGroup.Id,
                        CreatedAt = DateTime.UtcNow
                    }
                });

                // Menu Management Items (Admin features)
                menuItems.AddRange(new[]
                {
                    new MenuItem
                    {
                        Title = "Menu Management",
                        Url = "/management/menu",
                        Icon = "Menu",
                        SortOrder = 1,
                        MinRoleLevel = 2, // Admin and above
                        IsActive = true,
                        RequiresDeveloperMode = false,
                        MenuGroupId = menuManagementGroup.Id,
                        CreatedAt = DateTime.UtcNow,
                        BadgeText = "Admin",
                        BadgeVariant = "destructive"
                    }
                });

                // Add all menu items
                await context.MenuItems.AddRangeAsync(menuItems);
                await context.SaveChangesAsync();

                Console.WriteLine($"Successfully seeded {menuGroups.Count} menu groups and {menuItems.Count} menu items");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error seeding dynamic menu data: {ex.Message}");
                throw;
            }
        }
    }
}