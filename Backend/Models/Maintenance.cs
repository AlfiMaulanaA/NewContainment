using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class Maintenance
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }

        [Required]
        public DateTime StartTask { get; set; }

        [Required]
        public DateTime EndTask { get; set; }

        [Required]
        public int AssignTo { get; set; }

        [Required]
        public MaintenanceTarget TargetType { get; set; }

        [Required]
        public int TargetId { get; set; }

        [StringLength(50)]
        public string Status { get; set; } = "Scheduled";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        public int? CreatedBy { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        public User? AssignedToUser { get; set; }
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }

        // Polymorphic navigation properties
        public Device? TargetDevice { get; set; }
        public Rack? TargetRack { get; set; }
        public Containment? TargetContainment { get; set; }
    }
}