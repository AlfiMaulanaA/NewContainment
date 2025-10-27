using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Simplified sensor data interval configuration - only for save intervals
    /// </summary>
    public class SensorDataIntervalConfig
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        // Core Interval Settings (Only)
        [Required]
        public int SaveIntervalMinutes { get; set; } = 15; // Default: 15 minutes

        [Required]
        public bool IsEnabled { get; set; } = true;

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

        // Helper method to get interval in seconds
        public int GetIntervalInSeconds()
        {
            return SaveIntervalMinutes * 60;
        }

        // Helper method to format interval display
        public string GetIntervalDisplay()
        {
            return SaveIntervalMinutes switch
            {
                1 => "1 minute",
                15 => "15 minutes",
                30 => "30 minutes", 
                60 => "1 hour",
                360 => "6 hours",
                720 => "12 hours",
                1440 => "24 hours",
                _ => $"{SaveIntervalMinutes} minutes"
            };
        }

        // Static method to get available intervals with mode support
        public static List<(int Value, string Label, string Mode)> GetAvailableIntervals()
        {
            return new List<(int, string, string)>
            {
                (1, "1 minute", "Debug/Development"),
                (60, "1 hour", "Production"),
                (15, "15 minutes", "Custom"),
                (30, "30 minutes", "Custom"),
                (360, "6 hours", "Custom"),
                (720, "12 hours", "Custom"),
                (1440, "24 hours", "Custom")
            };
        }

        // Get interval mode
        public string GetIntervalMode()
        {
            return SaveIntervalMinutes switch
            {
                1 => "Debug/Development",
                60 => "Production",
                _ => "Custom"
            };
        }

        // Get environment-based default interval
        public static int GetDefaultIntervalForEnvironment()
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
            return environment.Equals("Development", StringComparison.OrdinalIgnoreCase) ? 1 : 60;
        }

        // Check if interval is production mode
        public bool IsProductionMode()
        {
            return SaveIntervalMinutes == 60;
        }

        // Check if interval is development mode
        public bool IsDevelopmentMode()
        {
            return SaveIntervalMinutes == 1;
        }

        // Validation method for allowed intervals
        public bool IsValidInterval()
        {
            var validIntervals = new[] { 1, 15, 30, 60, 360, 720, 1440 };
            return validIntervals.Contains(SaveIntervalMinutes);
        }
    }
}