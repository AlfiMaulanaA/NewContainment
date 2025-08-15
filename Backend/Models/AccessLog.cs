using System.Text.Json.Serialization;

using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class AccessLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string User { get; set; } = string.Empty;

        [Required]
        public AccessMethod Via { get; set; }

        [Required]
        [StringLength(200)]
        public string Trigger { get; set; } = string.Empty;

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string? AdditionalData { get; set; }

        public string? Description { get; set; }

        public bool IsSuccess { get; set; } = true;

        public string? IpAddress { get; set; }
    }
}