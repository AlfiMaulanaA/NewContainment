using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Configuration model for sensor data logging intervals and temperature thresholds
    /// </summary>
    public class SensorDataConfiguration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        // Save Interval Configuration (Task 7)
        [Required]
        public int SaveIntervalSeconds { get; set; } = 300; // Default: 5 minutes

        [Required]
        public bool IsIntervalEnabled { get; set; } = true;

        // Temperature Threshold Configuration (Task 8)
        [Required]
        public bool IsTemperatureThresholdEnabled { get; set; } = false;

        [Column(TypeName = "decimal(5,2)")]
        public decimal? TemperatureUpperThreshold { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? TemperatureLowerThreshold { get; set; }

        // Temperature Color Range Configuration (Task 8)
        [StringLength(20)]
        public string? TemperatureColdColor { get; set; } = "#3B82F6"; // Blue

        [StringLength(20)]
        public string? TemperatureNormalColor { get; set; } = "#10B981"; // Green

        [StringLength(20)]
        public string? TemperatureWarmColor { get; set; } = "#F59E0B"; // Yellow

        [StringLength(20)]
        public string? TemperatureHotColor { get; set; } = "#EF4444"; // Red

        [StringLength(20)]
        public string? TemperatureCriticalColor { get; set; } = "#7C2D12"; // Dark Red

        // Temperature Range Thresholds for Colors
        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureColdMax { get; set; } = 15.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureNormalMin { get; set; } = 15.1m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureNormalMax { get; set; } = 25.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureWarmMin { get; set; } = 25.1m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureWarmMax { get; set; } = 30.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureHotMin { get; set; } = 30.1m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureHotMax { get; set; } = 35.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal TemperatureCriticalMin { get; set; } = 35.1m;

        // Auto-save when threshold exceeded (Task 9)
        [Required]
        public bool AutoSaveOnThresholdExceed { get; set; } = false;

        [Required]
        public bool AutoSaveOnUpperThreshold { get; set; } = true;

        [Required]
        public bool AutoSaveOnLowerThreshold { get; set; } = false;

        // Notification settings
        [Required]
        public bool EnableNotifications { get; set; } = false;

        [StringLength(500)]
        public string? NotificationRecipients { get; set; }

        // Device/Containment Association
        public int? DeviceId { get; set; }
        [ForeignKey(nameof(DeviceId))]
        public virtual Device? Device { get; set; }

        public int? ContainmentId { get; set; }
        [ForeignKey(nameof(ContainmentId))]
        public virtual Containment? Containment { get; set; }

        // Global configuration (if DeviceId and ContainmentId are null)
        [Required]
        public bool IsGlobalConfiguration { get; set; } = false;

        // Audit fields
        [Required]
        public int CreatedBy { get; set; }

        [ForeignKey(nameof(CreatedBy))]
        public virtual User CreatedByUser { get; set; } = null!;

        public int? UpdatedBy { get; set; }

        [ForeignKey(nameof(UpdatedBy))]
        public virtual User? UpdatedByUser { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public bool IsActive { get; set; } = true;

        // Helper method to get temperature color based on value
        public string GetTemperatureColor(decimal temperature)
        {
            if (temperature <= TemperatureColdMax)
                return TemperatureColdColor ?? "#3B82F6";
            else if (temperature >= TemperatureNormalMin && temperature <= TemperatureNormalMax)
                return TemperatureNormalColor ?? "#10B981";
            else if (temperature >= TemperatureWarmMin && temperature <= TemperatureWarmMax)
                return TemperatureWarmColor ?? "#F59E0B";
            else if (temperature >= TemperatureHotMin && temperature <= TemperatureHotMax)
                return TemperatureHotColor ?? "#EF4444";
            else if (temperature >= TemperatureCriticalMin)
                return TemperatureCriticalColor ?? "#7C2D12";
            else
                return TemperatureNormalColor ?? "#10B981";
        }

        // Helper method to get temperature status
        public string GetTemperatureStatus(decimal temperature)
        {
            if (temperature <= TemperatureColdMax)
                return "Cold";
            else if (temperature >= TemperatureNormalMin && temperature <= TemperatureNormalMax)
                return "Normal";
            else if (temperature >= TemperatureWarmMin && temperature <= TemperatureWarmMax)
                return "Warm";
            else if (temperature >= TemperatureHotMin && temperature <= TemperatureHotMax)
                return "Hot";
            else if (temperature >= TemperatureCriticalMin)
                return "Critical";
            else
                return "Normal";
        }

        // Helper method to check if temperature exceeds thresholds
        public bool IsThresholdExceeded(decimal temperature)
        {
            if (!IsTemperatureThresholdEnabled)
                return false;

            bool upperExceeded = TemperatureUpperThreshold.HasValue && temperature > TemperatureUpperThreshold.Value;
            bool lowerExceeded = TemperatureLowerThreshold.HasValue && temperature < TemperatureLowerThreshold.Value;

            return (AutoSaveOnUpperThreshold && upperExceeded) || (AutoSaveOnLowerThreshold && lowerExceeded);
        }

        // Helper method to get threshold violation type
        public string? GetThresholdViolationType(decimal temperature)
        {
            if (!IsTemperatureThresholdEnabled)
                return null;

            if (TemperatureUpperThreshold.HasValue && temperature > TemperatureUpperThreshold.Value)
                return "Upper";

            if (TemperatureLowerThreshold.HasValue && temperature < TemperatureLowerThreshold.Value)
                return "Lower";

            return null;
        }
    }
}