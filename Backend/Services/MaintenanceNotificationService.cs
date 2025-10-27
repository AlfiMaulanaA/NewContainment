using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.Enums;

namespace Backend.Services
{
    public interface IMaintenanceNotificationService
    {
        Task SendMaintenanceAssignmentNotificationAsync(Maintenance maintenance);
        Task SendMaintenanceReminderNotificationAsync(Maintenance maintenance);
        Task CheckAndSendDailyRemindersAsync();
    }

    public class MaintenanceNotificationService : IMaintenanceNotificationService
    {
        private readonly AppDbContext _context;
        private readonly IWhatsAppService _whatsAppService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MaintenanceNotificationService> _logger;

        public MaintenanceNotificationService(
            AppDbContext context,
            IWhatsAppService whatsAppService,
            IConfiguration configuration,
            ILogger<MaintenanceNotificationService> logger)
        {
            _context = context;
            _whatsAppService = whatsAppService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Send WhatsApp notification when maintenance is assigned to a user
        /// </summary>
        public async Task SendMaintenanceAssignmentNotificationAsync(Maintenance maintenance)
        {
            try
            {
                var enableNotifications = bool.Parse(
                    Environment.GetEnvironmentVariable("WHATSAPP_ENABLE_NOTIFICATIONS") ??
                    _configuration["WhatsApp:Settings:EnableNotifications"] ?? "true");

                if (!enableNotifications)
                {
                    _logger.LogInformation("WhatsApp notifications are disabled, skipping assignment notification for maintenance {MaintenanceId}", maintenance.Id);
                    return;
                }

                // Get user details
                var user = await _context.Users.FindAsync(maintenance.AssignTo);
                if (user == null || string.IsNullOrEmpty(user.PhoneNumber))
                {
                    _logger.LogWarning("User {UserId} not found or has no phone number, cannot send maintenance assignment notification", maintenance.AssignTo);
                    return;
                }

                // Get target details
                var targetName = await GetMaintenanceTargetNameAsync(maintenance);

                var message = $"🔧 MAINTENANCE ASSIGNMENT\n\n" +
                             $"Dear {user.Name},\n\n" +
                             $"You have been assigned a new maintenance task. Please review the details below:\n\n" +
                             $"📝 Task Name: {maintenance.Name}\n" +
                             $"🎯 Target Equipment: {targetName}\n" +
                             $"📅 Scheduled Start: {maintenance.StartTask:MMM dd, yyyy - HH:mm}\n" +
                             $"📅 Scheduled End: {maintenance.EndTask:MMM dd, yyyy - HH:mm}\n" +
                             $"📋 Current Status: {maintenance.Status}\n\n";

                if (!string.IsNullOrEmpty(maintenance.Description))
                {
                    message += $"📄 Task Description:\n{maintenance.Description}\n\n";
                }

                message += $"Please prepare the necessary tools and equipment for this maintenance task. " +
                          $"You will receive automated reminders before the scheduled date.\n\n" +
                          $"Thank you for your attention.\n\n" +
                          $"Best regards,\n" +
                          $"IoT Containment Management System";

                var success = await _whatsAppService.SendMessageAsync(user.PhoneNumber, user.Name, message);

                if (success)
                {
                    _logger.LogInformation("Maintenance assignment notification sent successfully to user {UserId} for maintenance {MaintenanceId}", user.Id, maintenance.Id);
                }
                else
                {
                    _logger.LogError("Failed to send maintenance assignment notification to user {UserId} for maintenance {MaintenanceId}", user.Id, maintenance.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending maintenance assignment notification for maintenance {MaintenanceId}", maintenance.Id);
            }
        }

        /// <summary>
        /// Send WhatsApp reminder notification for upcoming maintenance
        /// </summary>
        public async Task SendMaintenanceReminderNotificationAsync(Maintenance maintenance)
        {
            try
            {
                var enableNotifications = bool.Parse(
                    Environment.GetEnvironmentVariable("WHATSAPP_ENABLE_NOTIFICATIONS") ??
                    _configuration["WhatsApp:Settings:EnableNotifications"] ?? "true");

                if (!enableNotifications)
                {
                    _logger.LogInformation("WhatsApp notifications are disabled, skipping reminder notification for maintenance {MaintenanceId}", maintenance.Id);
                    return;
                }

                // Get user details
                var user = await _context.Users.FindAsync(maintenance.AssignTo);
                if (user == null || string.IsNullOrEmpty(user.PhoneNumber))
                {
                    _logger.LogWarning("User {UserId} not found or has no phone number, cannot send maintenance reminder", maintenance.AssignTo);
                    return;
                }

                // Calculate days until maintenance
                var daysUntil = (maintenance.StartTask.Date - DateTime.Now.Date).Days;
                var targetName = await GetMaintenanceTargetNameAsync(maintenance);

                var message = $"⏰ MAINTENANCE REMINDER\n\n" +
                             $"Dear {user.Name},\n\n" +
                             $"This is a friendly reminder that you have a maintenance task scheduled in {daysUntil} day(s):\n\n" +
                             $"📝 Task Name: {maintenance.Name}\n" +
                             $"🎯 Target Equipment: {targetName}\n" +
                             $"📅 Scheduled Start: {maintenance.StartTask:MMM dd, yyyy - HH:mm}\n" +
                             $"📅 Scheduled End: {maintenance.EndTask:MMM dd, yyyy - HH:mm}\n" +
                             $"📋 Current Status: {maintenance.Status}\n\n";

                if (!string.IsNullOrEmpty(maintenance.Description))
                {
                    message += $"📄 Task Description:\n{maintenance.Description}\n\n";
                }

                message += $"Please ensure you have all necessary tools and equipment ready for this maintenance task. " +
                          $"If you have any questions or concerns, please contact your supervisor.\n\n" +
                          $"Thank you for your attention to this matter.\n\n" +
                          $"Best regards,\n" +
                          $"IoT Containment Management System";

                var success = await _whatsAppService.SendMessageAsync(user.PhoneNumber, user.Name, message);

                if (success)
                {
                    _logger.LogInformation("Maintenance reminder notification sent successfully to user {UserId} for maintenance {MaintenanceId}", user.Id, maintenance.Id);
                }
                else
                {
                    _logger.LogError("Failed to send maintenance reminder notification to user {UserId} for maintenance {MaintenanceId}", user.Id, maintenance.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending maintenance reminder notification for maintenance {MaintenanceId}", maintenance.Id);
            }
        }

        /// <summary>
        /// Check for upcoming maintenances and send daily reminders (scheduled to run every morning)
        /// </summary>
        public async Task CheckAndSendDailyRemindersAsync()
        {
            try
            {
                var reminderDaysBefore = int.Parse(
                    Environment.GetEnvironmentVariable("WHATSAPP_REMINDER_DAYS_BEFORE") ??
                    _configuration["WhatsApp:Settings:ReminderDaysBefore"] ?? "3");

                var today = DateTime.Now.Date;
                var reminderDate = today.AddDays(reminderDaysBefore);

                // Get maintenances that start on the reminder date and are still scheduled/in-progress
                var upcomingMaintenances = await _context.Maintenances
                    .Include(m => m.AssignedToUser)
                    .Where(m => m.StartTask.Date == reminderDate &&
                               m.IsActive &&
                               (m.Status == "Scheduled" || m.Status == "In Progress"))
                    .ToListAsync();

                _logger.LogInformation("Found {Count} maintenance tasks requiring reminders for {Date}", upcomingMaintenances.Count, reminderDate.ToString("yyyy-MM-dd"));

                foreach (var maintenance in upcomingMaintenances)
                {
                    await SendMaintenanceReminderNotificationAsync(maintenance);

                    // Add a small delay between messages to avoid rate limiting
                    await Task.Delay(1000);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking and sending daily maintenance reminders");
            }
        }

        /// <summary>
        /// Get the display name of the maintenance target
        /// </summary>
        private async Task<string> GetMaintenanceTargetNameAsync(Maintenance maintenance)
        {
            try
            {
                switch (maintenance.TargetType)
                {
                    case MaintenanceTarget.Device:
                        var device = await _context.Devices.FindAsync(maintenance.TargetId);
                        return device?.Name ?? $"Device #{maintenance.TargetId}";

                    case MaintenanceTarget.Rack:
                        var rack = await _context.Racks
                            .Include(r => r.Containment)
                            .FirstOrDefaultAsync(r => r.Id == maintenance.TargetId);
                        return rack != null ?
                            $"{rack.Name} (in {rack.Containment?.Name})" :
                            $"Rack #{maintenance.TargetId}";

                    case MaintenanceTarget.Containment:
                        var containment = await _context.Containments.FindAsync(maintenance.TargetId);
                        return containment?.Name ?? $"Containment #{maintenance.TargetId}";

                    default:
                        return $"{maintenance.TargetType} #{maintenance.TargetId}";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting target name for maintenance {MaintenanceId}", maintenance.Id);
                return $"{maintenance.TargetType} #{maintenance.TargetId}";
            }
        }
    }
}