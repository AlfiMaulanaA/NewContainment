using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Device
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        public int RackId { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(100)]
        public string? SerialNumber { get; set; }
        
        [StringLength(50)]
        public string? Status { get; set; } = "Active";
        
        [StringLength(100)]
        public string? Topic { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public bool IsActive { get; set; } = true;
        
        public int CreatedBy { get; set; }
        
        public int? UpdatedBy { get; set; }
        
        // Navigation properties
        public Rack? Rack { get; set; }
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
    }
}