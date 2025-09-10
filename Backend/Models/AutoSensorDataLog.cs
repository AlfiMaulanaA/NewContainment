using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Model to track automatically saved sensor data when thresholds are exceeded
    /// </summary>
    public class AutoSensorDataLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DeviceId { get; set; }

        [ForeignKey(nameof(DeviceId))]
        public virtual Device Device { get; set; } = null!;

        [Required]
        public int SensorDataId { get; set; }

        [ForeignKey(nameof(SensorDataId))]
        public virtual DeviceSensorData SensorData { get; set; } = null!;

        [Required]
        public int ConfigurationId { get; set; }

        [ForeignKey(nameof(ConfigurationId))]
        public virtual SensorDataConfiguration Configuration { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string TriggerReason { get; set; } = string.Empty; // "UpperThreshold", "LowerThreshold", "Interval"

        [Column(TypeName = "decimal(8,3)")]
        public decimal? TemperatureValue { get; set; }

        [Column(TypeName = "decimal(8,3)")]
        public decimal? ThresholdValue { get; set; }

        [Required]
        [StringLength(20)]
        public string ViolationType { get; set; } = string.Empty; // "Upper", "Lower", "Interval"

        [Required]
        [StringLength(20)]
        public string TemperatureStatus { get; set; } = string.Empty; // "Cold", "Normal", "Warm", "Hot", "Critical"

        [StringLength(20)]
        public string? TemperatureColor { get; set; }

        [Required]
        public DateTime TriggerTime { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(1000)]
        public string? AdditionalData { get; set; }

        [Required]
        public bool NotificationSent { get; set; } = false;

        public DateTime? NotificationSentAt { get; set; }

        [StringLength(500)]
        public string? NotificationStatus { get; set; }

        // Helper method to format trigger information
        public string GetTriggerSummary()
        {
            switch (TriggerReason.ToLower())
            {
                case "upperthreshold":
                    return $"Temperature {TemperatureValue:F1}°C exceeded upper threshold {ThresholdValue:F1}°C";
                case "lowerthreshold":
                    return $"Temperature {TemperatureValue:F1}°C fell below lower threshold {ThresholdValue:F1}°C";
                case "interval":
                    return $"Scheduled interval save - Temperature: {TemperatureValue:F1}°C";
                default:
                    return $"Auto-save triggered: {TriggerReason}";
            }
        }

        // Helper method to determine severity level
        public string GetSeverityLevel()
        {
            return TriggerReason.ToLower() switch
            {
                "upperthreshold" when TemperatureStatus == "Critical" => "Critical",
                "upperthreshold" when TemperatureStatus == "Hot" => "High",
                "lowerthreshold" => "Medium",
                "upperthreshold" => "Medium",
                "interval" => "Info",
                _ => "Info"
            };
        }

        // Helper method to check if notification should be sent
        public bool ShouldSendNotification()
        {
            return !NotificationSent &&
                   (TriggerReason.Equals("UpperThreshold", StringComparison.OrdinalIgnoreCase) ||
                    TriggerReason.Equals("LowerThreshold", StringComparison.OrdinalIgnoreCase));
        }
    }
}