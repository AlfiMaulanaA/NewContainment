using System.Text.Json.Serialization;

using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.Models
{
    public class Containment
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public ContainmentType Type { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        [StringLength(255)]
        public string Location { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        public int CreatedBy { get; set; }

        public int? UpdatedBy { get; set; }

        // Navigation properties
        public User? CreatedByUser { get; set; }
        public User? UpdatedByUser { get; set; }
        [JsonIgnore]
        public ICollection<Rack> Racks { get; set; } = new List<Rack>();
    }
}