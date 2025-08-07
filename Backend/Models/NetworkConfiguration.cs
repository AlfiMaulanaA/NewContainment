using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class NetworkConfiguration
    {
        public int Id { get; set; }
        
        [Required]
        public NetworkInterfaceType InterfaceType { get; set; }
        
        [Required]
        public NetworkConfigMethod ConfigMethod { get; set; }
        
        [StringLength(15)]
        public string? IpAddress { get; set; }
        
        [StringLength(15)]
        public string? SubnetMask { get; set; }
        
        [StringLength(15)]
        public string? Gateway { get; set; }
        
        [StringLength(15)]
        public string? PrimaryDns { get; set; }
        
        [StringLength(15)]
        public string? SecondaryDns { get; set; }
        
        [StringLength(6)]
        public string? Metric { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public int CreatedBy { get; set; }
        
        public int? UpdatedBy { get; set; }
        
        // Navigation properties
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
    }

    public class NetworkConfigurationRequest
    {
        [Required]
        public NetworkInterfaceType InterfaceType { get; set; }
        
        [Required]
        public NetworkConfigMethod ConfigMethod { get; set; }
        
        public string? IpAddress { get; set; }
        
        public string? SubnetMask { get; set; }
        
        public string? Gateway { get; set; }
        
        public string? PrimaryDns { get; set; }
        
        public string? SecondaryDns { get; set; }
        
        public string? Metric { get; set; }
    }

    public class NetworkInterfaceStatus
    {
        public NetworkInterfaceType InterfaceType { get; set; }
        public string InterfaceName { get; set; } = string.Empty;
        public NetworkConfigMethod ConfigMethod { get; set; }
        public string? CurrentIpAddress { get; set; }
        public string? SubnetMask { get; set; }
        public string? Gateway { get; set; }
        public string? PrimaryDns { get; set; }
        public string? SecondaryDns { get; set; }
        public bool IsUp { get; set; }
        public string? MacAddress { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class ApplyNetworkConfigRequest
    {
        public bool RestartNetworking { get; set; } = true;
        public bool BackupCurrentConfig { get; set; } = true;
    }
}