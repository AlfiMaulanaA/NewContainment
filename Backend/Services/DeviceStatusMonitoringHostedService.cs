using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Backend.Services
{
    public class DeviceStatusMonitoringHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DeviceStatusMonitoringHostedService> _logger;
        private readonly TimeSpan _checkInterval;

        public DeviceStatusMonitoringHostedService(
            IServiceProvider serviceProvider,
            ILogger<DeviceStatusMonitoringHostedService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            // Get check interval from configuration (default: 2 minutes)
            var intervalMinutes = configuration.GetValue<int>("DeviceMonitoring:CheckIntervalMinutes", 2);
            _checkInterval = TimeSpan.FromMinutes(intervalMinutes);
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Device Status Monitoring Service started with check interval: {Interval}", _checkInterval);

            // Initialize device monitoring on startup
            await InitializeDeviceMonitoringAsync();

            await base.StartAsync(cancellationToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Device Status Monitoring Service is stopping");
            await base.StopAsync(cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckDeviceStatusesAsync();
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Expected when cancellation is requested
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during device status monitoring cycle");

                    // Wait a shorter time before retrying on error
                    try
                    {
                        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }
        }

        private async Task InitializeDeviceMonitoringAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var deviceStatusService = scope.ServiceProvider.GetRequiredService<IDeviceStatusMonitoringService>();

                await deviceStatusService.InitializeDeviceMonitoringAsync();
                _logger.LogInformation("Device monitoring initialized successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize device monitoring");
            }
        }

        private async Task CheckDeviceStatusesAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var deviceStatusService = scope.ServiceProvider.GetRequiredService<IDeviceStatusMonitoringService>();

                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                await deviceStatusService.CheckAndUpdateDeviceStatusesAsync();
                stopwatch.Stop();

                _logger.LogDebug("Device status check completed in {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during device status check");
                throw; // Re-throw to trigger retry logic in ExecuteAsync
            }
        }
    }
}