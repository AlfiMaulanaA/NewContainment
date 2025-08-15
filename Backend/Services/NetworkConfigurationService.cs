using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;
using Backend.Enums;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net;
using NetworkInterfaceType = Backend.Enums.NetworkInterfaceType;

namespace Backend.Services
{
    public class NetworkConfigurationService : INetworkConfigurationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<NetworkConfigurationService> _logger;
        private const string INTERFACES_FILE_PATH = "/etc/network/interfaces";
        private const string BACKUP_DIR = "/var/backups/network";

        public NetworkConfigurationService(AppDbContext context, ILogger<NetworkConfigurationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<NetworkConfiguration>> GetAllConfigurationsAsync()
        {
            return await _context.NetworkConfigurations
                .Include(n => n.CreatedByUser)
                .Include(n => n.UpdatedByUser)
                .Where(n => n.IsActive)
                .OrderBy(n => n.InterfaceType)
                .ToListAsync();
        }

        public async Task<NetworkConfiguration?> GetConfigurationByIdAsync(int id)
        {
            return await _context.NetworkConfigurations
                .Include(n => n.CreatedByUser)
                .Include(n => n.UpdatedByUser)
                .FirstOrDefaultAsync(n => n.Id == id && n.IsActive);
        }

        public async Task<NetworkConfiguration?> GetConfigurationByInterfaceAsync(Backend.Enums.NetworkInterfaceType interfaceType)
        {
            return await _context.NetworkConfigurations
                .Include(n => n.CreatedByUser)
                .Include(n => n.UpdatedByUser)
                .FirstOrDefaultAsync(n => n.InterfaceType == interfaceType && n.IsActive);
        }

        public async Task<NetworkConfiguration> CreateConfigurationAsync(NetworkConfigurationRequest request, int userId)
        {
            // Check if configuration already exists for this interface
            var existing = await GetConfigurationByInterfaceAsync(request.InterfaceType);
            if (existing != null)
            {
                throw new InvalidOperationException($"Configuration for {request.InterfaceType} already exists. Use update instead.");
            }

            // Validate configuration
            if (!await ValidateNetworkConfigurationAsync(request))
            {
                throw new ArgumentException("Invalid network configuration parameters.");
            }

            var configuration = new NetworkConfiguration
            {
                InterfaceType = request.InterfaceType,
                ConfigMethod = request.ConfigMethod,
                IpAddress = request.IpAddress,
                SubnetMask = request.SubnetMask,
                Gateway = request.Gateway,
                PrimaryDns = request.PrimaryDns,
                SecondaryDns = request.SecondaryDns,
                Metric = request.Metric,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.NetworkConfigurations.Add(configuration);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Network configuration created for {request.InterfaceType} by user {userId}");
            return configuration;
        }

        public async Task<NetworkConfiguration?> UpdateConfigurationAsync(int id, NetworkConfigurationRequest request, int userId)
        {
            var configuration = await GetConfigurationByIdAsync(id);
            if (configuration == null)
            {
                return null;
            }

            // Validate configuration
            if (!await ValidateNetworkConfigurationAsync(request))
            {
                throw new ArgumentException("Invalid network configuration parameters.");
            }

            configuration.ConfigMethod = request.ConfigMethod;
            configuration.IpAddress = request.IpAddress;
            configuration.SubnetMask = request.SubnetMask;
            configuration.Gateway = request.Gateway;
            configuration.PrimaryDns = request.PrimaryDns;
            configuration.SecondaryDns = request.SecondaryDns;
            configuration.Metric = request.Metric;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Network configuration updated for {configuration.InterfaceType} by user {userId}");
            return configuration;
        }

        public async Task<bool> DeleteConfigurationAsync(int id)
        {
            var configuration = await GetConfigurationByIdAsync(id);
            if (configuration == null)
            {
                return false;
            }

            configuration.IsActive = false;
            configuration.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Network configuration deleted for {configuration.InterfaceType}");
            return true;
        }

        public async Task<string> ReadNetworkInterfacesFileAsync()
        {
            try
            {
                if (File.Exists(INTERFACES_FILE_PATH))
                {
                    return await File.ReadAllTextAsync(INTERFACES_FILE_PATH);
                }
                return string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read network interfaces file");
                throw;
            }
        }

        public async Task<bool> WriteNetworkInterfacesFileAsync(List<NetworkConfiguration> configurations)
        {
            try
            {
                // Backup current configuration
                await BackupNetworkConfigAsync();

                var interfacesContent = GenerateInterfacesFileContent(configurations);
                
                // Write to file with proper permissions
                await File.WriteAllTextAsync(INTERFACES_FILE_PATH, interfacesContent);
                
                // Set proper permissions (requires sudo)
                await ExecuteCommandAsync("sudo", $"chmod 644 {INTERFACES_FILE_PATH}");
                
                _logger.LogInformation("Network interfaces file updated successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write network interfaces file");
                return false;
            }
        }

        private string GenerateInterfacesFileContent(List<NetworkConfiguration> configurations)
        {
            var content = new StringBuilder();
            
            // Header
            content.AppendLine("# This file describes the network interfaces available on your system");
            content.AppendLine("# and how to activate them. For more information, see interfaces(5).");
            content.AppendLine();
            content.AppendLine("source /etc/network/interfaces.d/*");
            content.AppendLine();
            content.AppendLine("# The loopback network interface");
            content.AppendLine("auto lo");
            content.AppendLine("iface lo inet loopback");
            content.AppendLine();

            // Generate configuration for each interface
            foreach (var config in configurations.OrderBy(c => c.InterfaceType))
            {
                var interfaceName = config.InterfaceType.ToString().ToLower();
                
                content.AppendLine($"# {config.InterfaceType} interface configuration");
                content.AppendLine($"auto {interfaceName}");
                
                if (config.ConfigMethod == NetworkConfigMethod.DHCP)
                {
                    content.AppendLine($"iface {interfaceName} inet dhcp");
                }
                else // Static
                {
                    content.AppendLine($"iface {interfaceName} inet static");
                    if (!string.IsNullOrEmpty(config.IpAddress))
                        content.AppendLine($"    address {config.IpAddress}");
                    if (!string.IsNullOrEmpty(config.SubnetMask))
                        content.AppendLine($"    netmask {config.SubnetMask}");
                    if (!string.IsNullOrEmpty(config.Gateway))
                        content.AppendLine($"    gateway {config.Gateway}");
                    if (!string.IsNullOrEmpty(config.PrimaryDns))
                    {
                        var dnsServers = config.PrimaryDns;
                        if (!string.IsNullOrEmpty(config.SecondaryDns))
                            dnsServers += " " + config.SecondaryDns;
                        content.AppendLine($"    dns-nameservers {dnsServers}");
                    }
                    if (!string.IsNullOrEmpty(config.Metric))
                        content.AppendLine($"    metric {config.Metric}");
                }
                content.AppendLine();
            }

            return content.ToString();
        }

        public async Task<bool> ApplyNetworkConfigurationAsync(ApplyNetworkConfigRequest request)
        {
            try
            {
                if (request.BackupCurrentConfig)
                {
                    await BackupNetworkConfigAsync();
                }

                var configurations = await GetAllConfigurationsAsync();
                var success = await WriteNetworkInterfacesFileAsync(configurations);

                if (success && request.RestartNetworking)
                {
                    await RestartNetworkingServiceAsync();
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to apply network configuration");
                return false;
            }
        }

        public async Task<bool> RestartNetworkingServiceAsync()
        {
            try
            {
                // Try different methods to restart networking
                var commands = new[]
                {
                    "sudo systemctl restart networking",
                    "sudo systemctl restart NetworkManager",
                    "sudo service networking restart",
                    "sudo reboot"
                };

                foreach (var command in commands)
                {
                    var parts = command.Split(' ', 2);
                    var result = await ExecuteCommandAsync(parts[0], parts[1]);
                    if (result.Contains("success", StringComparison.OrdinalIgnoreCase) || 
                        result.Contains("started", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation($"Network service restarted successfully using: {command}");
                        return true;
                    }
                }

                _logger.LogWarning("Failed to restart networking service using standard methods");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restart networking service");
                return false;
            }
        }

        public Task<bool> BackupNetworkConfigAsync()
        {
            try
            {
                // Create backup directory if it doesn't exist
                if (!Directory.Exists(BACKUP_DIR))
                {
                    Directory.CreateDirectory(BACKUP_DIR);
                }

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupPath = Path.Combine(BACKUP_DIR, $"interfaces_backup_{timestamp}");

                if (File.Exists(INTERFACES_FILE_PATH))
                {
                    File.Copy(INTERFACES_FILE_PATH, backupPath);
                    _logger.LogInformation($"Network configuration backed up to {backupPath}");
                    return Task.FromResult(true);
                }

                return Task.FromResult(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to backup network configuration");
                return Task.FromResult(false);
            }
        }

        public Task<bool> RestoreNetworkConfigAsync()
        {
            try
            {
                if (!Directory.Exists(BACKUP_DIR))
                {
                    return Task.FromResult(false);
                }

                var backupFiles = Directory.GetFiles(BACKUP_DIR, "interfaces_backup_*")
                    .OrderByDescending(f => f)
                    .FirstOrDefault();

                if (backupFiles != null)
                {
                    File.Copy(backupFiles, INTERFACES_FILE_PATH, true);
                    _logger.LogInformation($"Network configuration restored from {backupFiles}");
                    return Task.FromResult(true);
                }

                return Task.FromResult(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restore network configuration");
                return Task.FromResult(false);
            }
        }

        public Task<List<NetworkInterfaceStatus>> GetNetworkInterfaceStatusAsync()
        {
            var status = new List<NetworkInterfaceStatus>();

            try
            {
                // Get network interfaces
                var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(ni => ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Ethernet)
                    .ToList();

                foreach (var iface in interfaces)
                {
                    var interfaceStatus = new NetworkInterfaceStatus
                    {
                        InterfaceName = iface.Name,
                        IsUp = iface.OperationalStatus == OperationalStatus.Up,
                        MacAddress = iface.GetPhysicalAddress().ToString(),
                        LastUpdated = DateTime.UtcNow
                    };

                    // Determine interface type based on name
                    if (iface.Name.Contains("eth0", StringComparison.OrdinalIgnoreCase))
                        interfaceStatus.InterfaceType = Backend.Enums.NetworkInterfaceType.ETH0;
                    else if (iface.Name.Contains("eth1", StringComparison.OrdinalIgnoreCase))
                        interfaceStatus.InterfaceType = Backend.Enums.NetworkInterfaceType.ETH1;

                    // Get IP configuration
                    var ipProperties = iface.GetIPProperties();
                    var ipAddress = ipProperties.UnicastAddresses
                        .FirstOrDefault(addr => addr.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

                    if (ipAddress != null)
                    {
                        interfaceStatus.CurrentIpAddress = ipAddress.Address.ToString();
                        interfaceStatus.SubnetMask = ipAddress.IPv4Mask?.ToString();
                    }

                    // Get gateway
                    var gateway = ipProperties.GatewayAddresses.FirstOrDefault();
                    if (gateway != null)
                    {
                        interfaceStatus.Gateway = gateway.Address.ToString();
                    }

                    // Get DNS servers
                    var dnsServers = ipProperties.DnsAddresses.ToList();
                    if (dnsServers.Count > 0)
                        interfaceStatus.PrimaryDns = dnsServers[0].ToString();
                    if (dnsServers.Count > 1)
                        interfaceStatus.SecondaryDns = dnsServers[1].ToString();

                    status.Add(interfaceStatus);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get network interface status");
            }

            return Task.FromResult(status);
        }

        public Task<bool> ValidateNetworkConfigurationAsync(NetworkConfigurationRequest request)
        {
            if (request.ConfigMethod == NetworkConfigMethod.Static)
            {
                // Validate IP address
                if (string.IsNullOrEmpty(request.IpAddress) || !IPAddress.TryParse(request.IpAddress, out _))
                {
                    return Task.FromResult(false);
                }

                // Validate subnet mask
                if (string.IsNullOrEmpty(request.SubnetMask) || !IPAddress.TryParse(request.SubnetMask, out _))
                {
                    return Task.FromResult(false);
                }

                // Validate gateway (optional)
                if (!string.IsNullOrEmpty(request.Gateway) && !IPAddress.TryParse(request.Gateway, out _))
                {
                    return Task.FromResult(false);
                }

                // Validate DNS servers (optional)
                if (!string.IsNullOrEmpty(request.PrimaryDns) && !IPAddress.TryParse(request.PrimaryDns, out _))
                {
                    return Task.FromResult(false);
                }

                if (!string.IsNullOrEmpty(request.SecondaryDns) && !IPAddress.TryParse(request.SecondaryDns, out _))
                {
                    return Task.FromResult(false);
                }
            }

            return Task.FromResult(true);
        }

        public async Task<bool> TestConnectivityAsync(string ipAddress)
        {
            try
            {
                using var ping = new Ping();
                var reply = await ping.SendPingAsync(ipAddress, 5000);
                return reply.Status == IPStatus.Success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to test connectivity to {ipAddress}");
                return false;
            }
        }

        public async Task<bool> RevertInterfaceToDhcpAsync(NetworkInterfaceType interfaceType, int userId)
        {
            try
            {
                // Get existing configuration
                var existing = await GetConfigurationByInterfaceAsync(interfaceType);
                
                if (existing != null)
                {
                    // Update to DHCP
                    var dhcpRequest = new NetworkConfigurationRequest
                    {
                        InterfaceType = interfaceType,
                        ConfigMethod = NetworkConfigMethod.DHCP,
                        IpAddress = null,
                        SubnetMask = null,
                        Gateway = null,
                        PrimaryDns = null,
                        SecondaryDns = null,
                        Metric = null
                    };
                    
                    await UpdateConfigurationAsync(existing.Id, dhcpRequest, userId);
                }
                else
                {
                    // Create new DHCP configuration
                    var dhcpRequest = new NetworkConfigurationRequest
                    {
                        InterfaceType = interfaceType,
                        ConfigMethod = NetworkConfigMethod.DHCP
                    };
                    
                    await CreateConfigurationAsync(dhcpRequest, userId);
                }
                
                _logger.LogInformation($"Interface {interfaceType} reverted to DHCP by user {userId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to revert {interfaceType} to DHCP");
                return false;
            }
        }

        public async Task<bool> ClearAllStaticConfigurationsAsync(int userId)
        {
            try
            {
                var configurations = await GetAllConfigurationsAsync();
                
                foreach (var config in configurations.Where(c => c.ConfigMethod == NetworkConfigMethod.Static))
                {
                    await RevertInterfaceToDhcpAsync(config.InterfaceType, userId);
                }
                
                _logger.LogInformation($"All static configurations cleared by user {userId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clear all static configurations");
                return false;
            }
        }

        public async Task<List<NetworkConfiguration>> ParseNetworkInterfacesFileAsync()
        {
            try
            {
                var configurations = new List<NetworkConfiguration>();
                var content = await ReadNetworkInterfacesFileAsync();
                
                if (string.IsNullOrEmpty(content))
                    return configurations;

                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                NetworkConfiguration? currentConfig = null;
                
                foreach (var line in lines)
                {
                    var trimmedLine = line.Trim();
                    
                    // Skip comments and empty lines
                    if (trimmedLine.StartsWith("#") || string.IsNullOrEmpty(trimmedLine))
                        continue;
                    
                    // Parse interface declarations
                    if (trimmedLine.StartsWith("iface "))
                    {
                        var parts = trimmedLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 4)
                        {
                            var interfaceName = parts[1];
                            var configType = parts[3]; // dhcp or static
                            
                            // Determine interface type
                            if (interfaceName.Equals("eth0", StringComparison.OrdinalIgnoreCase))
                            {
                                currentConfig = new NetworkConfiguration
                                {
                                    InterfaceType = NetworkInterfaceType.ETH0,
                                    ConfigMethod = configType.Equals("dhcp", StringComparison.OrdinalIgnoreCase) 
                                        ? NetworkConfigMethod.DHCP 
                                        : NetworkConfigMethod.Static,
                                    IsActive = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                            }
                            else if (interfaceName.Equals("eth1", StringComparison.OrdinalIgnoreCase))
                            {
                                currentConfig = new NetworkConfiguration
                                {
                                    InterfaceType = NetworkInterfaceType.ETH1,
                                    ConfigMethod = configType.Equals("dhcp", StringComparison.OrdinalIgnoreCase) 
                                        ? NetworkConfigMethod.DHCP 
                                        : NetworkConfigMethod.Static,
                                    IsActive = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                            }
                        }
                    }
                    // Parse configuration properties for static interfaces
                    else if (currentConfig != null && currentConfig.ConfigMethod == NetworkConfigMethod.Static)
                    {
                        if (trimmedLine.StartsWith("address "))
                        {
                            currentConfig.IpAddress = trimmedLine.Replace("address ", "").Trim();
                        }
                        else if (trimmedLine.StartsWith("netmask "))
                        {
                            currentConfig.SubnetMask = trimmedLine.Replace("netmask ", "").Trim();
                        }
                        else if (trimmedLine.StartsWith("gateway "))
                        {
                            currentConfig.Gateway = trimmedLine.Replace("gateway ", "").Trim();
                        }
                        else if (trimmedLine.StartsWith("dns-nameservers "))
                        {
                            var dnsServers = trimmedLine.Replace("dns-nameservers ", "").Trim().Split(' ');
                            if (dnsServers.Length > 0)
                                currentConfig.PrimaryDns = dnsServers[0];
                            if (dnsServers.Length > 1)
                                currentConfig.SecondaryDns = dnsServers[1];
                        }
                        else if (trimmedLine.StartsWith("metric "))
                        {
                            currentConfig.Metric = trimmedLine.Replace("metric ", "").Trim();
                        }
                    }
                    
                    // If we hit another interface or the end, save current config
                    if (currentConfig != null && (trimmedLine.StartsWith("iface ") || trimmedLine.StartsWith("auto ")))
                    {
                        if (currentConfig.InterfaceType != default && 
                            !configurations.Any(c => c.InterfaceType == currentConfig.InterfaceType))
                        {
                            configurations.Add(currentConfig);
                        }
                        
                        currentConfig = null;
                    }
                }
                
                // Add the last configuration if it exists
                if (currentConfig != null && currentConfig.InterfaceType != default && 
                    !configurations.Any(c => c.InterfaceType == currentConfig.InterfaceType))
                {
                    configurations.Add(currentConfig);
                }
                
                _logger.LogInformation($"Parsed {configurations.Count} configurations from interfaces file");
                return configurations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse network interfaces file");
                return new List<NetworkConfiguration>();
            }
        }

        private async Task<string> ExecuteCommandAsync(string command, string arguments)
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processInfo);
                if (process != null)
                {
                    var output = await process.StandardOutput.ReadToEndAsync();
                    var error = await process.StandardError.ReadToEndAsync();
                    await process.WaitForExitAsync();

                    return string.IsNullOrEmpty(error) ? output : error;
                }

                return string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to execute command: {command} {arguments}");
                return $"Error: {ex.Message}";
            }
        }
    }
}