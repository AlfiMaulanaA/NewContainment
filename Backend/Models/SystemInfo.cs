using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class SystemInfo
    {
        [JsonPropertyName("cpu_usage")]
        public double CpuUsage { get; set; }
        
        [JsonPropertyName("cpu_temp")]
        public string CpuTemp { get; set; } = "0.0";
        
        [JsonPropertyName("memory_usage")]
        public double MemoryUsage { get; set; }
        
        [JsonPropertyName("used_memory")]
        public long UsedMemory { get; set; }
        
        [JsonPropertyName("total_memory")]
        public long TotalMemory { get; set; }
        
        [JsonPropertyName("disk_usage")]
        public double DiskUsage { get; set; }
        
        [JsonPropertyName("used_disk")]
        public long UsedDisk { get; set; }
        
        [JsonPropertyName("total_disk")]
        public long TotalDisk { get; set; }
        
        [JsonPropertyName("eth0_ip_address")]
        public string Eth0IpAddress { get; set; } = "N/A";
        
        [JsonPropertyName("wlan0_ip_address")]
        public string Wlan0IpAddress { get; set; } = "N/A";
        
        [JsonPropertyName("uptime")]
        public long Uptime { get; set; }
        
        // Additional system information
        [JsonPropertyName("hostname")]
        public string Hostname { get; set; } = Environment.MachineName;
        
        [JsonPropertyName("os_platform")]
        public string OsPlatform { get; set; } = Environment.OSVersion.Platform.ToString();
        
        [JsonPropertyName("os_version")]
        public string OsVersion { get; set; } = Environment.OSVersion.VersionString;
        
        [JsonPropertyName("processor_count")]
        public int ProcessorCount { get; set; } = Environment.ProcessorCount;
        
        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        [JsonPropertyName("is_available")]
        public bool IsAvailable { get; set; } = true;
        
        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    public class SystemInfoDto
    {
        public double CpuUsage { get; set; }
        public string CpuTemp { get; set; } = "0.0";
        public double MemoryUsage { get; set; }
        public long UsedMemory { get; set; }
        public long TotalMemory { get; set; }
        public double DiskUsage { get; set; }
        public long UsedDisk { get; set; }
        public long TotalDisk { get; set; }
        public string Eth0IpAddress { get; set; } = "N/A";
        public string Wlan0IpAddress { get; set; } = "N/A";
        public long Uptime { get; set; }
        public string Hostname { get; set; } = Environment.MachineName;
        public string OsPlatform { get; set; } = Environment.OSVersion.Platform.ToString();
        public string OsVersion { get; set; } = Environment.OSVersion.VersionString;
        public int ProcessorCount { get; set; } = Environment.ProcessorCount;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public bool IsAvailable { get; set; } = true;
        public string? ErrorMessage { get; set; }
    }
}