using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class DeviceSensorData
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeviceId { get; set; }

        [ForeignKey(nameof(DeviceId))]
        public virtual Device Device { get; set; } = null!;

        [Required]
        public int RackId { get; set; }

        [ForeignKey(nameof(RackId))]
        public virtual Rack Rack { get; set; } = null!;

        [Required]
        public int ContainmentId { get; set; }

        [ForeignKey(nameof(ContainmentId))]
        public virtual Containment Containment { get; set; } = null!;

        [Required]
        [StringLength(200)]
        public string Topic { get; set; } = string.Empty;

        [Column(TypeName = "decimal(5,2)")]
        public decimal? Temperature { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? Humidity { get; set; }

        [Required]
        public DateTime Timestamp { get; set; }

        [Required]
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        [StringLength(1000)]
        public string? RawPayload { get; set; }
    }
}