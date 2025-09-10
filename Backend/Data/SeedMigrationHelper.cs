using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Data
{
    /// <summary>
    /// Helper class to manage migration from old seed data to optimized seed data
    /// </summary>
    public static class SeedMigrationHelper
    {
        /// <summary>
        /// Clean up duplicate data that may have been created by multiple seed files
        /// </summary>
        public static async Task CleanupDuplicateDataAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Starting seed data cleanup...");

            try
            {
                // Clean up duplicate menu groups
                await CleanupDuplicateMenuGroups(context, logger);

                // Clean up duplicate menu items
                await CleanupDuplicateMenuItems(context, logger);

                // Clean up duplicate roles
                await CleanupDuplicateRoles(context, logger);

                // Clean up test/demo data that might be obsolete
                await CleanupTestData(context, logger);

                logger.LogInformation("Seed data cleanup completed successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during seed data cleanup");
                throw;
            }
        }

        private static async Task CleanupDuplicateMenuGroups(AppDbContext context, ILogger logger)
        {
            var duplicateGroups = await context.MenuGroups
                .GroupBy(mg => mg.Title)
                .Where(g => g.Count() > 1)
                .ToListAsync();

            if (duplicateGroups.Any())
            {
                logger.LogInformation($"Found {duplicateGroups.Count} duplicate menu group titles");

                foreach (var group in duplicateGroups)
                {
                    // Keep the most recent one, remove others
                    var groupsToRemove = group.OrderByDescending(g => g.CreatedAt).Skip(1);

                    foreach (var groupToRemove in groupsToRemove)
                    {
                        // First move menu items to the kept group
                        var itemsToMove = await context.MenuItems
                            .Where(mi => mi.MenuGroupId == groupToRemove.Id)
                            .ToListAsync();

                        var keepGroup = group.OrderByDescending(g => g.CreatedAt).First();

                        foreach (var item in itemsToMove)
                        {
                            item.MenuGroupId = keepGroup.Id;
                        }

                        // Remove the duplicate group
                        context.MenuGroups.Remove(groupToRemove);
                        logger.LogInformation($"Removed duplicate menu group: {groupToRemove.Title} (ID: {groupToRemove.Id})");
                    }
                }

                await context.SaveChangesAsync();
            }
        }

        private static async Task CleanupDuplicateMenuItems(AppDbContext context, ILogger logger)
        {
            var duplicateItems = await context.MenuItems
                .GroupBy(mi => new { mi.Title, mi.Url })
                .Where(g => g.Count() > 1)
                .ToListAsync();

            if (duplicateItems.Any())
            {
                logger.LogInformation($"Found {duplicateItems.Count} duplicate menu items");

                foreach (var itemGroup in duplicateItems)
                {
                    // Keep the most recent one, remove others
                    var itemsToRemove = itemGroup.OrderByDescending(i => i.CreatedAt).Skip(1);

                    foreach (var itemToRemove in itemsToRemove)
                    {
                        context.MenuItems.Remove(itemToRemove);
                        logger.LogInformation($"Removed duplicate menu item: {itemToRemove.Title} (URL: {itemToRemove.Url})");
                    }
                }

                await context.SaveChangesAsync();
            }
        }

        private static async Task CleanupDuplicateRoles(AppDbContext context, ILogger logger)
        {
            var duplicateRoles = await context.Roles
                .GroupBy(r => r.Name.ToLower())
                .Where(g => g.Count() > 1)
                .ToListAsync();

            if (duplicateRoles.Any())
            {
                logger.LogInformation($"Found {duplicateRoles.Count} duplicate role names");

                foreach (var roleGroup in duplicateRoles)
                {
                    // Keep the one with the most recent CreatedAt, remove others
                    var rolesToRemove = roleGroup.OrderByDescending(r => r.CreatedAt).Skip(1);

                    foreach (var roleToRemove in rolesToRemove)
                    {
                        // Check if role is being used
                        var isRoleInUse = await context.UserRoles.AnyAsync(ur => ur.RoleId == roleToRemove.Id);

                        if (!isRoleInUse)
                        {
                            context.Roles.Remove(roleToRemove);
                            logger.LogInformation($"Removed duplicate role: {roleToRemove.Name} (ID: {roleToRemove.Id})");
                        }
                        else
                        {
                            logger.LogWarning($"Skipped removal of duplicate role {roleToRemove.Name} as it's currently in use");
                        }
                    }
                }

                await context.SaveChangesAsync();
            }
        }

        private static async Task CleanupTestData(AppDbContext context, ILogger logger)
        {
            // Remove old test users if they exist
            var testUsers = await context.Users
                .Where(u => u.Email.Contains("@gmail.com") &&
                           (u.Email == "admin@gmail.com" || u.Email == "dev@gmail.com" || u.Email == "user@gmail.com"))
                .ToListAsync();

            if (testUsers.Any())
            {
                logger.LogInformation($"Found {testUsers.Count} old test users to clean up");

                foreach (var testUser in testUsers)
                {
                    // Check if user has important data associated
                    var hasMaintenanceData = await context.Maintenances.AnyAsync(m => m.CreatedBy == testUser.Id || m.AssignTo == testUser.Id);
                    var hasActivityData = await context.ActivityReports.AnyAsync(a => a.UserId == testUser.Id);

                    if (!hasMaintenanceData && !hasActivityData)
                    {
                        context.Users.Remove(testUser);
                        logger.LogInformation($"Removed old test user: {testUser.Email}");
                    }
                    else
                    {
                        // Just update the email to be more professional
                        testUser.Email = testUser.Email.Replace("@gmail.com", "@datacenter.local");
                        logger.LogInformation($"Updated test user email: {testUser.Name} -> {testUser.Email}");
                    }
                }

                await context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Generate seed configuration report
        /// </summary>
        public static async Task<Dictionary<string, object>> GenerateSeedReportAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Generating seed data report...");

            var report = new Dictionary<string, object>
            {
                {"Timestamp", DateTime.UtcNow},
                {"Users", await context.Users.CountAsync()},
                {"Containments", await context.Containments.CountAsync()},
                {"Racks", await context.Racks.CountAsync()},
                {"Devices", await context.Devices.CountAsync()},
                {"ContainmentStatuses", await context.ContainmentStatuses.CountAsync()},
                {"Maintenances", await context.Maintenances.CountAsync()},
                {"CameraConfigs", await context.CameraConfigs.CountAsync()},
                {"ActivityReports", await context.ActivityReports.CountAsync()},
                {"EmergencyReports", await context.EmergencyReports.CountAsync()},
                {"MqttConfigurations", await context.MqttConfigurations.CountAsync()},
                {"NetworkConfigurations", await context.NetworkConfigurations.CountAsync()},
                {"Roles", await context.Roles.CountAsync()},
                {"MenuGroups", await context.MenuGroups.CountAsync()},
                {"MenuItems", await context.MenuItems.CountAsync()},
                {"AccessLogs", await context.AccessLogs.CountAsync()},
                {"DeviceSensorData", await context.DeviceSensorData.CountAsync()}
            };

            // Add data quality checks
            report["DataQuality"] = new Dictionary<string, object>
            {
                {"DuplicateMenuGroups", await context.MenuGroups.GroupBy(mg => mg.Title).CountAsync(g => g.Count() > 1)},
                {"DuplicateMenuItems", await context.MenuItems.GroupBy(mi => new { mi.Title, mi.Url }).CountAsync(g => g.Count() > 1)},
                {"DuplicateRoles", await context.Roles.GroupBy(r => r.Name).CountAsync(g => g.Count() > 1)},
                {"InactiveUsers", await context.Users.CountAsync(u => !u.IsActive)},
                {"InactiveDevices", await context.Devices.CountAsync(d => !d.IsActive)}
            };

            // Add configuration status
            report["SeedConfiguration"] = OptimizedSeedData.GetSeedConfiguration();

            logger.LogInformation("Seed data report generated successfully");
            return report;
        }

        /// <summary>
        /// Validate seed data integrity
        /// </summary>
        public static async Task<List<string>> ValidateSeedDataAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Validating seed data integrity...");

            var issues = new List<string>();

            // Check for orphaned records
            var orphanedMenuItems = await context.MenuItems
                .Where(mi => !context.MenuGroups.Any(mg => mg.Id == mi.MenuGroupId))
                .CountAsync();

            if (orphanedMenuItems > 0)
                issues.Add($"Found {orphanedMenuItems} orphaned menu items");

            var orphanedRacks = await context.Racks
                .Where(r => !context.Containments.Any(c => c.Id == r.ContainmentId))
                .CountAsync();

            if (orphanedRacks > 0)
                issues.Add($"Found {orphanedRacks} orphaned racks");

            var orphanedDevices = await context.Devices
                .Where(d => !context.Racks.Any(r => r.Id == d.RackId))
                .CountAsync();

            if (orphanedDevices > 0)
                issues.Add($"Found {orphanedDevices} orphaned devices");

            // Check for missing required data
            if (!await context.Users.AnyAsync(u => u.Role == Backend.Enums.UserRole.Admin))
                issues.Add("No admin user found in the system");

            if (!await context.MenuGroups.AnyAsync())
                issues.Add("No menu groups found - menu system may not work");

            if (!await context.Roles.AnyAsync())
                issues.Add("No roles found - role-based access may not work");

            // Check for data consistency
            var usersWithoutRoles = await context.Users
                .Where(u => !context.UserRoles.Any(ur => ur.UserId == u.Id))
                .CountAsync();

            if (usersWithoutRoles > 0)
                issues.Add($"Found {usersWithoutRoles} users without role assignments");

            logger.LogInformation($"Seed data validation completed. Found {issues.Count} issues");
            return issues;
        }
    }
}