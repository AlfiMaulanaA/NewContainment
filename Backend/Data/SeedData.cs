using Backend.Models;
using Backend.Enums;
using Backend.Services;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

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
                await SeedCameraConfigAsync(context);

                // Seed ActivityReports
                await SeedActivityReportsAsync(context, users);

                // Seed EmergencyReports
                await SeedEmergencyReportsAsync(context);

                // Seed MqttConfiguration
                await SeedMqttConfigurationAsync(context, users);

                // Seed AccessLog
                // await SeedAccessLogAsync(context, users);

                // Seed DeviceSensorData  
                await SeedDeviceSensorDataAsync(context);

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
        // ------------------------------------------------------------------
        // Sensor Devices for Temperature and Humidity Monitoring
        // ------------------------------------------------------------------
        new Device
        {
            Name = "Temperature & Humidity Sensor 01",
            Type = "Sensor",
            RackId = racks[0].Id, // Contoh: Rack A-01
            Description = "Sensing temperature and humidity in a data center environment.",
            SerialNumber = "SENS-TH-001",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Temperature_01",
            SensorType = "Temperature",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },
        new Device
        {
            Name = "Temperature & Humidity Sensor 02",
            Type = "Sensor",
            RackId = racks[1].Id, // Contoh: Rack A-02
            Description = "Sensing temperature and humidity in a data center environment.",
            SerialNumber = "SENS-TH-002",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Temperature_02",
            SensorType = "Temperature",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },

        // ------------------------------------------------------------------
        // Sensor Devices for Air Flow Monitoring
        // ------------------------------------------------------------------
        new Device
        {
            Name = "Air Flow Sensor 01",
            Type = "Sensor",
            RackId = racks[2].Id, // Contoh: Rack A-03
            Description = "Monitors air flow speed and pressure inside the containment aisle.",
            SerialNumber = "SENS-AF-001",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/AirFlow_01",
            SensorType = "Air Flow",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },
        new Device
        {
            Name = "Air Flow Sensor 02",
            Type = "Sensor",
            RackId = racks[3].Id, // Contoh: Rack B-01
            Description = "Monitors air flow speed and pressure inside the containment aisle.",
            SerialNumber = "SENS-AF-002",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/AirFlow_02",
            SensorType = "Air Flow",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },

        // ------------------------------------------------------------------
        // Sensor Devices for Dust Monitoring
        // ------------------------------------------------------------------
        new Device
        {
            Name = "Dust Sensor 01",
            Type = "Sensor",
            RackId = racks[0].Id, // Contoh: Rack A-01
            Description = "Measures dust particle levels (PM2.5, PM10) in the air.",
            SerialNumber = "SENS-DS-001",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Dust_01",
            SensorType = "Dust Sensor",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },
        new Device
        {
            Name = "Dust Sensor 02",
            Type = "Sensor",
            RackId = racks[1].Id, // Contoh: Rack A-02
            Description = "Measures dust particle levels (PM2.5, PM10) in the air.",
            SerialNumber = "SENS-DS-002",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Dust_02",
            SensorType = "Dust Sensor",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },

        // ------------------------------------------------------------------
        // Sensor Devices for Vibration Monitoring
        // ------------------------------------------------------------------
        new Device
        {
            Name = "Vibration Sensor 01",
            Type = "Sensor",
            RackId = racks[2].Id, // Contoh: Rack A-03
            Description = "Detects vibrations to monitor rack stability and potential issues.",
            SerialNumber = "SENS-VB-001",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Vibration_01",
            SensorType = "Vibration",
            CreatedBy = adminUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        },
        new Device
        {
            Name = "Vibration Sensor 02",
            Type = "Sensor",
            RackId = racks[3].Id, // Contoh: Rack B-01
            Description = "Detects vibrations to monitor rack stability and potential issues.",
            SerialNumber = "SENS-VB-002",
            Status = "Active",
            Topic = "IOT/Containment/Sensor/Vibration_02",
            SensorType = "Vibration",
            CreatedBy = adminUser.Id,
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
        private static async Task SeedEmergencyReportsAsync(AppDbContext context)
        {
            // Periksa apakah sudah ada data. Jika ada, hentikan proses.
            if (context.EmergencyReports.Any())
            {
                return;
            }

            var emergencyReports = new List<EmergencyReport>
    {
        // 1. Data untuk "Fire Suppression System" - Skenario: Kejadian masa lalu dan sudah selesai
        new EmergencyReport
        {
            EmergencyType = "Fire Suppression System",
            Status = false,
            StartTime = DateTime.UtcNow.AddDays(-7),
            EndTime = DateTime.UtcNow.AddDays(-7).AddHours(2),
            Duration = TimeSpan.FromHours(2),
            IsActive = false,
            Notes = "FSS activated due to high temperature, system has been reset.",
            RawMqttPayload = "{\"type\":\"fire_suppression_system\",\"status\":\"activated\",\"zone\":\"server_room_a\"}",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-7).AddHours(2)
        },

        // 2. Data untuk "Emergency Temperature" - Skenario: Kejadian masa lalu dan sudah selesai
        new EmergencyReport
        {
            EmergencyType = "Emergency Temperature",
            Status = false,
            StartTime = DateTime.UtcNow.AddDays(-3),
            EndTime = DateTime.UtcNow.AddDays(-3).AddMinutes(30),
            Duration = TimeSpan.FromMinutes(30),
            IsActive = false,
            Notes = "Critical temperature spike resolved after cooling system check.",
            RawMqttPayload = "{\"type\":\"emergency_temperature\",\"sensor_id\":\"temp_01\",\"value\":85.5,\"threshold\":80.0}",
            CreatedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3).AddMinutes(30)
        },

        // 3. Data untuk "Smoke Detector" - Skenario: Kejadian yang sedang berlangsung
        new EmergencyReport
        {
            EmergencyType = "Smoke Detector",
            Status = true, // Status 'true' untuk menunjukkan kejadian masih aktif
            StartTime = DateTime.UtcNow.AddMinutes(-15),
            EndTime = null, // EndTime null karena kejadian masih berlangsung
            Duration = null,
            IsActive = false,
            Notes = "Smoke detected in data center. Investigating source.",
            RawMqttPayload = "{\"type\":\"smoke_detector\",\"sensor_id\":\"sd_05\",\"status\":\"alert\"}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-15),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-15)
        },

        // 4. Data untuk "Emergency Button" - Skenario: Kejadian yang sedang berlangsung
        new EmergencyReport
        {
            EmergencyType = "Emergency Button",
            Status = true, // Status 'true' karena tombol darurat sedang aktif
            StartTime = DateTime.UtcNow.AddMinutes(-5),
            EndTime = null,
            Duration = null,
            IsActive = false,
            Notes = "Emergency button pressed near entrance B. Security dispatched.",
            RawMqttPayload = "{\"type\":\"emergency_button\",\"location\":\"main_entrance\",\"state\":true}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTime.UtcNow.AddMinutes(-5)
        }
    };

            context.EmergencyReports.AddRange(emergencyReports);
            await context.SaveChangesAsync();
        }

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
                    BrokerHost = "192.168.0.138",
                    BrokerPort = 1883,
                    Username = "",
                    Password = "",
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
                    BrokerHost = "mqttws.iotech.my.id",
                    BrokerPort = 443,
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
        
         private static async Task SeedCameraConfigAsync(AppDbContext context)
        {
            if (context.CameraConfigs.Any())
            {
                return;
            }

            var cameraConfigs = new List<CameraConfig>
            {
                new CameraConfig
                {
                    Name = "Main Entrance Camera",
                    IpAddress = "192.168.0.138",
                    Port = 8080,
                    ApiKey = "WypWkw4hK4xh3YzEvxOIUYTP6cfH2u",
                    Group = "shinobi1",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.CameraConfigs.AddRange(cameraConfigs);
            await context.SaveChangesAsync();
        }

        private static async Task SeedAccessLogAsync(AppDbContext context, List<User> users)
        {
            if (context.AccessLogs.Any())
            {
                return;
            }

            var random = new Random();
            var accessLogs = new List<AccessLog>();

            // Sample access data for different access methods
            var accessMethods = new[]
            {
                new { Method = AccessMethod.Password, Trigger = "Login via Password" },
                new { Method = AccessMethod.Card, Trigger = "Access via Card Reader" },
                new { Method = AccessMethod.Fingerprint, Trigger = "Fingerprint Authentication" },
                new { Method = AccessMethod.Software, Trigger = "Open Back Door" },
                new { Method = AccessMethod.Software, Trigger = "Close Back Door" },
                new { Method = AccessMethod.Software, Trigger = "Open Front Door" },
                new { Method = AccessMethod.Software, Trigger = "Close Front Door" },
                new { Method = AccessMethod.Software, Trigger = "Enable Ceiling" },
                new { Method = AccessMethod.Software, Trigger = "Disable Ceiling" },
                new { Method = AccessMethod.Face, Trigger = "Face Recognition Access" },
                new { Method = AccessMethod.BMS, Trigger = "BMS System Override" }
            };

            var ipAddresses = new[] { "192.168.1.100", "192.168.1.101", "192.168.1.102", "10.0.0.50", "172.16.0.10" };

            // Generate 50 sample access logs
            for (int i = 0; i < 50; i++)
            {
                var user = users[random.Next(users.Count)];
                var accessMethod = accessMethods[random.Next(accessMethods.Length)];
                var timestamp = DateTime.UtcNow.AddDays(-random.Next(30)).AddHours(-random.Next(24)).AddMinutes(-random.Next(60));
                var isSuccess = random.Next(100) < 95; // 95% success rate

                var additionalData = accessMethod.Method == AccessMethod.Software ? 
                    $"{{\"ContainmentId\":{random.Next(1, 4)},\"Command\":\"{accessMethod.Trigger.ToLower().Replace(' ', '_')}\",\"ControlType\":\"{GetControlTypeFromTrigger(accessMethod.Trigger)}\",\"IsEnabled\":{(accessMethod.Trigger.Contains("Open") || accessMethod.Trigger.Contains("Enable")).ToString().ToLower()}}}" : 
                    null;

                accessLogs.Add(new AccessLog
                {
                    User = user.Name,
                    Via = accessMethod.Method,
                    Trigger = accessMethod.Trigger + (accessMethod.Method == AccessMethod.Software ? $" - Containment {random.Next(1, 4)}" : ""),
                    Timestamp = timestamp,
                    AdditionalData = additionalData,
                    Description = GetAccessDescription(accessMethod.Method),
                    IsSuccess = isSuccess,
                    IpAddress = ipAddresses[random.Next(ipAddresses.Length)]
                });
            }

            // Add some specific software access logs for testing via=4 filter
            var softwareAccessLogs = new[]
            {
                new AccessLog
                {
                    User = "Admin",
                    Via = AccessMethod.Software,
                    Trigger = "Open Back Door - Containment 1",
                    Timestamp = DateTime.UtcNow.AddHours(-2),
                    AdditionalData = "{\"ContainmentId\":1,\"Command\":\"open_back_door\",\"ControlType\":\"BackDoor\",\"IsEnabled\":true}",
                    Description = "Software-based containment control",
                    IsSuccess = true,
                    IpAddress = "192.168.1.100"
                },
                new AccessLog
                {
                    User = "John Developer",
                    Via = AccessMethod.Software,
                    Trigger = "Close Front Door - Containment 2",
                    Timestamp = DateTime.UtcNow.AddHours(-1),
                    AdditionalData = "{\"ContainmentId\":2,\"Command\":\"close_front_door\",\"ControlType\":\"FrontDoor\",\"IsEnabled\":false}",
                    Description = "Software-based containment control",
                    IsSuccess = true,
                    IpAddress = "192.168.1.101"
                },
                new AccessLog
                {
                    User = "Admin",
                    Via = AccessMethod.Software,
                    Trigger = "Enable Ceiling - Containment 1",
                    Timestamp = DateTime.UtcNow.AddMinutes(-30),
                    AdditionalData = "{\"ContainmentId\":1,\"Command\":\"enable_ceiling\",\"ControlType\":\"Ceiling\",\"IsEnabled\":true}",
                    Description = "Software-based containment control",
                    IsSuccess = true,
                    IpAddress = "192.168.1.100"
                }
            };

            accessLogs.AddRange(softwareAccessLogs);

            context.AccessLogs.AddRange(accessLogs);
            await context.SaveChangesAsync();
        }

        private static string GetControlTypeFromTrigger(string trigger)
        {
            if (trigger.Contains("Back Door")) return "BackDoor";
            if (trigger.Contains("Front Door")) return "FrontDoor";
            if (trigger.Contains("Ceiling")) return "Ceiling";
            return "Unknown";
        }

        private static string GetAccessDescription(AccessMethod method)
        {
            return method switch
            {
                AccessMethod.Password => "Password-based authentication",
                AccessMethod.Card => "Card reader access",
                AccessMethod.Fingerprint => "Biometric fingerprint access",
                AccessMethod.Software => "Software-based containment control",
                AccessMethod.Face => "Facial recognition access",
                AccessMethod.BMS => "Building Management System access",
                _ => "Unknown access method"
            };
        }

        private static async Task SeedDeviceSensorDataAsync(AppDbContext context)
        {
            if (context.DeviceSensorData.Any())
            {
                return;
            }

            var devices = await context.Devices.Where(d => d.Type.ToLower() == "sensor").ToListAsync();
            if (!devices.Any()) return;

            var random = new Random();
            var sensorDataList = new List<DeviceSensorData>();

            // Generate sensor data for the last 7 days
            var startDate = DateTime.UtcNow.AddDays(-7);
            var endDate = DateTime.UtcNow;

            foreach (var device in devices)
            {
                // Generate data points every 15 minutes for each device
                for (var date = startDate; date <= endDate; date = date.AddMinutes(15))
                {
                    var sensorData = GenerateSensorDataForDevice(device, date, random);
                    if (sensorData != null)
                    {
                        sensorDataList.Add(sensorData);
                    }
                }
            }

            // Add in batches to avoid memory issues
            const int batchSize = 100;
            for (int i = 0; i < sensorDataList.Count; i += batchSize)
            {
                var batch = sensorDataList.Skip(i).Take(batchSize);
                context.DeviceSensorData.AddRange(batch);
                await context.SaveChangesAsync();
            }
        }

        private static DeviceSensorData? GenerateSensorDataForDevice(Device device, DateTime timestamp, Random random)
        {
            string rawPayload;
            object parsedData;

            switch (device.SensorType?.ToLower())
            {
                case "temperature":
                    var temp = Math.Round(18 + random.NextDouble() * 12, 1); // 18-30°C
                    var humidity = Math.Round(40 + random.NextDouble() * 40, 1); // 40-80%
                    rawPayload = $"{{\"temp\": {temp}, \"hum\": {humidity}, \"timestamp\": \"{timestamp:yyyy-MM-dd HH:mm:ss}\", \"sensor_id\": \"{device.Name.Replace(" ", "_")}\"}}";
                    parsedData = new { temp, hum = humidity, timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss"), sensor_id = device.Name.Replace(" ", "_") };
                    break;

                case "vibration":
                    var vibX = Math.Round(random.NextDouble(), 3);
                    var vibY = Math.Round(random.NextDouble(), 3);
                    var vibZ = Math.Round(random.NextDouble(), 3);
                    rawPayload = $"{{\"vibration_x\": {vibX}, \"vibration_y\": {vibY}, \"vibration_z\": {vibZ}, \"timestamp\": \"{timestamp:yyyy-MM-dd HH:mm:ss}\", \"sensor_id\": \"{device.Name.Replace(" ", "_")}\"}}";
                    parsedData = new { vibration_x = vibX, vibration_y = vibY, vibration_z = vibZ, timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss"), sensor_id = device.Name.Replace(" ", "_") };
                    break;

                case "dust sensor":
                    var dustLevel = Math.Round(random.NextDouble() * 50, 2); // 0-50 μg/m³
                    rawPayload = $"{{\"dust_level_ug_m3\": {dustLevel}, \"timestamp\": \"{timestamp:yyyy-MM-dd HH:mm:ss}\", \"sensor_id\": \"{device.Name.Replace(" ", "_")}\"}}";
                    parsedData = new { dust_level_ug_m3 = dustLevel, timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss"), sensor_id = device.Name.Replace(" ", "_") };
                    break;

                case "air flow":
                    var flowRate = Math.Round(0.5 + random.NextDouble() * 2, 2); // 0.5-2.5 m/s
                    var pressure = Math.Round(random.NextDouble() * 100, 2); // 0-100 Pa
                    rawPayload = $"{{\"air_flow_rate_ms\": {flowRate}, \"pressure_pa\": {pressure}, \"timestamp\": \"{timestamp:yyyy-MM-dd HH:mm:ss}\", \"sensor_id\": \"{device.Name.Replace(" ", "_")}\"}}";
                    parsedData = new { air_flow_rate_ms = flowRate, pressure_pa = pressure, timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss"), sensor_id = device.Name.Replace(" ", "_") };
                    break;

                default:
                    // Generic sensor data
                    var value = Math.Round(random.NextDouble() * 100, 2);
                    rawPayload = $"{{\"value\": {value}, \"timestamp\": \"{timestamp:yyyy-MM-dd HH:mm:ss}\", \"sensor_id\": \"{device.Name.Replace(" ", "_")}\"}}";
                    parsedData = new { value, timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss"), sensor_id = device.Name.Replace(" ", "_") };
                    break;
            }

            return new DeviceSensorData
            {
                DeviceId = device.Id,
                RackId = device.RackId,
                ContainmentId = device.Rack?.ContainmentId ?? 1,
                Topic = device.Topic ?? $"IOT/Containment/Sensor/{device.Name.Replace(" ", "_")}",
                Timestamp = timestamp,
                ReceivedAt = timestamp.AddSeconds(random.Next(1, 10)), // Slight delay for received time
                RawPayload = rawPayload,
                SensorType = device.SensorType ?? "Unknown"
            };
        }

    }
}