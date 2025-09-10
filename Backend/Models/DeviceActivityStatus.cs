using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class DeviceActivityStatus
    {
        public int Id { get; set; }

        [Required]
        public int DeviceId { get; set; }

        [StringLength(100)]
        public string? Topic { get; set; }

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Unknown"; // Online, Offline, Unknown

        public DateTime LastSeen { get; set; } = DateTime.UtcNow;

        public DateTime LastStatusChange { get; set; } = DateTime.UtcNow;

        [StringLength(500)]
        public string? LastMessage { get; set; }

        public int ConsecutiveFailures { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Device? Device { get; set; }
    }
}