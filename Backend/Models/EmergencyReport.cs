using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class EmergencyReport
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string EmergencyType { get; set; } = string.Empty; // "Smoke", "FSS", "EmergencyButton", "EmergencyTemp"
        
        [Required]
        public bool Status { get; set; } // true = emergency active, false = emergency cleared
        
        public DateTime StartTime { get; set; }
        
        public DateTime? EndTime { get; set; }
        
        public TimeSpan? Duration { get; set; }
        
        public bool IsActive { get; set; } = true; // false when emergency is cleared
        
        [StringLength(1000)]
        public string? Notes { get; set; }
        
        [StringLength(2000)]
        public string? RawMqttPayload { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    public enum EmergencyType
    {
        SmokeDetector,
        FSS,
        EmergencyButton,
        EmergencyTemp
    }
    
    public class EmergencyReportSummary
    {
        public string EmergencyType { get; set; } = string.Empty;
        public int TotalEvents { get; set; }
        public TimeSpan TotalDuration { get; set; }
        public DateTime? LastEmergencyTime { get; set; }
        public bool CurrentlyActive { get; set; }
        public TimeSpan? CurrentActiveDuration { get; set; }
    }
    
    public class EmergencyReportFilter
    {
        public string? EmergencyType { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool? IsActive { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}