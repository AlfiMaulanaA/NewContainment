using Backend.Models;
using Backend.Enums;
using Backend.Services;
using Microsoft.Extensions.Logging;

namespace Backend.Data
{
    public static class SeedData
    {
        public static async Task InitializeAsync(AppDbContext context, IAuthService authService, ILogger logger)
        {
            try
            {
                context.Database.EnsureCreated();

                // Seed Users
                var users = await SeedUsersAsync(context, authService);

                // Seed Containments
                var containments = await SeedContainmentsAsync(context, users);

                // Seed Racks
                var racks = await SeedRacksAsync(context, containments, users);

                // Seed Devices
                await SeedDevicesAsync(context, racks, users);

                // Seed Default ContainmentStatus
                await SeedContainmentStatusAsync(context, containments);

                // Seed Maintenance
                await SeedMaintenanceAsync(context, users, containments, racks);

                // Seed CCTV Cameras
                await SeedCctvCamerasAsync(context, containments);

                // Seed ActivityReports
                await SeedActivityReportsAsync(context, users);

                // Seed EmergencyReports
                // await SeedEmergencyReportsAsync(context);

                // Seed MqttConfiguration
                await SeedMqttConfigurationAsync(context, users);


                logger.LogInformation("Database seeding completed successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database");
                throw;
            }
        }

