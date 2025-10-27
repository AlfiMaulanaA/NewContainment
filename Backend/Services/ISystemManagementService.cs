namespace Backend.Services
{
    public interface ISystemManagementService
    {
        Task<SystemCommandResult> RebootSystemAsync(int userId);
        Task<SystemCommandResult> ShutdownSystemAsync(int userId);
        Task<SystemCommandResult> RestartServiceAsync(string serviceName, int userId);
        Task<SystemCommandResult> StartServiceAsync(string serviceName, int userId);
        Task<SystemCommandResult> StopServiceAsync(string serviceName, int userId);
        Task<SystemCommandResult> GetServiceStatusAsync(string serviceName, int userId);
        Task<SystemStatusInfo> GetSystemInfoAsync();
        Task<List<SystemService>> GetAvailableServicesAsync();
    }

    // Response DTOs (no database models needed)
    public class SystemCommandResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public int ExitCode { get; set; }
        public DateTime ExecutedAt { get; set; }
        public string Command { get; set; } = string.Empty;
        public string ExecutedBy { get; set; } = string.Empty;
    }

    public class SystemService
    {
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsEnabled { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class SystemStatusInfo
    {
        public string HostName { get; set; } = string.Empty;
        public string OperatingSystem { get; set; } = string.Empty;
        public string Architecture { get; set; } = string.Empty;
        public string KernelVersion { get; set; } = string.Empty;
        public string Uptime { get; set; } = string.Empty;
        public string LoadAverage { get; set; } = string.Empty;
        public string MemoryUsage { get; set; } = string.Empty;
        public string DiskUsage { get; set; } = string.Empty;
        public DateTime CheckedAt { get; set; }
    }
}