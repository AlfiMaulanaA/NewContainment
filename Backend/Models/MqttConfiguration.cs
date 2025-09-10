using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class MqttConfiguration
    {
        public int Id { get; set; }

        [Required]
        public bool IsEnabled { get; set; } = true;

        [Required]
        public bool UseEnvironmentConfig { get; set; } = true;

        [StringLength(255)]
        public string? BrokerHost { get; set; }

        public int? BrokerPort { get; set; } = 1883;

        [StringLength(100)]
        public string? Username { get; set; }

        [StringLength(255)]
        public string? Password { get; set; }

        [StringLength(100)]
        public string? ClientId { get; set; }

        public bool UseSsl { get; set; } = false;

        public int KeepAliveInterval { get; set; } = 60;

        public int ReconnectDelay { get; set; } = 5;

        [StringLength(1000)]
        public string? TopicPrefix { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        public int CreatedBy { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
    }
}