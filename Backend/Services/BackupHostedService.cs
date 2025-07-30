namespace Backend.Services
{
    public class BackupHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BackupHostedService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromDays(1); // Check daily

        public BackupHostedService(IServiceProvider serviceProvider, ILogger<BackupHostedService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Backup service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();

                    // Check if backup is due
                    if (await backupService.IsBackupDueAsync())
                    {
                        _logger.LogInformation("Backup is due, starting backup process");
                        
                        var success = await backupService.CreateBackupAsync();
                        if (success)
                        {
                            _logger.LogInformation("Scheduled backup completed successfully");
                            
                            // Clean up old backups (keep last 4)
                            await backupService.DeleteOldBackupsAsync(4);
                        }
                        else
                        {
                            _logger.LogError("Scheduled backup failed");
                        }
                    }
                    else
                    {
                        _logger.LogDebug("Backup not due yet");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in backup service");
                }

                // Wait for next check
                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Backup service stopped");
        }
    }
}