using System.Diagnostics;
using System.Text.Json;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class SystemManagementService : ISystemManagementService
    {
        private readonly ILogger<SystemManagementService> _logger;
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        // Predefined safe services for this application
        private readonly Dictionary<string, string> _allowedServices = new()
        {
            { "NewContainment", "NewContainment.service" },
            { "NewAccessControl", "NewAccessControl.service" },
            { "mosquitto", "mosquitto.service" },
            { "nginx", "nginx.service" },
            { "postgresql", "postgresql.service" },
            { "mysql", "mysql.service" },
            { "mariadb", "mariadb.service" },
            { "docker", "docker.service" }
        };

        public SystemManagementService(ILogger<SystemManagementService> logger, AppDbContext context, IWebHostEnvironment environment)
        {
            _logger = logger;
            _context = context;
            _environment = environment;
        }

        public async Task<SystemCommandResult> RebootSystemAsync(int userId)
        {
            var userName = await GetUserNameAsync(userId);
            _logger.LogWarning("SYSTEM REBOOT requested by user: {UserId} - {UserName}", userId, userName);
            
            return await ExecuteCommandAsync("sudo", "reboot", $"System reboot requested by {userName}", userName);
        }

        public async Task<SystemCommandResult> ShutdownSystemAsync(int userId)
        {
            var userName = await GetUserNameAsync(userId);
            _logger.LogWarning("SYSTEM SHUTDOWN requested by user: {UserId} - {UserName}", userId, userName);
            
            return await ExecuteCommandAsync("sudo", "shutdown -h now", $"System shutdown requested by {userName}", userName);
        }

        public async Task<SystemCommandResult> RestartServiceAsync(string serviceName, int userId)
        {
            if (!_allowedServices.ContainsKey(serviceName))
            {
                return new SystemCommandResult
                {
                    Success = false,
                    Message = $"Service '{serviceName}' is not allowed to be managed",
                    ExecutedAt = DateTime.UtcNow
                };
            }

            var userName = await GetUserNameAsync(userId);
            var fullServiceName = _allowedServices[serviceName];
            _logger.LogInformation("SERVICE RESTART requested: {ServiceName} by user: {UserId} - {UserName}", fullServiceName, userId, userName);
            
            return await ExecuteCommandAsync("sudo", $"systemctl restart {fullServiceName}", $"Restart service {serviceName}", userName);
        }

        public async Task<SystemCommandResult> StartServiceAsync(string serviceName, int userId)
        {
            if (!_allowedServices.ContainsKey(serviceName))
            {
                return new SystemCommandResult
                {
                    Success = false,
                    Message = $"Service '{serviceName}' is not allowed to be managed",
                    ExecutedAt = DateTime.UtcNow
                };
            }

            var userName = await GetUserNameAsync(userId);
            var fullServiceName = _allowedServices[serviceName];
            _logger.LogInformation("SERVICE START requested: {ServiceName} by user: {UserId} - {UserName}", fullServiceName, userId, userName);
            
            return await ExecuteCommandAsync("sudo", $"systemctl start {fullServiceName}", $"Start service {serviceName}", userName);
        }

        public async Task<SystemCommandResult> StopServiceAsync(string serviceName, int userId)
        {
            if (!_allowedServices.ContainsKey(serviceName))
            {
                return new SystemCommandResult
                {
                    Success = false,
                    Message = $"Service '{serviceName}' is not allowed to be managed",
                    ExecutedAt = DateTime.UtcNow
                };
            }

            var userName = await GetUserNameAsync(userId);
            var fullServiceName = _allowedServices[serviceName];
            _logger.LogInformation("SERVICE STOP requested: {ServiceName} by user: {UserId} - {UserName}", fullServiceName, userId, userName);
            
            return await ExecuteCommandAsync("sudo", $"systemctl stop {fullServiceName}", $"Stop service {serviceName}", userName);
        }

        public async Task<SystemCommandResult> GetServiceStatusAsync(string serviceName, int userId)
        {
            if (!_allowedServices.ContainsKey(serviceName))
            {
                return new SystemCommandResult
                {
                    Success = false,
                    Message = $"Service '{serviceName}' is not allowed to be checked",
                    ExecutedAt = DateTime.UtcNow
                };
            }

            var userName = await GetUserNameAsync(userId);
            var fullServiceName = _allowedServices[serviceName];
            
            return await ExecuteCommandAsync("sudo", $"systemctl status {fullServiceName} --no-pager -l", $"Check status of service {serviceName}", userName);
        }

        public async Task<List<SystemService>> GetAvailableServicesAsync()
        {
            var services = new List<SystemService>();

            foreach (var service in _allowedServices)
            {
                try
                {
                    var result = await ExecuteCommandAsync("systemctl", $"is-active {service.Value}", "", "system");
                    var enabledResult = await ExecuteCommandAsync("systemctl", $"is-enabled {service.Value}", "", "system");
                    
                    services.Add(new SystemService
                    {
                        Name = service.Key,
                        DisplayName = service.Key,
                        Status = result.Output?.Trim() ?? "unknown",
                        IsActive = result.Output?.Trim() == "active",
                        IsEnabled = enabledResult.Output?.Trim() == "enabled",
                        Description = $"System service: {service.Key}"
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to get status for service {ServiceName}", service.Key);
                    services.Add(new SystemService
                    {
                        Name = service.Key,
                        DisplayName = service.Key,
                        Status = "error",
                        IsActive = false,
                        IsEnabled = false,
                        Description = $"Error checking service: {ex.Message}"
                    });
                }
            }

            return services;
        }

        public async Task<SystemStatusInfo> GetSystemInfoAsync()
        {
            try
            {
                var tasks = new[]
                {
                    ExecuteCommandAsync("hostname", "", "", "system"),
                    ExecuteCommandAsync("uname", "-a", "", "system"),
                    ExecuteCommandAsync("uptime", "", "", "system"),
                    ExecuteCommandAsync("free", "-h", "", "system"),
                    ExecuteCommandAsync("df", "-h /", "", "system")
                };

                var results = await Task.WhenAll(tasks);

                return new SystemStatusInfo
                {
                    HostName = results[0].Output?.Trim() ?? Environment.MachineName,
                    OperatingSystem = results[1].Output?.Trim() ?? "Unknown",
                    Architecture = Environment.OSVersion.Platform.ToString(),
                    KernelVersion = results[1].Output?.Split(' ').Skip(2).FirstOrDefault() ?? "Unknown",
                    Uptime = results[2].Output?.Trim() ?? "Unknown",
                    LoadAverage = ExtractLoadAverage(results[2].Output ?? ""),
                    MemoryUsage = results[3].Output?.Trim() ?? "Unknown",
                    DiskUsage = results[4].Output?.Trim() ?? "Unknown",
                    CheckedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get system information");
                return new SystemStatusInfo
                {
                    HostName = Environment.MachineName,
                    OperatingSystem = "Error retrieving info",
                    Architecture = Environment.OSVersion.Platform.ToString(),
                    CheckedAt = DateTime.UtcNow
                };
            }
        }

        private async Task<SystemCommandResult> ExecuteCommandAsync(string command, string arguments, string description, string executedBy)
        {
            var result = new SystemCommandResult
            {
                Command = $"{command} {arguments}".Trim(),
                ExecutedAt = DateTime.UtcNow,
                ExecutedBy = executedBy
            };

            try
            {
                // Security check - only allow on Linux/Unix systems
                if (!OperatingSystem.IsLinux() && !OperatingSystem.IsMacOS())
                {
                    result.Success = false;
                    result.Message = "System commands are only supported on Linux/Unix systems";
                    result.Error = "Unsupported operating system";
                    return result;
                }

                var processStartInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = processStartInfo };
                
                var outputTask = Task.Run(() => process.StandardOutput.ReadToEndAsync());
                var errorTask = Task.Run(() => process.StandardError.ReadToEndAsync());

                process.Start();
                
                // Set timeout for safety
                var timeoutMs = command == "sudo" && (arguments.Contains("reboot") || arguments.Contains("shutdown")) ? 5000 : 30000;
                var completed = process.WaitForExit(timeoutMs);

                if (!completed)
                {
                    process.Kill();
                    result.Success = false;
                    result.Message = "Command timed out";
                    result.Error = $"Command execution exceeded {timeoutMs}ms timeout";
                    return result;
                }

                result.Output = await outputTask;
                result.Error = await errorTask;
                result.ExitCode = process.ExitCode;
                result.Success = process.ExitCode == 0;
                result.Message = result.Success ? 
                    (string.IsNullOrEmpty(description) ? "Command executed successfully" : description) : 
                    $"Command failed with exit code {process.ExitCode}";

                _logger.LogInformation("Command executed: {Command} | Success: {Success} | ExitCode: {ExitCode} | By: {ExecutedBy}", 
                    result.Command, result.Success, result.ExitCode, executedBy);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute command: {Command}", result.Command);
                result.Success = false;
                result.Message = "Failed to execute command";
                result.Error = ex.Message;
                return result;
            }
        }

        private async Task<string> GetUserNameAsync(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                return user?.Name ?? $"User_{userId}";
            }
            catch
            {
                return $"User_{userId}";
            }
        }

        private string ExtractLoadAverage(string uptimeOutput)
        {
            try
            {
                // Extract load average from uptime output
                var parts = uptimeOutput.Split("load average:");
                return parts.Length > 1 ? parts[1].Trim() : "Unknown";
            }
            catch
            {
                return "Unknown";
            }
        }
    }
}