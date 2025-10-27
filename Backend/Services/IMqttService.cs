namespace Backend.Services
{
    public interface IMqttService
    {
        Task ConnectAsync();
        Task DisconnectAsync();
        Task ReconnectWithNewConfigAsync();
        Task PublishAsync(string topic, string payload);
        Task SubscribeAsync(string topic, Func<string, string, Task> messageHandler);
        Task UnsubscribeAsync(string topic);
        bool IsConnected { get; }
        event EventHandler<string>? ConnectionStatusChanged;
    }
}