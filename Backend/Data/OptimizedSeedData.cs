using Backend.Models;
using Backend.Enums;
using Backend.Services;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    /// <summary>
    /// Optimized seed data implementation that consolidates all seeding operations
    /// and provides better performance, error handling, and configurability
    /// </summary>
    public static class OptimizedSeedData
    {
        private static readonly Dictionary<string, bool> _seedConfig = new()
        {
            {"Users", true},
            {"Containments", true},
            {"Racks", true},
            {"Devices", true},
            {"ContainmentStatus", true},
            {"Maintenance", true},
            {"CameraConfig", true},
            {"ActivityReports", false},
            {"EmergencyReports", false},
            {"MqttConfiguration", true},
            {"NetworkConfiguration", true},
            {"MenuManagement", true},
            {"AccessLog", false}, // Disabled by default for performance
            {"DeviceSensorData", false} // Disabled by default for performance
        };

        public static async Task InitializeAsync(AppDbContext context, IAuthService authService, ILogger logger, Dictionary<string, bool>? customConfig = null)
        {
            var startTime = DateTime.UtcNow;
            logger.LogInformation("Starting optimized database seeding...");

            try
            {
                // Apply custom configuration if provided
                if (customConfig != null)
                {
                    foreach (var config in customConfig)
                    {
                        if (_seedConfig.ContainsKey(config.Key))
                            _seedConfig[config.Key] = config.Value;
                    }
                }

                await context.Database.EnsureCreatedAsync();

                // Core data seeding (in dependency order)
                var users = await SeedUsersAsync(context, authService, logger);
                var containments = await SeedContainmentsAsync(context, users, logger);
                var racks = await SeedRacksAsync(context, containments, users, logger);
                await SeedDevicesAsync(context, racks, users, logger);

                // System configuration seeding
                await SeedContainmentStatusAsync(context, containments, logger);
                await SeedMaintenanceAsync(context, users, containments, racks, logger);
                await SeedCameraConfigAsync(context, logger);
                await SeedMqttConfigurationAsync(context, users, logger);
                await SeedNetworkConfigurationAsync(context, users, logger);

                // Menu management seeding (consolidated)
                await SeedOptimizedMenuManagementAsync(context, logger);

                // Activity and reporting seeding
                await SeedActivityReportsAsync(context, users, logger);
                await SeedEmergencyReportsAsync(context, logger);

                // Optional data seeding (performance intensive)
                if (_seedConfig["AccessLog"])
                    await SeedAccessLogAsync(context, users, logger);

                if (_seedConfig["DeviceSensorData"])
                    await SeedDeviceSensorDataAsync(context, logger);

                var duration = DateTime.UtcNow - startTime;
                logger.LogInformation($"Optimized database seeding completed successfully in {duration.TotalSeconds:F2} seconds");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred during optimized database seeding");
                throw;
            }
        }

        private static async Task<List<User>> SeedUsersAsync(AppDbContext context, IAuthService authService, ILogger logger)
        {
            if (!_seedConfig["Users"] || await context.Users.AnyAsync())
            {
                return await context.Users.ToListAsync();
            }

            logger.LogInformation("Seeding users...");

            var users = new List<User>
            {
                new User
                {
                    Name = "System Administrator",
                    Email = "admin@gmail.com",
                    PhoneNumber = "+1234567890",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.Admin,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new User
                {
                    Name = "Lead Developer",
                    Email = "developer@gmail.com",
                    PhoneNumber = "+1234567891",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.Developer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new User
                {
                    Name = "Operations User",
                    Email = "user@gmail.com",
                    PhoneNumber = "+1234567892",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.User,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new User
                {
                    Name = "Demo User",
                    Email = "demo@gmail.com",
                    PhoneNumber = "+1234567893",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.User,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {users.Count} users");
            return users;
        }

        private static async Task<List<Containment>> SeedContainmentsAsync(AppDbContext context, List<User> users, ILogger logger)
        {
            if (!_seedConfig["Containments"] || await context.Containments.AnyAsync())
            {
                return await context.Containments.ToListAsync();
            }

            logger.LogInformation("Seeding containments...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var containments = new List<Containment>
            {
                new Containment
                {
                    Name = "Data Center",
                    Type = ContainmentType.HotAisleContainment,
                    Description = "Main production data center with hot aisle containment for optimal cooling efficiency",
                    Location = "Building A - Floor 1 - Room DC-01",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
            };

            await context.Containments.AddRangeAsync(containments);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {containments.Count} containments");
            return containments;
        }

        private static async Task<List<Rack>> SeedRacksAsync(AppDbContext context, List<Containment> containments, List<User> users, ILogger logger)
        {
            if (!_seedConfig["Racks"] || await context.Racks.AnyAsync())
            {
                return await context.Racks.ToListAsync();
            }

            logger.LogInformation("Seeding racks...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var racks = new List<Rack>();

            // Generate racks for each containment
            for (int i = 0; i < containments.Count; i++)
            {
                var containment = containments[i];
                var rackPrefix = containment.Name == "Primary Data Center" ? "PDC" : "SDC";

                for (int j = 1; j <= 8; j++) // 6 racks per containment
                {
                    racks.Add(new Rack
                    {
                        Name = $"Rack {rackPrefix}-R{j:D2}",
                        ContainmentId = containment.Id,
                        Description = $"{rackPrefix} Rack {j:D2} - {GetRackPurpose(j)}",
                        CreatedBy = adminUser.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            await context.Racks.AddRangeAsync(racks);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {racks.Count} racks across {containments.Count} containments");
            return racks;
        }

        private static string GetRackPurpose(int rackNumber)
        {
            return rackNumber switch
            {
                1 => "Network Infrastructure (Switches, Routers)",
                2 => "Application Servers (Web, API)",
                3 => "Database Servers (Primary, Secondary)",
                4 => "Storage Systems (SAN, NAS)",
                5 => "Monitoring & Security Systems",
                6 => "Backup & Recovery Systems",
                _ => "General Purpose"
            };
        }

        private static async Task SeedDevicesAsync(AppDbContext context, List<Rack> racks, List<User> users, ILogger logger)
    {
        if (!_seedConfig["Devices"] || await context.Devices.AnyAsync())
        {
            return;
        }

        logger.LogInformation("Seeding devices...");

        var adminUser = users.First(u => u.Role == UserRole.Admin);
        var devices = new List<Device>();
        
        var sensorTypes = new List<string> { "Temperature", "Dust", "AirFlow", "Vibration" };

        foreach (var rack in racks)
        {
            int deviceCounter = 0;
            foreach (var sensorType in sensorTypes)
            {
                deviceCounter++;
                devices.Add(new Device
                {
                    Name = $"{sensorType} Sensor {rack.Name}",
                    Type = "Sensor",
                    RackId = rack.Id,
                    Description = $"Sensor for {rack.Name}",
                    SerialNumber = $"{sensorType.ToUpper()}-{devices.Count + 1:D3}",
                    Status = "Active",
                    Topic = $"Containment/Sensor/{sensorType}_{rack.Id}",
                    SensorType = sensorType,
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }
        }

        await context.Devices.AddRangeAsync(devices);
        await context.SaveChangesAsync();

        logger.LogInformation($"Seeded {devices.Count} devices");
    }

        private static async Task SeedOptimizedMenuManagementAsync(AppDbContext context, ILogger logger)
        {
            if (!_seedConfig["MenuManagement"])
                return;

            logger.LogInformation("Seeding optimized menu management data...");

            // Check if menu data already exists  
            if (await context.MenuGroups.AnyAsync() && await context.MenuItems.AnyAsync())
            {
                logger.LogInformation("Menu management data already exists, skipping...");
                return;
            }

            using var transaction = await context.Database.BeginTransactionAsync();
            try
            {
                // Seed Roles
                var roles = new List<Role>
                {
                    new Role
                    {
                        Name = "user", DisplayName = "User", Description = "Standard user with basic access",
                        Level = 1, Color = "text-green-600 bg-green-100", IsActive = true, CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "admin", DisplayName = "Administrator", Description = "Administrator with full access",
                        Level = 2, Color = "text-red-600 bg-red-100", IsActive = true, CreatedAt = DateTime.UtcNow
                    },
                    new Role
                    {
                        Name = "developer", DisplayName = "Developer", Description = "Developer with advanced access",
                        Level = 3, Color = "text-blue-600 bg-blue-100", IsActive = true, CreatedAt = DateTime.UtcNow
                    }
                };

                await context.Roles.AddRangeAsync(roles);
                await context.SaveChangesAsync();

                // Seed Menu Groups
                var menuGroups = new List<MenuGroup>
                {
                    new MenuGroup { Title = "Dashboard", Icon = "LayoutDashboard", SortOrder = 1, MinRoleLevel = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new MenuGroup { Title = "Infrastructure", Icon = "Server", SortOrder = 2, MinRoleLevel = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new MenuGroup { Title = "Security", Icon = "Shield", SortOrder = 3, MinRoleLevel = 2, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new MenuGroup { Title = "Analytics", Icon = "BarChart3", SortOrder = 4, MinRoleLevel = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new MenuGroup { Title = "Configuration", Icon = "Settings", SortOrder = 5, MinRoleLevel = 2, IsActive = true, CreatedAt = DateTime.UtcNow },
                    new MenuGroup { Title = "Management", Icon = "Menu", SortOrder = 6, MinRoleLevel = 2, IsActive = true, CreatedAt = DateTime.UtcNow }
                };

                await context.MenuGroups.AddRangeAsync(menuGroups);
                await context.SaveChangesAsync();

                // Seed Menu Items
                var menuItems = new List<MenuItem>
                {
                    // Dashboard items
                    new MenuItem { Title = "Overview", Url = "/dashboard-overview", Icon = "Home", SortOrder = 1, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[0].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Control Panel", Url = "/control/containment", Icon = "Sliders", SortOrder = 2, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[0].Id, CreatedAt = DateTime.UtcNow },

                    // Infrastructure items  
                    new MenuItem { Title = "Users", Url = "/management/users", Icon = "Users", SortOrder = 1, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Containments", Url = "/management/containments", Icon = "Server", SortOrder = 2, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Racks", Url = "/management/racks", Icon = "Computer", SortOrder = 3, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Devices", Url = "/management/devices", Icon = "HardDrive", SortOrder = 4, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },
                    // new MenuItem { Title = "Capacity", Url = "/management/capacity", Icon = "BarChart3", SortOrder = 5, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Maintenance", Url = "/management/maintenance", Icon = "Wrench", SortOrder = 6, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[1].Id, CreatedAt = DateTime.UtcNow },

                    // Security items
// Assuming menuGroups[3] is for "Access Control"
new MenuItem { 
    Title = "Overview", 
    Url = "/access-control", 
    Icon = "Layout", 
    SortOrder = 1, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, 
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},
new MenuItem { 
    Title = "User Management", 
    Url = "/access-control/user", 
    Icon = "Users", 
    SortOrder = 2, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, 
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},

new MenuItem { 
    Title = "Device Management", 
    Url = "/access-control/device", 
    Icon = "Monitor", 
    SortOrder = 3, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, 
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},

new MenuItem { 
    Title = "Access Log", 
    Url = "/access-control/attendance", 
    Icon = "FileText", 
    SortOrder = 4, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, 
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},

new MenuItem { 
    Title = "Access Configuration", 
    Url = "/access-control/configuration", 
    Icon = "Bolt", 
    SortOrder = 5, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, 
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},

new MenuItem { 
    Title = "Camera Setup", 
    Url = "/management/camera", 
    Icon = "Video", 
    SortOrder = 6, 
    MinRoleLevel = 2, 
    RequiresDeveloperMode = false, // MODIFIED to false
    IsActive = true, 
    MenuGroupId = menuGroups[2].Id, 
    CreatedAt = DateTime.UtcNow 
},

                    // Analytics items
                    new MenuItem { Title = "Sensor Data", Url = "/reports/sensor-data", Icon = "BarChart3", SortOrder = 1, MinRoleLevel = 1, IsActive = true, MenuGroupId = menuGroups[3].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Access Logs", Url = "/reports/access-log", Icon = "FileText", SortOrder = 2, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[3].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Emergency Reports", Url = "/reports/emergency", Icon = "AlertTriangle", SortOrder = 3, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[3].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Maintenance Reports", Url = "/reports/maintenance", Icon = "TableOfContent", SortOrder = 4, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[3].Id, CreatedAt = DateTime.UtcNow },

                     // Configuration items
                    new MenuItem { Title = "Network Settings", Url = "/network", Icon = "Wifi", SortOrder = 1, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "MQTT Config", Url = "/mqtt", Icon = "Radio", SortOrder = 2, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Sensor Intervals", Url = "/configuration/sensor-intervals", Icon = "Clock", SortOrder = 3, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "Controller Config", Url = "/configuration/controller", Icon = "Cpu", SortOrder = 4, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "System Settings", Url = "/settings/setting", Icon = "Settings", SortOrder = 5, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    new MenuItem { Title = "System Info", Url = "/info", Icon = "Info", SortOrder = 6, MinRoleLevel = 2, IsActive = true, MenuGroupId = menuGroups[4].Id, CreatedAt = DateTime.UtcNow },
                    // Management items
                    new MenuItem { Title = "Menu Management", Url = "/management/menu", Icon = "AppWindow", SortOrder = 1, MinRoleLevel = 2, IsActive = true, BadgeText = "Admin", BadgeVariant = "destructive", MenuGroupId = menuGroups[5].Id, CreatedAt = DateTime.UtcNow }
                };

                await context.MenuItems.AddRangeAsync(menuItems);
                await context.SaveChangesAsync();

                await transaction.CommitAsync();
                logger.LogInformation($"Seeded {roles.Count} roles, {menuGroups.Count} menu groups, and {menuItems.Count} menu items");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                logger.LogError(ex, "Error seeding menu management data");
                throw;
            }
        }

        private static async Task SeedContainmentStatusAsync(AppDbContext context, List<Containment> containments, ILogger logger)
        {
            if (!_seedConfig["ContainmentStatus"] || await context.ContainmentStatuses.AnyAsync())
                return;

            logger.LogInformation("Seeding containment statuses...");

            var statuses = containments.Select(c => new ContainmentStatus
            {
                ContainmentId = c.Id,
                LightingStatus = false,
                EmergencyStatus = false,
                SmokeDetectorStatus = false,
                FssStatus = false,
                EmergencyButtonState = false,
                SelenoidStatus = false,
                LimitSwitchFrontDoorStatus = false,
                LimitSwitchBackDoorStatus = false,
                OpenFrontDoorStatus = false,
                OpenBackDoorStatus = false,
                EmergencyTemp = false,
                MqttTimestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                RawPayload = "{\"status\":\"initialized\",\"message\":\"Default status created during optimized seeding\"}"
            }).ToList();

            await context.ContainmentStatuses.AddRangeAsync(statuses);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {statuses.Count} containment statuses");
        }

        private static async Task SeedMaintenanceAsync(AppDbContext context, List<User> users, List<Containment> containments, List<Rack> racks, ILogger logger)
        {
            if (!_seedConfig["Maintenance"] || await context.Maintenances.AnyAsync())
                return;

            logger.LogInformation("Seeding maintenance records...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);

            var maintenances = new List<Maintenance>
            {
                new Maintenance
                {
                    Name = "Quarterly System Health Check",
                    Description = "Comprehensive quarterly health assessment of all data center systems",
                    StartTask = DateTime.UtcNow.AddDays(7),
                    EndTask = DateTime.UtcNow.AddDays(8),
                    AssignTo = devUser.Id,
                    TargetType = MaintenanceTarget.Containment,
                    TargetId = containments[0].Id,
                    Status = "Scheduled",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Maintenance
                {
                    Name = "Power Distribution Unit Inspection",
                    Description = "Monthly PDU inspection and testing for primary data center rack",
                    StartTask = DateTime.UtcNow.AddDays(-1),
                    EndTask = DateTime.UtcNow,
                    AssignTo = adminUser.Id,
                    TargetType = MaintenanceTarget.Rack,
                    TargetId = racks[0].Id,
                    Status = "Completed",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            await context.Maintenances.AddRangeAsync(maintenances);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {maintenances.Count} maintenance records");
        }

        private static async Task SeedCameraConfigAsync(AppDbContext context, ILogger logger)
        {
            if (!_seedConfig["CameraConfig"] || await context.CameraConfigs.AnyAsync())
                return;

            logger.LogInformation("Seeding camera configurations...");

            var cameras = new List<CameraConfig>
            {
                new CameraConfig
                {
                    Name = "Data Center Main Entrance",
                    IpAddress = "192.168.1.200",
                    Port = 8080,
                    ApiKey = "dc_main_entrance_key_2024",
                    Group = "datacenter_security",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CameraConfig
                {
                    Name = "Server Room Overview",
                    IpAddress = "192.168.1.201",
                    Port = 8080,
                    ApiKey = "server_room_overview_key_2024",
                    Group = "datacenter_security",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await context.CameraConfigs.AddRangeAsync(cameras);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {cameras.Count} camera configurations");
        }

        private static async Task SeedActivityReportsAsync(AppDbContext context, List<User> users, ILogger logger)
        {
            if (!_seedConfig["ActivityReports"] || await context.ActivityReports.AnyAsync())
                return;

            logger.LogInformation("Seeding activity reports...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var activities = new List<ActivityReport>
            {
                new ActivityReport
                {
                    Description = "Optimized database seeding completed",
                    Timestamp = DateTime.UtcNow,
                    Status = "Success",
                    Trigger = "System Initialization",
                    UserId = adminUser.Id,
                    AdditionalData = "All systems initialized successfully"
                },
                new ActivityReport
                {
                    Description = "Data center monitoring systems online",
                    Timestamp = DateTime.UtcNow.AddMinutes(-5),
                    Status = "Success",
                    Trigger = "System Startup",
                    UserId = adminUser.Id,
                    AdditionalData = "All monitoring services operational"
                }
            };

            await context.ActivityReports.AddRangeAsync(activities);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {activities.Count} activity reports");
        }

        private static async Task SeedEmergencyReportsAsync(AppDbContext context, ILogger logger)
        {
            if (!_seedConfig["EmergencyReports"] || await context.EmergencyReports.AnyAsync())
                return;

            logger.LogInformation("Seeding emergency reports...");

            var emergencyReports = new List<EmergencyReport>
            {
                new EmergencyReport
                {
                    EmergencyType = "Temperature Alert",
                    Status = false,
                    StartTime = DateTime.UtcNow.AddDays(-1),
                    EndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(15),
                    Duration = TimeSpan.FromMinutes(15),
                    IsActive = false,
                    Notes = "Resolved: Temporary temperature spike due to cooling system maintenance",
                    RawMqttPayload = "{\"type\":\"temperature_alert\",\"sensor\":\"temp_01\",\"value\":32.5,\"threshold\":30.0}",
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(15)
                }
            };

            await context.EmergencyReports.AddRangeAsync(emergencyReports);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {emergencyReports.Count} emergency reports");
        }

        private static async Task SeedMqttConfigurationAsync(AppDbContext context, List<User> users, ILogger logger)
        {
            if (!_seedConfig["MqttConfiguration"] || await context.MqttConfigurations.AnyAsync())
                return;

            logger.LogInformation("Seeding MQTT configurations...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var mqttConfigs = new List<MqttConfiguration>
            {
                new MqttConfiguration
                {
                    IsEnabled = true,
                    UseEnvironmentConfig = false,
                    BrokerHost = "192.168.0.138",
                    BrokerPort = 1883,
                    Username = "",
                    Password = "",
                    ClientId = "DataCenter_Monitoring_System",
                    UseSsl = false,
                    KeepAliveInterval = 60,
                    ReconnectDelay = 5,
                    TopicPrefix = "datacenter",
                    Description = "Primary MQTT broker for local data center monitoring",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            await context.MqttConfigurations.AddRangeAsync(mqttConfigs);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {mqttConfigs.Count} MQTT configurations");
        }

        private static async Task SeedNetworkConfigurationAsync(AppDbContext context, List<User> users, ILogger logger)
        {
            if (!_seedConfig["NetworkConfiguration"] || await context.NetworkConfigurations.AnyAsync())
                return;

            logger.LogInformation("Seeding network configurations...");

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var networkConfigs = new List<NetworkConfiguration>
            {
                new NetworkConfiguration
                {
                    InterfaceType = NetworkInterfaceType.ETH0,
                    ConfigMethod = NetworkConfigMethod.Static,
                    IpAddress = "192.168.1.100",
                    SubnetMask = "255.255.255.0",
                    Gateway = "192.168.1.1",
                    PrimaryDns = "1.1.1.1",
                    SecondaryDns = "8.8.8.8",
                    Metric = "100",
                    IsActive = true,
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await context.NetworkConfigurations.AddRangeAsync(networkConfigs);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {networkConfigs.Count} network configurations");
        }

        private static async Task SeedAccessLogAsync(AppDbContext context, List<User> users, ILogger logger)
        {
            if (!_seedConfig["AccessLog"] || await context.AccessLogs.AnyAsync())
                return;

            logger.LogInformation("Seeding access logs (performance intensive)...");

            var random = new Random();
            var accessLogs = new List<AccessLog>();

            // Generate only essential access logs for demo
            for (int i = 0; i < 10; i++) // Reduced from original bulk generation
            {
                var user = users[random.Next(users.Count)];
                accessLogs.Add(new AccessLog
                {
                    User = user.Name,
                    Via = (AccessMethod)random.Next(1, 7),
                    Trigger = "System Access",
                    Timestamp = DateTime.UtcNow.AddMinutes(-random.Next(60)),
                    AdditionalData = "{}",
                    Description = "User authentication",
                    IsSuccess = true
                });
            }

            await context.AccessLogs.AddRangeAsync(accessLogs);
            await context.SaveChangesAsync();

            logger.LogInformation($"Seeded {accessLogs.Count} access logs");
        }

        private static async Task SeedDeviceSensorDataAsync(AppDbContext context, ILogger logger)
        {
            if (!_seedConfig["DeviceSensorData"] || await context.DeviceSensorData.AnyAsync())
                return;

            logger.LogInformation("Seeding device sensor data (performance intensive)...");

            var devices = await context.Devices.Where(d => d.Type.ToLower() == "sensor").ToListAsync();
            if (!devices.Any()) return;

            var random = new Random();
            var sensorDataList = new List<DeviceSensorData>();

            // Generate sensor data for last 24 hours only (reduced scope)
            var startDate = DateTime.UtcNow.AddHours(-24);
            var endDate = DateTime.UtcNow;

            foreach (var device in devices.Take(5)) // Limit to first 5 devices
            {
                for (var date = startDate; date <= endDate; date = date.AddHours(1)) // Hourly instead of 15 minutes
                {
                    var temp = Math.Round(20 + random.NextDouble() * 10, 1);
                    var humidity = Math.Round(45 + random.NextDouble() * 35, 1);

                    sensorDataList.Add(new DeviceSensorData
                    {
                        DeviceId = device.Id,
                        RackId = device.RackId,
                        ContainmentId = device.Rack?.ContainmentId ?? 1,
                        Topic = device.Topic ?? $"datacenter/sensors/{device.Id}",
                        Timestamp = date,
                        ReceivedAt = date.AddSeconds(random.Next(1, 5)),
                        RawPayload = $"{{\"temp\": {temp}, \"hum\": {humidity}, \"sensor_id\": \"{device.Name}\"}}",
                        SensorType = device.SensorType ?? "Temperature"
                    });
                }
            }

            // Batch insert
            const int batchSize = 50;
            for (int i = 0; i < sensorDataList.Count; i += batchSize)
            {
                var batch = sensorDataList.Skip(i).Take(batchSize);
                await context.DeviceSensorData.AddRangeAsync(batch);
                await context.SaveChangesAsync();
            }

            logger.LogInformation($"Seeded {sensorDataList.Count} sensor data records");
        }

        /// <summary>
        /// Get current seed configuration
        /// </summary>
        public static Dictionary<string, bool> GetSeedConfiguration()
        {
            return new Dictionary<string, bool>(_seedConfig);
        }

        /// <summary>
        /// Update seed configuration
        /// </summary>
        public static void UpdateSeedConfiguration(Dictionary<string, bool> newConfig)
        {
            foreach (var config in newConfig)
            {
                if (_seedConfig.ContainsKey(config.Key))
                    _seedConfig[config.Key] = config.Value;
            }
        }
    }
}