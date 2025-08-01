using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ContainmentStatus
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int ContainmentId { get; set; }
        
        [ForeignKey("ContainmentId")]
        public Containment? Containment { get; set; }
        
        // Status fields from MQTT payload
        public bool LightingStatus { get; set; } = false;
        public bool EmergencyStatus { get; set; } = false;
        public bool SmokeDetectorStatus { get; set; } = false;
        public bool FssStatus { get; set; } = false;
        public bool EmergencyButtonState { get; set; } = false;
        public bool SelenoidStatus { get; set; } = false;
        public bool LimitSwitchFrontDoorStatus { get; set; } = false;
        public bool LimitSwitchBackDoorStatus { get; set; } = false;
        public bool OpenFrontDoorStatus { get; set; } = false;
        public bool OpenBackDoorStatus { get; set; } = false;
        public bool EmergencyTemp { get; set; } = false;
        
        // MQTT timestamp - last received message time
        public DateTime MqttTimestamp { get; set; } = DateTime.UtcNow;
        
        // System timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Raw JSON payload for debugging (last message only)
        [Column(TypeName = "TEXT")]
        public string? RawPayload { get; set; }
    }
}