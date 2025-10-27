using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Backend.Services
{
    /// <summary>
    /// Background service that runs daily to check for maintenance reminders
    /// Runs every morning at configured time (default 8:00 AM)
    /// </summary>
    public class MaintenanceReminderHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MaintenanceReminderHostedService> _logger;
        private readonly IConfiguration _configuration;
        private readonly Timer _timer;

        public MaintenanceReminderHostedService(
            IServiceProvider serviceProvider,
            ILogger<MaintenanceReminderHostedService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;

            // Schedule timer to run at the configured time each day
            var reminderHour = int.Parse(
                Environment.GetEnvironmentVariable("WHATSAPP_REMINDER_TIME_HOUR") ??
                _configuration["WhatsApp:Settings:ReminderTimeHour"] ?? "8");

            var now = DateTime.Now;
            var scheduledTime = new DateTime(now.Year, now.Month, now.Day, reminderHour, 0, 0);

            // If the scheduled time has already passed today, schedule for tomorrow
            if (scheduledTime <= now)
            {
                scheduledTime = scheduledTime.AddDays(1);
            }

            var timeUntilScheduled = scheduledTime - now;
            var dailyInterval = TimeSpan.FromDays(1);

            _timer = new Timer(async _ => await ExecuteReminderCheck(), null, timeUntilScheduled, dailyInterval);

            _logger.LogInformation("Maintenance Reminder Service scheduled to run daily at {Time}. Next execution: {NextRun}",
                scheduledTime.ToString("HH:mm"), scheduledTime);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Maintenance Reminder Hosted Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // The actual work is done by the timer, this just keeps the service running
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is stopping
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Maintenance Reminder Hosted Service");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken); // Wait before retrying
                }
            }

            _logger.LogInformation("Maintenance Reminder Hosted Service stopped");
        }

        private async Task ExecuteReminderCheck()
        {
            try
            {
                _logger.LogInformation("Starting daily maintenance reminder check at {Time}", DateTime.Now);

                using var scope = _serviceProvider.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<IMaintenanceNotificationService>();

                await notificationService.CheckAndSendDailyRemindersAsync();

                _logger.LogInformation("Completed daily maintenance reminder check at {Time}", DateTime.Now);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during daily maintenance reminder check");
            }
        }

        public override void Dispose()
        {
            _timer?.Dispose();
            base.Dispose();
        }
    }
}