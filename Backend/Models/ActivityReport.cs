using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class ActivityReport
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        [Required]
        [StringLength(50)]
        public string Status { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Trigger { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? AdditionalData { get; set; }
        
        public int? UserId { get; set; }
        
        // Navigation properties
        public User? User { get; set; }
    }
}