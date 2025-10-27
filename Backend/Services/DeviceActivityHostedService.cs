namespace Backend.Services
{
    public class DeviceActivityHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DeviceActivityHostedService> _logger;
        private readonly int _intervalMinutes;

        public DeviceActivityHostedService(
            IServiceProvider serviceProvider,
            ILogger<DeviceActivityHostedService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            // Default check interval every 2 minutes
            _intervalMinutes = configuration.GetValue("DeviceActivity:CheckIntervalMinutes", 2);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation($"DeviceActivityHostedService started with {_intervalMinutes}-minute intervals");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var deviceActivityService = scope.ServiceProvider
                        .GetRequiredService<IDeviceActivityService>();

                    await deviceActivityService.UpdateDeviceActivityStatusAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in DeviceActivityHostedService execution");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(_intervalMinutes), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Service is stopping
                    break;
                }
            }

            _logger.LogInformation("DeviceActivityHostedService stopped");
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("DeviceActivityHostedService is starting");
            await base.StartAsync(cancellationToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("DeviceActivityHostedService is stopping");
            await base.StopAsync(cancellationToken);
        }
    }
}