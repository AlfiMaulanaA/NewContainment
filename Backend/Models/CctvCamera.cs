using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class CctvCamera
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [StringLength(500)]
        public string StreamUrl { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? SnapshotUrl { get; set; }
        
        [Required]
        public CctvStreamType StreamType { get; set; }
        
        [Required]
        public CctvStreamProtocol Protocol { get; set; }
        
        [StringLength(100)]
        public string? Username { get; set; }
        
        [StringLength(255)]
        public string? Password { get; set; }
        
        public int? Port { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;
        
        public int? ContainmentId { get; set; }
        
        public int? RackId { get; set; }
        
        public CctvResolution Resolution { get; set; } = CctvResolution.HD720p;
        
        public int FrameRate { get; set; } = 30;
        
        public bool IsActive { get; set; } = true;
        
        public bool IsOnline { get; set; } = false;
        
        public bool ShowDashboard { get; set; } = false;
        
        public DateTime? LastOnlineAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public int CreatedBy { get; set; }
        
        public int? UpdatedBy { get; set; }
        
        // Navigation properties
        public virtual User? CreatedByUser { get; set; }
        public virtual User? UpdatedByUser { get; set; }
        public virtual Containment? Containment { get; set; }
        public virtual Rack? Rack { get; set; }
    }
}