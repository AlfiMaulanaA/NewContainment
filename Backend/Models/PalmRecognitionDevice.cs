using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class PalmRecognitionDevice
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(45)] // IPv6 addresses can be up to 45 characters
        public string IpAddress { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = false;
    }
}
