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
                    Name = "Admin User",
                    Email = "admin@example.com",
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
                    Email = "dev@example.com",
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
                    Email = "user@example.com",
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
                    Description = "Primary data center containment for high availability",
                    Location = "Building A, Floor 1",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Containment
                {
                    Name = "Server Room B",
                    Type = ContainmentType.HotAisleContainment,
                    Description = "Secondary server room with cold aisle containment",
                    Location = "Building B, Floor 2",
                    CreatedBy = adminUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Containment
                {
                    Name = "Network Operations Center",
                    Type = ContainmentType.ColdAisleContainment,
                    Description = "Network equipment containment area",
                    Location = "Building A, Floor 3",
                    CreatedBy = devUser.Id,
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
                    Name = "Rack B-01",
                    ContainmentId = containments[1].Id, // Server Room B
                    Description = "Storage and backup servers",
                    CreatedBy = devUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                },
                new Rack
                {
                    Name = "Rack C-01",
                    ContainmentId = containments[2].Id, // Network Operations Center
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

                // Devices in Rack B-01 (Storage)
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

                // Devices in Rack C-01 (Network)
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
    }
}