        private static async Task<List<User>> SeedUsersAsync(AppDbContext context, IAuthService authService)
        {
            if (context.Users.Any())
            {
                return context.Users.ToList();
            }

            var users = new List<User>
            {
                new User
                {
                    Name = "Admin",
                    Email = "admin@gmail.com",
                    PhoneNumber = "123456789",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.Admin,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new User
                {
                    Name = "John Developer",
                    Email = "dev@gmail.com",
                    PhoneNumber = "987654321",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.Developer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new User
                {
                    Name = "Jane User",
                    Email = "user@admin.com",
                    PhoneNumber = "555123456",
                    PasswordHash = authService.HashPassword("password123"),
                    Role = UserRole.User,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            context.Users.AddRange(users);
            await context.SaveChangesAsync();

            return users;
        }

        private static async Task<List<Containment>> SeedContainmentsAsync(AppDbContext context, List<User> users)
        {
            if (context.Containments.Any())
            {
                return context.Containments.ToList();
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);

            var containments = new List<Containment>
            {
                new Containment
                {
                    Name = "Data Center A",
                    Type = ContainmentType.HotAisleContainment,
                    Description = "Primary data center containment for high availability servers and network equipment",
                    Location = "Building A, Floor 1, Room 101",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            context.Containments.AddRange(containments);
            await context.SaveChangesAsync();

            return containments;
        }

        private static async Task<List<Rack>> SeedRacksAsync(AppDbContext context, List<Containment> containments, List<User> users)
        {
            if (context.Racks.Any())
            {
                return context.Racks.ToList();
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);

            var racks = new List<Rack>
            {
                new Rack
                {
                    Name = "Rack A-01",
                    ContainmentId = containments[0].Id, // Data Center A
                    Description = "Primary server rack for web applications",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Rack
                {
                    Name = "Rack A-02",
                    ContainmentId = containments[0].Id, // Data Center A
                    Description = "Database server rack",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Rack
                {
                    Name = "Rack A-03",
                    ContainmentId = containments[0].Id, // Data Center A
                    Description = "Storage and backup servers",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Rack
                {
                    Name = "Rack A-04",
                    ContainmentId = containments[0].Id, // Data Center A
                    Description = "Network switches and routers",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            context.Racks.AddRange(racks);
            await context.SaveChangesAsync();

            return racks;
        }

        private static async Task SeedDevicesAsync(AppDbContext context, List<Rack> racks, List<User> users)
        {
            if (context.Devices.Any())
            {
                return;
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);

            var devices = new List<Device>
            {
                // Devices in Rack A-01 (Web Applications)
                new Device
                {
                    Name = "Web Server 01",
                    Type = "Server",
                    RackId = racks[0].Id,
                    Description = "Primary web application server",
                    SerialNumber = "SRV-WEB-001",
                    Status = "Active",
                    Topic = "server/web/01",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "Web Server 02",
                    Type = "Server",
                    RackId = racks[0].Id,
                    Description = "Secondary web application server",
                    SerialNumber = "SRV-WEB-002",
                    Status = "Active",
                    Topic = "server/web/02",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "UPS Unit A01",
                    Type = "UPS",
                    RackId = racks[0].Id,
                    Description = "Uninterruptible power supply for rack A-01",
                    SerialNumber = "UPS-A01-001",
                    Status = "Active",
                    Topic = "power/ups/a01",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },

                // Devices in Rack A-02 (Database)
                new Device
                {
                    Name = "Database Server 01",
                    Type = "Server",
                    RackId = racks[1].Id,
                    Description = "Primary MySQL database server",
                    SerialNumber = "SRV-DB-001",
                    Status = "Active",
                    Topic = "server/database/01",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "Database Server 02",
                    Type = "Server",
                    RackId = racks[1].Id,
                    Description = "Secondary database server for replication",
                    SerialNumber = "SRV-DB-002",
                    Status = "Active",
                    Topic = "server/database/02",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },

                // Devices in Rack A-03 (Storage)
                new Device
                {
                    Name = "Storage Array 01",
                    Type = "Storage",
                    RackId = racks[2].Id,
                    Description = "High-capacity storage array",
                    SerialNumber = "STO-ARR-001",
                    Status = "Active",
                    Topic = "storage/array/01",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "Backup Server",
                    Type = "Server",
                    RackId = racks[2].Id,
                    Description = "Automated backup and recovery server",
                    SerialNumber = "SRV-BAK-001",
                    Status = "Active",
                    Topic = "server/backup/01",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },

                // Devices in Rack A-04 (Network)
                new Device
                {
                    Name = "Core Switch 01",
                    Type = "Switch",
                    RackId = racks[3].Id,
                    Description = "48-port gigabit core network switch",
                    SerialNumber = "SW-CORE-001",
                    Status = "Active",
                    Topic = "network/switch/core01",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "Router 01",
                    Type = "Router",
                    RackId = racks[3].Id,
                    Description = "Main internet gateway router",
                    SerialNumber = "RTR-MAIN-001",
                    Status = "Active",
                    Topic = "network/router/main01",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Device
                {
                    Name = "Firewall 01",
                    Type = "Firewall",
                    RackId = racks[3].Id,
                    Description = "Network security firewall appliance",
                    SerialNumber = "FW-SEC-001",
                    Status = "Active",
                    Topic = "network/firewall/sec01",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                }
            };

            context.Devices.AddRange(devices);
            await context.SaveChangesAsync();
        }

        private static async Task SeedContainmentStatusAsync(AppDbContext context, List<Containment> containments)
        {
            if (context.ContainmentStatuses.Any())
            {
                return;
            }

            var containmentStatuses = new List<ContainmentStatus>();

            foreach (var containment in containments)
            {
                var status = new ContainmentStatus
                {
                    ContainmentId = containment.Id,
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
                    RawPayload = "{\"status\":\"initialized\",\"message\":\"Default status created during seeding\"}"
                };

                containmentStatuses.Add(status);
            }

            context.ContainmentStatuses.AddRange(containmentStatuses);
            await context.SaveChangesAsync();
        }

        private static async Task SeedMaintenanceAsync(AppDbContext context, List<User> users, List<Containment> containments, List<Rack> racks)
        {
            if (context.Maintenances.Any())
            {
                return;
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);
            var normalUser = users.First(u => u.Role == UserRole.User);

            // Get devices for device maintenance
            var devices = context.Devices.ToList();

            var maintenances = new List<Maintenance>
            {
                new Maintenance
                {
                    Name = "Monthly Server Health Check",
                    Description = "Comprehensive health check for all servers in the data center",
                    StartTask = DateTime.UtcNow.AddDays(1),
                    EndTask = DateTime.UtcNow.AddDays(2),
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
                    Name = "Rack A-01 Power System Inspection",
                    Description = "Inspect UPS units and power distribution in rack A-01",
                    StartTask = DateTime.UtcNow.AddDays(3),
                    EndTask = DateTime.UtcNow.AddDays(3).AddHours(4),
                    AssignTo = normalUser.Id,
                    TargetType = MaintenanceTarget.Rack,
                    TargetId = racks[0].Id,
                    Status = "Scheduled",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Maintenance
                {
                    Name = "Device Firmware Update",
                    Description = "Update firmware for web server device",
                    StartTask = DateTime.UtcNow.AddDays(-2),
                    EndTask = DateTime.UtcNow.AddDays(-1),
                    AssignTo = devUser.Id,
                    TargetType = MaintenanceTarget.Device,
                    TargetId = devices.Count > 0 ? devices[0].Id : racks[0].Id,
                    Status = "Completed",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1),
                    IsActive = true
                }
            };

            context.Maintenances.AddRange(maintenances);
            await context.SaveChangesAsync();
        }

        private static async Task SeedActivityReportsAsync(AppDbContext context, List<User> users)
        {
            if (context.ActivityReports.Any())
            {
                return;
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);
            var devUser = users.First(u => u.Role == UserRole.Developer);

            var activityReports = new List<ActivityReport>
            {
                new ActivityReport
                {
                    Description = "System startup completed successfully",
                    Timestamp = DateTime.UtcNow.AddHours(-2),
                    Status = "Success",
                    Trigger = "System",
                    UserId = adminUser.Id,
                    AdditionalData = "All systems operational"
                },
                new ActivityReport
                {
                    Description = "New user created: Jane User",
                    Timestamp = DateTime.UtcNow.AddHours(-1),
                    Status = "Success",
                    Trigger = "User Management",
                    UserId = adminUser.Id,
                    AdditionalData = "User role: User"
                },
                new ActivityReport
                {
                    Description = "Database backup completed",
                    Timestamp = DateTime.UtcNow.AddMinutes(-30),
                    Status = "Success",
                    Trigger = "Scheduled Task",
                    UserId = devUser.Id,
                    AdditionalData = "Backup size: 2.5GB"
                },
                new ActivityReport
                {
                    Description = "Network configuration updated",
                    Timestamp = DateTime.UtcNow.AddMinutes(-15),
                    Status = "Success",
                    Trigger = "Manual",
                    UserId = devUser.Id,
                    AdditionalData = "MQTT settings configured"
                },
                new ActivityReport
                {
                    Description = "Failed login attempt detected",
                    Timestamp = DateTime.UtcNow.AddMinutes(-5),
                    Status = "Warning",
                    Trigger = "Security",
                    UserId = null,
                    AdditionalData = "IP: 192.168.1.100"
                }
            };

            context.ActivityReports.AddRange(activityReports);
            await context.SaveChangesAsync();
        }

        // private static async Task SeedEmergencyReportsAsync(AppDbContext context)
        // {
        //     if (context.EmergencyReports.Any())
        //     {
        //         return;
        //     }

        //     var emergencyReports = new List<EmergencyReport>
        //     {
        //         new EmergencyReport
        //         {
        //             EmergencyType = "Fire",
        //             Status = false,
        //             StartTime = DateTime.UtcNow.AddDays(-7),
        //             EndTime = DateTime.UtcNow.AddDays(-7).AddHours(2),
        //             Duration = TimeSpan.FromHours(2),
        //             IsActive = false,
        //             Notes = "False alarm triggered by dust sensor malfunction",
        //             RawMqttPayload = "{\"type\":\"fire\",\"sensor\":\"smoke_detector_1\",\"status\":\"triggered\"}",
        //             CreatedAt = DateTime.UtcNow.AddDays(-7),
        //             UpdatedAt = DateTime.UtcNow.AddDays(-7).AddHours(2)
        //         },
        //         new EmergencyReport
        //         {
        //             EmergencyType = "Temperature",
        //             Status = false,
        //             StartTime = DateTime.UtcNow.AddDays(-3),
        //             EndTime = DateTime.UtcNow.AddDays(-3).AddHours(1),
        //             Duration = TimeSpan.FromHours(1),
        //             IsActive = false,
        //             Notes = "Temperature spike resolved after AC unit restart",
        //             RawMqttPayload = "{\"type\":\"temperature\",\"sensor\":\"temp_01\",\"value\":45.2}",
        //             CreatedAt = DateTime.UtcNow.AddDays(-3),
        //             UpdatedAt = DateTime.UtcNow.AddDays(-3).AddHours(1)
        //         },
        //         new EmergencyReport
        //         {
        //             EmergencyType = "Power",
        //             Status = true,
        //             StartTime = DateTime.UtcNow.AddHours(-1),
        //             EndTime = null,
        //             Duration = null,
        //             IsActive = true,
        //             Notes = "UPS battery backup activated, investigating main power issue",
        //             RawMqttPayload = "{\"type\":\"power\",\"status\":\"main_failure\",\"backup\":\"active\"}",
        //             CreatedAt = DateTime.UtcNow.AddHours(-1),
        //             UpdatedAt = DateTime.UtcNow.AddMinutes(-10)
        //         }
        //     };

        //     context.EmergencyReports.AddRange(emergencyReports);
        //     await context.SaveChangesAsync();
        // }

        private static async Task SeedMqttConfigurationAsync(AppDbContext context, List<User> users)
        {
            if (context.MqttConfigurations.Any())
            {
                return;
            }

            var adminUser = users.First(u => u.Role == UserRole.Admin);

            var mqttConfigurations = new List<MqttConfiguration>
            {
                new MqttConfiguration
                {
                    IsEnabled = true,
                    UseEnvironmentConfig = false,
                    BrokerHost = "localhost",
                    BrokerPort = 1883,
                    Username = "admin",
                    Password = "password123",
                    ClientId = "ContainmentSystem_Primary",
                    UseSsl = false,
                    KeepAliveInterval = 60,
                    ReconnectDelay = 5,
                    TopicPrefix = "containment",
                    Description = "Primary MQTT configuration for local broker",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new MqttConfiguration
                {
                    IsEnabled = false,
                    UseEnvironmentConfig = false,
                    BrokerHost = "mqtt.example.com",
                    BrokerPort = 8883,
                    Username = "containment_user",
                    Password = "secure_password",
                    ClientId = "ContainmentSystem_Cloud",
                    UseSsl = true,
                    KeepAliveInterval = 120,
                    ReconnectDelay = 10,
                    TopicPrefix = "datacenter/containment",
                    Description = "Cloud MQTT broker configuration for remote monitoring",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1),
                    IsActive = false
                }
            };



            context.MqttConfigurations.AddRange(mqttConfigurations);
            await context.SaveChangesAsync();
        }

        private static async Task SeedCctvCamerasAsync(AppDbContext context, List<Containment> containments)
        {
            if (context.CctvCameras.Any())
            {
                return;
            }

            var cctvCameras = new List<CctvCamera>
            {
                new CctvCamera
                {
                    Name = "Camera Pintu Masuk Data Center A",
                    Ip = "192.168.1.10",
                    Port = 554,
                    Username = "admin",
                    Password = "password123",
                    StreamUrl = "rtsp://admin:password123@192.168.1.10:554/stream1",
                    ContainmentId = containments.First().Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CctvCamera
                {
                    Name = "Camera Rack A-01",
                    Ip = "192.168.1.20",
                    Port = 554,
                    Username = "admin",
                    Password = "admin123",
                    StreamUrl = "rtsp://admin:admin123@192.168.1.20:554/stream1",
                    ContainmentId = containments.Count > 1 ? containments[1].Id : containments.First().Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CctvCamera
                {
                    Name = "Camera Monitoring Umum",
                    Ip = "192.168.1.30",
                    Port = 8080,
                    Username = "user",
                    Password = "user123",
                    StreamUrl = "http://user:user123@192.168.1.30:8080/video",
                    ContainmentId = null, // General monitoring, not tied to specific containment
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.CctvCameras.AddRange(cctvCameras);
            await context.SaveChangesAsync();
        }

    }
}