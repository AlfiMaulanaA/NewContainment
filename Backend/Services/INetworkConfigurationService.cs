using Backend.Models;
using Backend.Enums;

namespace Backend.Services
{
    public interface INetworkConfigurationService
    {
        Task<List<NetworkConfiguration>> GetAllConfigurationsAsync();
        Task<NetworkConfiguration?> GetConfigurationByIdAsync(int id);
        Task<NetworkConfiguration?> GetConfigurationByInterfaceAsync(NetworkInterfaceType interfaceType);
        Task<NetworkConfiguration> CreateConfigurationAsync(NetworkConfigurationRequest request, int userId);
        Task<NetworkConfiguration?> UpdateConfigurationAsync(int id, NetworkConfigurationRequest request, int userId);
        Task<bool> DeleteConfigurationAsync(int id);
        
        // Network interface file operations
        Task<string> ReadNetworkInterfacesFileAsync();
        Task<bool> WriteNetworkInterfacesFileAsync(List<NetworkConfiguration> configurations);
        Task<bool> ApplyNetworkConfigurationAsync(ApplyNetworkConfigRequest request);
        Task<bool> RestartNetworkingServiceAsync();
        Task<bool> BackupNetworkConfigAsync();
        Task<bool> RestoreNetworkConfigAsync();
        
        // Status and validation
        Task<List<NetworkInterfaceStatus>> GetNetworkInterfaceStatusAsync();
        Task<bool> ValidateNetworkConfigurationAsync(NetworkConfigurationRequest request);
        Task<bool> TestConnectivityAsync(string ipAddress);
    }
}