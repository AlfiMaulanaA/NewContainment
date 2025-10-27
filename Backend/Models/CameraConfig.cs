using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class CameraConfig
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public int Port { get; set; } = 80;
        public string ApiKey { get; set; } = string.Empty;
        public string Group { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;
    }
}
