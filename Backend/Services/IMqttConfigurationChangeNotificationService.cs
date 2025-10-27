namespace Backend.Services
{
    public interface IMqttConfigurationChangeNotificationService
    {
        event EventHandler<MqttConfigurationChangedEventArgs>? ConfigurationChanged;
        Task NotifyConfigurationChangedAsync(int? configurationId = null);
        Task ReloadAllMqttServicesAsync();
    }

    public class MqttConfigurationChangedEventArgs : EventArgs
    {
        public int? ConfigurationId { get; set; }
        public DateTime ChangedAt { get; set; }
        public string? ChangeType { get; set; } // "Updated", "Activated", "Created", "Deleted"

        public MqttConfigurationChangedEventArgs(int? configurationId, string? changeType = null)
        {
            ConfigurationId = configurationId;
            ChangeType = changeType;
            ChangedAt = DateTime.UtcNow;
        }
    }
}