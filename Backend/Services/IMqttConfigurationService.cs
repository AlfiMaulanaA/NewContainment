using Backend.Models;

namespace Backend.Services
{
    public interface IMqttConfigurationService
    {
        Task<MqttConfiguration?> GetActiveConfigurationAsync();
        Task<IEnumerable<MqttConfiguration>> GetAllConfigurationsAsync();
        Task<MqttConfiguration?> GetConfigurationByIdAsync(int id);
        Task<MqttConfiguration> CreateConfigurationAsync(MqttConfiguration configuration, int userId);
        Task<MqttConfiguration?> UpdateConfigurationAsync(int id, MqttConfiguration configuration, int userId);
        Task<bool> DeleteConfigurationAsync(int id);
        Task<bool> SetActiveConfigurationAsync(int id, int userId);
        Task<bool> ToggleMqttAsync(bool enabled, int userId);
        Task<Dictionary<string, object>> GetEffectiveConfigurationAsync();
    Task<bool> TestConnectionAsync(MqttConfiguration configuration);
    Task<Dictionary<string, object>> GetDetailedMqttStatusAsync();
        Task<Dictionary<int, bool>> GetAllConnectionStatusAsync();
    }
}
