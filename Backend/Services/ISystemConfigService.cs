using Backend.Models;

namespace Backend.Services
{
    public interface ISystemConfigService
    {
        // System Configuration
        Task<SystemConfig?> GetActiveSystemConfigAsync();
        Task<SystemConfig> CreateSystemConfigAsync(SystemConfigRequest request, int userId);
        Task<SystemConfig> UpdateSystemConfigAsync(int id, SystemConfigRequest request, int userId);
        Task<bool> DeleteSystemConfigAsync(int id);
        Task<bool> SetActiveSystemConfigAsync(int id);
        Task<List<SystemConfig>> GetAllSystemConfigsAsync();

        // MQTT System Config Operations
        Task<bool> PublishSystemConfigChangeAsync();
        Task<bool> PublishSystemConfigValueAsync(string configKey, object value);
        Task<bool> PublishEmergencyTempToggleAsync(bool enable);
        Task<CurrentSystemConfigResponse?> RequestCurrentSystemConfigAsync();

        // Pin Configuration
        Task<PinConfig?> GetActivePinConfigAsync();
        Task<PinConfig> CreatePinConfigAsync(PinConfigRequest request, int userId);
        Task<PinConfig> UpdatePinConfigAsync(int id, PinConfigRequest request, int userId);
        Task<bool> DeletePinConfigAsync(int id);
        Task<bool> SetActivePinConfigAsync(int id);
        Task<List<PinConfig>> GetAllPinConfigsAsync();

        // MQTT Pin Config Operations
        Task<CurrentPinConfigResponse?> RequestCurrentPinConfigAsync();
        Task<MqttConfigResponse> PublishPinConfigChangeAsync(PinConfigRequest request);

        // Validation
        Task<(bool isValid, string errorMessage)> ValidatePinConfigAsync(PinConfigRequest request);
    }
}