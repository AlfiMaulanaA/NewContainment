using Backend.Models;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Services
{
    public class SystemInfoService : ISystemInfoService
    {
        private readonly ILogger<SystemInfoService> _logger;
        private readonly IMemoryCache _cache;
        private const string CACHE_KEY = "system_info";
        private readonly TimeSpan CACHE_DURATION = TimeSpan.FromSeconds(10); // Cache for 10 seconds

        public SystemInfoService(ILogger<SystemInfoService> logger, IMemoryCache cache)
        {
            _logger = logger;
            _cache = cache;
        }

        public async Task<SystemInfo> GetSystemInfoAsync()
        {
            // Check cache first
            if (_cache.TryGetValue(CACHE_KEY, out SystemInfo? cachedInfo) && cachedInfo != null)
            {
                _logger.LogDebug("Returning cached system info");
                return cachedInfo;
            }

            var systemInfo = new SystemInfo
            {
                Timestamp = DateTime.UtcNow,
                Hostname = Environment.MachineName,
                OsPlatform = RuntimeInformation.OSDescription,
                OsVersion = Environment.OSVersion.VersionString,
                ProcessorCount = Environment.ProcessorCount
            };

            try
            {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    await GetLinuxInfo(systemInfo);
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    await GetWindowsInfo(systemInfo);
                }
                else
                {
                    // Fallback for other platforms
                    systemInfo.IsAvailable = false;
                    systemInfo.ErrorMessage = "Platform not supported";
                }

                systemInfo.IsAvailable = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system information");
                systemInfo.IsAvailable = false;
                systemInfo.ErrorMessage = ex.Message;
            }

            // Cache the result
            _cache.Set(CACHE_KEY, systemInfo, CACHE_DURATION);
            
            return systemInfo;
        }
        
        private async Task GetLinuxInfo(SystemInfo info)
        {
            try
            {
                // CPU Usage with fallback
                try
                {
                    var cpuCommand = "top -bn1 | grep 'Cpu(s)' | sed \"s/.*, *\\([0-9.]*\\)%* id.*/\\1/\" | awk '{print 100 - $1}'";
                    var cpuUsageOutput = await ExecuteShellCommand(cpuCommand);
                    if (double.TryParse(cpuUsageOutput.Replace(',', '.'), System.Globalization.CultureInfo.InvariantCulture, out var cpuUsage))
                    {
                        info.CpuUsage = Math.Round(Math.Max(0, Math.Min(100, cpuUsage)), 2);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get CPU usage on Linux");
                    info.CpuUsage = 0.0;
                }

                // CPU Temperature with multiple fallbacks
                try
                {
                    var tempPaths = new[] {
                        "/sys/class/thermal/thermal_zone0/temp",
                        "/sys/class/hwmon/hwmon0/temp1_input",
                        "/sys/class/hwmon/hwmon1/temp1_input"
                    };

                    foreach (var path in tempPaths)
                    {
                        try
                        {
                            var tempOutput = await ExecuteShellCommand($"cat {path} 2>/dev/null");
                            if (int.TryParse(tempOutput.Trim(), out var temp))
                            {
                                info.CpuTemp = (temp / 1000.0).ToString("F1");
                                break;
                            }
                        }
                        catch { /* Continue to next path */ }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get CPU temperature on Linux");
                    info.CpuTemp = "N/A";
                }

                // Memory Info
                try
                {
                    var memoryCommand = "free -m | grep Mem";
                    var memoryOutput = await ExecuteShellCommand(memoryCommand);
                    var memoryMatches = Regex.Matches(memoryOutput, @"\d+");
                    if (memoryMatches.Count >= 3)
                    {
                        var totalMemory = long.Parse(memoryMatches[0].Value);
                        var usedMemory = totalMemory - long.Parse(memoryMatches[2].Value); // available memory
                        info.TotalMemory = totalMemory;
                        info.UsedMemory = Math.Max(0, usedMemory);
                        info.MemoryUsage = totalMemory > 0 ? Math.Round((double)usedMemory / totalMemory * 100, 2) : 0;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get memory info on Linux");
                }

                // Disk Info (gunakan partisi root /)
                try
                {
                    var diskCommand = "df -m / | tail -1";
                    var diskOutput = await ExecuteShellCommand(diskCommand);
                    var diskMatches = Regex.Matches(diskOutput, @"\d+");
                    if (diskMatches.Count >= 3)
                    {
                        var totalDisk = long.Parse(diskMatches[0].Value);
                        var usedDisk = long.Parse(diskMatches[1].Value);
                        info.TotalDisk = totalDisk;
                        info.UsedDisk = usedDisk;
                        info.DiskUsage = totalDisk > 0 ? Math.Round((double)usedDisk / totalDisk * 100, 2) : 0;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get disk info on Linux");
                }

                // Uptime
                try
                {
                    var uptimeCommand = "cat /proc/uptime";
                    var uptimeOutput = await ExecuteShellCommand(uptimeCommand);
                    var uptimeParts = uptimeOutput.Split(' ');
                    if (uptimeParts.Length > 0 && double.TryParse(uptimeParts[0], System.Globalization.CultureInfo.InvariantCulture, out var uptimeSeconds))
                    {
                        info.Uptime = (long)uptimeSeconds;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get uptime on Linux");
                }
                
                // IP Addresses
                info.Eth0IpAddress = await GetIpAddress("eth0");
                info.Wlan0IpAddress = await GetIpAddress("wlan0");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system info on Linux.");
                throw;
            }
        }

        private async Task GetWindowsInfo(SystemInfo info)
        {
            try
            {
                // CPU Usage using PerformanceCounter
                try
                {
                    if (OperatingSystem.IsWindows())
                    {
                        using var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                        cpuCounter.NextValue(); // First call returns 0
                        await Task.Delay(1000); // Wait 1 second for accurate reading
                        var cpuUsage = cpuCounter.NextValue();
                        info.CpuUsage = Math.Round(Math.Max(0, Math.Min(100, cpuUsage)), 2);
                    }
                    else
                    {
                        info.CpuUsage = 0; // Default value for non-Windows platforms
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get CPU usage on Windows");
                    info.CpuUsage = 0.0;
                }

                // Memory Info
                try
                {
                    var gcInfo = GC.GetGCMemoryInfo();
                    var totalMemory = gcInfo.TotalAvailableMemoryBytes / (1024 * 1024); // Convert to MB
                    var usedMemory = GC.GetTotalMemory(false) / (1024 * 1024); // Convert to MB
                    
                    info.TotalMemory = totalMemory;
                    info.UsedMemory = usedMemory;
                    info.MemoryUsage = totalMemory > 0 ? Math.Round((double)usedMemory / totalMemory * 100, 2) : 0;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get memory info on Windows");
                }

                // Disk Info
                try
                {
                    var driveInfo = DriveInfo.GetDrives()
                        .Where(d => d.DriveType == DriveType.Fixed && d.IsReady)
                        .FirstOrDefault();
                    
                    if (driveInfo != null)
                    {
                        var totalDisk = driveInfo.TotalSize / (1024 * 1024); // Convert to MB
                        var availableDisk = driveInfo.AvailableFreeSpace / (1024 * 1024); // Convert to MB
                        var usedDisk = totalDisk - availableDisk;
                        
                        info.TotalDisk = totalDisk;
                        info.UsedDisk = usedDisk;
                        info.DiskUsage = totalDisk > 0 ? Math.Round((double)usedDisk / totalDisk * 100, 2) : 0;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get disk info on Windows");
                }

                // Uptime
                try
                {
                    var uptimeMs = Environment.TickCount64;
                    info.Uptime = uptimeMs / 1000; // Convert to seconds
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get uptime on Windows");
                }

                // Network interfaces
                try
                {
                    var networkInterfaces = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                        .Where(ni => ni.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up)
                        .ToList();

                    var ethernetInterface = networkInterfaces
                        .FirstOrDefault(ni => ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Ethernet);
                    
                    var wifiInterface = networkInterfaces
                        .FirstOrDefault(ni => ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211);

                    if (ethernetInterface != null)
                    {
                        var ipProps = ethernetInterface.GetIPProperties();
                        var ipv4Address = ipProps.UnicastAddresses
                            .FirstOrDefault(ua => ua.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.Address;
                        info.Eth0IpAddress = ipv4Address?.ToString() ?? "N/A";
                    }

                    if (wifiInterface != null)
                    {
                        var ipProps = wifiInterface.GetIPProperties();
                        var ipv4Address = ipProps.UnicastAddresses
                            .FirstOrDefault(ua => ua.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.Address;
                        info.Wlan0IpAddress = ipv4Address?.ToString() ?? "N/A";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get network info on Windows");
                }

                // CPU Temperature is not easily accessible on Windows without WMI
                info.CpuTemp = "N/A";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system info on Windows.");
                throw;
            }
        }
        
        private async Task<string> GetIpAddress(string interfaceName)
        {
            try
            {
                var ipCommand = $"ip addr show {interfaceName} | grep 'inet ' | awk '{{print $2}}' | cut -d/ -f1";
                var ipAddress = await ExecuteShellCommand(ipCommand);
                return string.IsNullOrWhiteSpace(ipAddress) ? "N/A" : ipAddress;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting IP address for interface {interfaceName}.");
                return "N/A";
            }
        }

        private async Task<string> ExecuteShellCommand(string command, int timeoutMs = 5000)
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "/bin/bash",
                    Arguments = $"-c \"{command}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };
            
            process.Start();
            
            using var cts = new CancellationTokenSource(timeoutMs);
            try
            {
                var outputTask = process.StandardOutput.ReadToEndAsync();
                var errorTask = process.StandardError.ReadToEndAsync();
                
                await process.WaitForExitAsync(cts.Token);
                
                var output = await outputTask;
                var error = await errorTask;
                
                if (process.ExitCode != 0 && !string.IsNullOrEmpty(error))
                {
                    _logger.LogWarning("Command '{Command}' failed with exit code {ExitCode}: {Error}", 
                        command, process.ExitCode, error);
                }
                
                return output.Trim();
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Command '{Command}' timed out after {Timeout}ms", command, timeoutMs);
                try
                {
                    process.Kill(true);
                }
                catch { /* Ignore kill errors */ }
                return string.Empty;
            }
        }

        // Clear cache method for manual refresh
        public void ClearCache()
        {
            _cache.Remove(CACHE_KEY);
        }
    }
}